from django.shortcuts import get_object_or_404
from django.db.models import F
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from players.models import Player, Country
from players.serializers import PlayerSerializer

from stats.models import (
    OdiBatting, OdiBowling,
    TestBatting, TestBowling,
    T20Batting, T20Bowling,
    OdiAllRound, TestAllRound, T20AllRound,
)
from stats.serializers import (
    OdiBattingSerializer, OdiBowlingSerializer,
    TestBattingSerializer, TestBowlingSerializer,
    T20BattingSerializer, T20BowlingSerializer,
    OdiAllRoundSerializer, TestAllRoundSerializer, T20AllRoundSerializer,
)


# ─────────────────────────────────────────────────────────────
#  Helper: attach player_name to a list of serialized dicts
# ─────────────────────────────────────────────────────────────
def _attach_names(rows):
    """
    Given a list of serialized dicts that each have a 'player_id' key,
    look up names in one query and attach preferred display name to every row.
    Returns the mutated list.
    """
    ids = [r['player_id'] for r in rows if r.get('player_id') is not None]
    name_map = {
        p.id: {
            'display': (p.full_name or p.name),
            'short': p.name,
        }
        for p in Player.objects.filter(id__in=ids).only('id', 'name', 'full_name')
    }
    for row in rows:
        names = name_map.get(row.get('player_id')) or {}
        row['player_name'] = names.get('display')
        row['player_short_name'] = names.get('short')
    return rows


def _dedupe_by_player_name(rows, limit=10):
    """
    Keep only the first row per player_name (rows should already be sorted by rank metric).
    Rows with no player_name are skipped.
    """
    seen = set()
    unique_rows = []
    for row in rows:
        name = row.get('player_name')
        if not name:
            continue
        key = name.strip().lower()
        if not key or key in seen:
            continue
        seen.add(key)
        unique_rows.append(row)
        if len(unique_rows) >= limit:
            break
    return unique_rows


VALID_TEAM_FORMATS = {'odi', 'test', 't20'}

# Keywords that identify a wicket-keeper in the playing_role field
_KEEPER_KEYWORDS = ('keeper', 'wicket')

# Keywords that identify pace bowlers and spinners in playing_role / bowling_style
_PACE_KEYWORDS  = ('fast', 'medium', 'pace', 'seam')
_SPIN_KEYWORDS  = ('spin', 'break', 'orthodox', 'wrist', 'chinaman', 'googly', 'legbreak', 'offbreak')


def _is_keeper(player) -> bool:
    """Return True if the player is a wicket-keeper based on playing_role."""
    role = (getattr(player, 'playing_role', '') or '').lower()
    return any(kw in role for kw in _KEEPER_KEYWORDS)


def _is_pace(player) -> bool:
    style = (getattr(player, 'bowling_style', '') or '').lower()
    return any(kw in style for kw in _PACE_KEYWORDS)


def _is_spinner(player) -> bool:
    style = (getattr(player, 'bowling_style', '') or '').lower()
    return any(kw in style for kw in _SPIN_KEYWORDS)


def _is_pace_from_style(style: str) -> bool:
    """Return True if the bowling style string indicates pace bowling."""
    return any(kw in (style or '').lower() for kw in _PACE_KEYWORDS)


def _score_batting_stats(stats, match_format: str) -> int:
    """
    Score a player's batting on a 0–100 scale.

    Weights are deliberately format-specific:
      Test  : average 45% | runs 35% | strike-rate 20%
              (average dominates — survival and consistency define Test batting)
      ODI   : average 35% | runs 30% | strike-rate 35%
              (balanced — need both accumulation and intent)
      T20   : strike-rate 55% | average 25% | runs 20%
              (strike-rate is king in T20; average still rewards consistency)
    """
    if not stats:
        return 0

    avg         = float(getattr(stats, 'average',      0) or 0)
    strike_rate = float(getattr(stats, 'strike_rate',  0) or 0)
    runs        = int(  getattr(stats, 'runs',         0) or 0)

    if match_format == 'test':
        score = min(100,
            (avg / 60)                       * 45   # 50 avg → 37.5pts
            + (min(runs, 8000) / 8000)       * 35   # 8000 runs → 35pts
            + (min(strike_rate / 80, 1)      * 20 if strike_rate > 0 else 0),
        )
    elif match_format == 'odi':
        score = min(100,
            (avg / 55)                       * 35
            + (min(runs, 8000) / 8000)       * 30
            + (min(strike_rate, 130) / 130)  * 35,
        )
    else:  # t20
        # FIX: raised average weight from 20% → 25%, runs from 25% → 20%
        # to better reward consistent T20 batters (avg/40 still references 40 as elite)
        score = min(100,
            (avg / 40)                       * 25
            + (min(runs, 3000) / 3000)       * 20
            + (min(strike_rate, 160) / 160)  * 55,
        )

    return round(max(0, score))


def _get_bowling_fields(stats):
    """
    Safely extract bowling fields that may use different names across models.
    Returns (average, economy, wickets, bowling_strike_rate).

    ODI model  : bowling_avg  / economy      / strike_rate
    Test model : average      / economy_rate / bowling_strike_rate  (or strike_rate)
    T20  model : average      / economy_rate / bowling_strike_rate  (or strike_rate)
    """
    # Average — try most-specific names first, then fall back
    average = float(
        getattr(stats, 'bowling_avg',
            getattr(stats, 'average', 0)
        ) or 0
    )

    # Economy — try both common field names
    economy = float(
        getattr(stats, 'economy_rate',
            getattr(stats, 'economy', 0)
        ) or 0
    )

    wickets = int(getattr(stats, 'wickets', 0) or 0)

    # Bowling strike rate
    bsr = float(
        getattr(stats, 'bowling_strike_rate',
            getattr(stats, 'strike_rate', 0)
        ) or 0
    )

    return average, economy, wickets, bsr


def _score_bowling_stats(stats, match_format: str) -> int:
    """
    Score a player's bowling on a 0–100 scale.

    Weights are format-specific:
      Test  : average 50% | wickets 30% | economy 20%
      ODI   : average 35% | economy 35% | wickets 30%
      T20   : economy 55% | wickets 30% | average 15%
    """
    if not stats:
        return 0

    average, economy, wickets, bsr = _get_bowling_fields(stats)

    # Full-data path — both average and economy are present
    if average > 0 and economy > 0:
        # average:  20 = perfect (1.0), 50 = poor (0.0)
        avg_score  = max(0.0, 1.0 - (average - 20) / 30)
        # economy:  3.5 = perfect baseline, 7.5 = poor
        econ_score = max(0.0, 1.0 - (economy - 3.5) / 4.0)
        # wickets:  200 is a long elite career (100%)
        wkt_score  = min(wickets, 200) / 200

        if match_format == 'test':
            score = avg_score * 50 + wkt_score * 30 + econ_score * 20
        elif match_format == 'odi':
            score = avg_score * 35 + econ_score * 35 + wkt_score * 30
        else:  # t20
            score = econ_score * 55 + wkt_score * 30 + avg_score * 15

        return round(min(100, max(0, score)))

    # Partial data path — at least one of wickets / bowling_strike_rate
    if wickets > 0 or bsr > 0:
        wkt_score    = min(wickets, 200) / 200
        # bowling SR: 15 = excellent, 55 = poor
        strike_score = max(0.0, 1.0 - (bsr - 15) / 40) if bsr > 0 else 0.0
        score = wkt_score * 75 + strike_score * 25
        return round(min(100, max(0, score)))

    return 0


def _classify_player(player, bat_score: int, bowl_score: int) -> str:
    """
    Return a simple label for a player based on role + stats.
    Used for internal analysis (e.g. batter/bowler/allrounder/keeper counts).
    """
    role = (getattr(player, 'playing_role', '') or '').lower()

    if _is_keeper(player):
        return 'keeper'

    # Explicit role string takes precedence
    if 'all' in role and 'round' in role:
        return 'allrounder'

    # Stats-based fallback
    if bat_score >= 40 and bowl_score >= 30:
        return 'allrounder'

    if bowl_score > bat_score and bowl_score >= 15:
        return 'bowler'

    return 'batter'


def _extract_experience(bat_stats, bowl_stats) -> dict:
    """
    Return { matches: int, span_years: int } for a player.
    Uses the larger of batting/bowling match counts.
    Span is parsed from e.g. '2016-2023' → 7 years.
    """
    bat_matches  = int(getattr(bat_stats,  'matches', 0) or 0) if bat_stats  else 0
    bowl_matches = int(getattr(bowl_stats, 'matches', 0) or 0) if bowl_stats else 0
    matches = max(bat_matches, bowl_matches)

    span_years = 0
    for stats in (bat_stats, bowl_stats):
        if not stats:
            continue
        span = getattr(stats, 'span', '') or ''
        parts = span.strip().split('-')
        if len(parts) == 2:
            try:
                y1, y2 = int(parts[0].strip()), int(parts[1].strip())
                span_years = max(span_years, max(0, y2 - y1))
            except ValueError:
                pass

    return {'matches': matches, 'span_years': span_years}


def _score_top_order(scored_sorted_by_bat, batting_map):
    top4 = scored_sorted_by_bat[:4]
    if not top4:
        return 0

    total = 0
    for p in top4:
        bat_score = p['scores']['batting']
        bat_stats = batting_map.get(p['id'])
        hundreds = int(getattr(bat_stats, 'hundreds', 0) or 0) if bat_stats else 0

        bonus = min(hundreds, 10) * 2
        total += min(100, bat_score + bonus)

    return round(total / len(top4))


def _score_death_bowling(scored, bowling_map, match_format):
    # Death bowling is not a Test concept — return neutral score
    if match_format == 'test':
        return 50

    scores = []
    for p in scored:
        bs = bowling_map.get(p['id'])
        if not bs:
            continue

        # FIX: use the same safe field extractor used in _score_bowling_stats
        _, economy, wickets, bsr = _get_bowling_fields(bs)

        if economy <= 0 and bsr <= 0:
            continue

        econ_score = max(0.0, 1.0 - (economy - 7) / 5)
        bsr_score  = max(0.0, 1.0 - (bsr - 12) / 18) if bsr > 0 else 0.0
        wkt_score  = min(wickets, 100) / 100

        raw = econ_score * 0.45 + bsr_score * 0.35 + wkt_score * 0.20

        # FIX: safely retrieve bowling_style from scored dict (may be None)
        bowling_style = p.get('bowling_style') or ''
        if _is_pace_from_style(bowling_style):
            raw *= 1.15

        scores.append(min(100.0, raw * 100))

    if not scores:
        return 0

    scores.sort(reverse=True)
    top3 = scores[:3]
    return round(sum(top3) / len(top3))


def _score_batting_depth(scored_sorted_by_bat):
    if len(scored_sorted_by_bat) < 6:
        return 0

    tail = scored_sorted_by_bat[5:]  # positions 6–11
    avg_tail = sum(p['scores']['batting'] for p in tail) / len(tail)

    return round(min(100, (avg_tail / 40) * 100))


def _score_bowling_depth(scored: list) -> int:
    """
    Bowling depth: does the team have 5 genuine bowling options?

    Thresholds:
      bowl_score ≥ 25  → genuine wicket-taking option
      bowl_score ≥ 10  → can bowl without being hit
      bowl_score < 10  → net liability with ball
    """
    genuine_bowlers   = sum(1 for p in scored if p['scores']['bowling'] >= 25)
    support_bowlers   = sum(1 for p in scored if 10 <= p['scores']['bowling'] < 25)
    effective_options = genuine_bowlers + support_bowlers * 0.5

    # 5+ genuine bowling options = 100% depth
    depth_score = min(100, (effective_options / 5) * 100)
    return round(depth_score)


def _score_experience(scored, batting_map, bowling_map):
    """
    FIX: span_years cap raised from 7 → 15 to correctly reward long careers.
    A 15-year career is genuinely elite; 7 years was penalising experienced players.
    """
    scores = []

    for p in scored:
        exp = _extract_experience(
            batting_map.get(p['id']),
            bowling_map.get(p['id'])
        )

        match_score = min(exp['matches'], 150) / 150
        span_score  = min(exp['span_years'], 15) / 15  # FIX: was 7, now 15

        scores.append((0.6 * match_score + 0.4 * span_score) * 100)

    return round(sum(scores) / len(scores)) if scores else 0


def _score_pace_spin_balance(pace_count: int, spinner_count: int,
                              match_format: str, n_bowlers: int) -> int:
    """
    Pace / Spin balance score based on format-specific ideal ratios.

    n_bowlers is used to apply a coverage penalty when too few bowlers
    have a typed style (pace or spin), regardless of team size.

    Ideal bowling attack compositions:
      ODI  : 3 pace + 2 spin  → 60% pace
      Test : 3 pace + 2 spin  → 55% pace (slightly more spin-friendly)
      T20  : 3 pace + 2 spin  → 60% pace
    """
    total_typed = pace_count + spinner_count
    if total_typed == 0:
        return 0

    # Ideal pace fraction by format
    ideal_pace_frac = 0.60
    if match_format == 'test':
        ideal_pace_frac = 0.55

    actual_pace_frac = pace_count / total_typed

    # How close are we to ideal?
    pace_deviation = abs(actual_pace_frac - ideal_pace_frac)
    balance_score  = max(0.0, 1.0 - pace_deviation * 2.5) * 100

    # FIX: use n_bowlers (previously computed but ignored) to penalise
    # squads where too few bowlers have an identifiable style
    if total_typed < 4:
        coverage_penalty = (1 - total_typed / 4) * 30
        balance_score = max(0.0, balance_score - coverage_penalty)

    # Additional penalty if n_bowlers (genuine bowling candidates) is very low
    if n_bowlers > 0 and total_typed < n_bowlers:
        untyped_ratio = (n_bowlers - total_typed) / n_bowlers
        balance_score = max(0.0, balance_score - untyped_ratio * 15)

    return round(balance_score)


def _score_allrounder_quality(scored: list) -> int:
    """
    All-rounder quality: not just whether you HAVE all-rounders, but
    how genuinely two-dimensional they are.

    A true all-rounder scores ≥40 batting AND ≥30 bowling.
    A partial all-rounder scores 25–39 batting OR 20–29 bowling.
    """
    allrounders = [p for p in scored if p['player_type'] == 'allrounder']

    if not allrounders:
        return 0

    quality_scores = []
    for p in allrounders:
        bat  = p['scores']['batting']
        bowl = p['scores']['bowling']

        combined = (bat + bowl) / 2

        # Bonus for genuine two-dimensionality
        balance_factor = 1.0
        if bat >= 45 and bowl >= 35:
            balance_factor = 1.30   # elite genuine all-rounder
        elif bat >= 35 and bowl >= 25:
            balance_factor = 1.15   # solid all-rounder
        elif bat >= 25 and bowl >= 20:
            balance_factor = 1.0    # useful contributor

        quality_scores.append(min(100.0, combined * balance_factor))

    base        = sum(quality_scores) / len(quality_scores)
    depth_bonus = min(10, (len(allrounders) - 1) * 5)  # +5 per extra all-rounder, max +10
    return round(min(100, base + depth_bonus))


def _score_format_conditions(scored: list, batting_map: dict, bowling_map: dict,
                               match_format: str) -> int:
    """
    Format-Specific Conditions score: how well-tuned is this squad
    to excel in the specific format?

      ODI  : avg batting average of top 6 above 35 + bowlers economy below 5.5
      Test : squad batting average above 35 + five-wicket hauls proxy
      T20  : avg strike rate above 130 + tight economy rates
    """
    if not scored:
        return 0

    if match_format == 'odi':
        top6 = sorted(scored, key=lambda p: p['scores']['batting'], reverse=True)[:6]
        avg_batting_avgs = []
        for p in top6:
            bs = batting_map.get(p['id'])
            if bs:
                avg_batting_avgs.append(float(getattr(bs, 'average', 0) or 0))

        avg_bowl_econs = []
        for p in scored:
            bs = bowling_map.get(p['id'])
            if bs:
                _, econ, _, _ = _get_bowling_fields(bs)
                if econ > 0:
                    avg_bowl_econs.append(econ)

        bat_cond  = min(100, (sum(avg_batting_avgs) / max(len(avg_batting_avgs), 1)) / 45 * 100) if avg_batting_avgs else 50
        bowl_cond = max(0, min(100, (1 - (sum(avg_bowl_econs) / max(len(avg_bowl_econs), 1) - 4.0) / 3.0) * 100)) if avg_bowl_econs else 50
        return round(bat_cond * 0.50 + bowl_cond * 0.50)

    elif match_format == 'test':
        batting_avgs = []
        for p in scored:
            bs = batting_map.get(p['id'])
            if bs:
                batting_avgs.append(float(getattr(bs, 'average', 0) or 0))

        total_5wi = 0
        for p in scored:
            bs = bowling_map.get(p['id'])
            if bs:
                total_5wi += int(getattr(bs, 'five_wicket_hauls', 0) or 0)

        bat_cond  = min(100, (sum(batting_avgs) / max(len(batting_avgs), 1)) / 40 * 100) if batting_avgs else 50
        bowl_cond = min(100, (total_5wi / 10) * 100)
        return round(bat_cond * 0.55 + bowl_cond * 0.45)

    else:  # t20
        strike_rates = []
        for p in scored:
            bs = batting_map.get(p['id'])
            if bs:
                sr = float(getattr(bs, 'strike_rate', 0) or 0)
                if sr > 0:
                    strike_rates.append(sr)

        bowl_econs = []
        for p in scored:
            bs = bowling_map.get(p['id'])
            if bs:
                _, econ, _, _ = _get_bowling_fields(bs)
                if econ > 0:
                    bowl_econs.append(econ)

        bat_cond  = min(100, (sum(strike_rates) / max(len(strike_rates), 1)) / 145 * 100) if strike_rates else 50
        bowl_cond = max(0, min(100, (1 - (sum(bowl_econs) / max(len(bowl_econs), 1) - 6.0) / 4.0) * 100)) if bowl_econs else 50
        return round(bat_cond * 0.50 + bowl_cond * 0.50)


def _build_team_analysis(players, match_format: str) -> dict | None:
    """
    Full team-strength analysis returning 8 specialised metrics
    plus an overall score, weaknesses, and composition breakdown.

    Metrics returned:
      1. top_order_strength     – quality of batting positions 1–4
      2. death_bowling_strength – ability to take wickets/control runs in death overs
      3. batting_depth          – strength of lower-order batting (positions 6–11)
      4. bowling_depth          – number of genuine bowling options
      5. team_experience        – international matches + career longevity
      6. pace_spin_balance      – how close to format-ideal pace/spin ratio
      7. allrounder_quality     – calibre of two-dimensional players
      8. format_conditions      – how well the squad suits the specific format
    """
    if not players:
        return None

    player_ids = [p.id for p in players]

    # ── Fetch stats — 2 DB queries per format ─────────────────
    if match_format == 'odi':
        batting_map = {r.player_id: r for r in OdiBatting.objects.filter(player_id__in=player_ids)}
        bowling_map = {r.player_id: r for r in OdiBowling.objects.filter(player_id__in=player_ids)}
    elif match_format == 'test':
        batting_map = {r.player_id: r for r in TestBatting.objects.filter(player_id__in=player_ids)}
        bowling_map = {r.player_id: r for r in TestBowling.objects.filter(player_id__in=player_ids)}
    else:  # t20
        batting_map = {r.player_id: r for r in T20Batting.objects.filter(player_id__in=player_ids)}
        bowling_map = {r.player_id: r for r in T20Bowling.objects.filter(player_id__in=player_ids)}

    # ── Score every player ────────────────────────────────────
    scored = []
    for player in players:
        bat_score   = _score_batting_stats(batting_map.get(player.id), match_format)
        bowl_score  = _score_bowling_stats(bowling_map.get(player.id), match_format)
        player_type = _classify_player(player, bat_score, bowl_score)

        scored.append({
            'id':           player.id,
            'name':         player.name,
            'full_name':    player.full_name,
            'playing_role': player.playing_role,
            'bowling_style': getattr(player, 'bowling_style', None),
            'image_url':    getattr(player, 'image_url', None),
            'is_keeper':    _is_keeper(player),
            'player_type':  player_type,
            'scores': {
                'batting':  bat_score,
                'bowling':  bowl_score,
            },
        })

    n = len(scored)
    scored_by_bat  = sorted(scored, key=lambda p: p['scores']['batting'],  reverse=True)
    scored_by_bowl = sorted(scored, key=lambda p: p['scores']['bowling'],  reverse=True)

    # ── Core aggregates ───────────────────────────────────────
    avg_bat  = round(sum(p['scores']['batting']  for p in scored) / n)
    avg_bowl = round(sum(p['scores']['bowling']  for p in scored) / n)
    top_batter = scored_by_bat[0]
    top_bowler = scored_by_bowl[0]

    # Batting unit: average of top 7 batters by score
    batting_unit = round(
        sum(p['scores']['batting'] for p in scored_by_bat[:7]) / max(len(scored_by_bat[:7]), 1)
    )

    # FIX: bowling unit must only include players with a non-zero bowl_score.
    # If fewer than 5 players have a non-zero score, use whoever is available —
    # do NOT pad with zero-score players as that silently deflates bowling_unit.
    bowling_candidates = [p for p in scored_by_bowl if p['scores']['bowling'] > 0]
    bowling_unit_sample = bowling_candidates[:5] if bowling_candidates else []
    bowling_unit = (
        round(sum(p['scores']['bowling'] for p in bowling_unit_sample) / len(bowling_unit_sample))
        if bowling_unit_sample else 0
    )

    # ── Composition counts ────────────────────────────────────
    keeper_count     = sum(1 for p in scored if p['is_keeper'])
    batter_count     = sum(1 for p in scored if p['player_type'] == 'batter')
    bowler_count     = sum(1 for p in scored if p['player_type'] == 'bowler')
    allrounder_count = sum(1 for p in scored if p['player_type'] == 'allrounder')
    pace_count       = sum(1 for p in players if _is_pace(p))
    spinner_count    = sum(1 for p in players if _is_spinner(p))

    # ── 8 specialised metrics ─────────────────────────────────
    top_order_strength     = _score_top_order(scored_by_bat, batting_map)
    death_bowling_strength = _score_death_bowling(scored, bowling_map, match_format)
    batting_depth          = _score_batting_depth(scored_by_bat)
    bowling_depth          = _score_bowling_depth(scored)
    team_experience        = _score_experience(scored, batting_map, bowling_map)
    pace_spin_balance      = _score_pace_spin_balance(
        pace_count, spinner_count, match_format,
        bowler_count + allrounder_count,   # FIX: was unused; now correctly passed
    )
    allrounder_quality     = _score_allrounder_quality(scored)
    format_conditions      = _score_format_conditions(scored, batting_map, bowling_map, match_format)

    # ── Overall score ─────────────────────────────────────────
    # Core = batting/bowling unit blend (65% of overall)
    if match_format == 'test':
        core = batting_unit * 0.50 + bowling_unit * 0.50
    elif match_format == 'odi':
        core = batting_unit * 0.52 + bowling_unit * 0.48
    else:  # t20
        core = batting_unit * 0.50 + bowling_unit * 0.50

    # FIX: specialist_score weights now sum to exactly 1.0 (was 0.90)
    # Redistributed the missing 0.10 proportionally across the 8 metrics.
    specialist_score = (
        top_order_strength     * 0.17   # +0.02 (top order is critical)
        + death_bowling_strength * 0.13  # +0.01
        + batting_depth          * 0.10
        + bowling_depth          * 0.13  # +0.01
        + team_experience        * 0.09  # +0.01
        + pace_spin_balance      * 0.11  # +0.01
        + allrounder_quality     * 0.11  # +0.01
        + format_conditions      * 0.16  # +0.03 (format fit is highly impactful)
    )
    # Verify: 0.17+0.13+0.10+0.13+0.09+0.11+0.11+0.16 = 1.00 ✓

    overall = round(min(100, core * 0.65 + specialist_score * 0.35))

    # ── Weaknesses ────────────────────────────────────────────
    weaknesses = []

    # 1. Keeper — hard rule
    if keeper_count == 0:
        weaknesses.append({'type': 'keeper', 'severity': 'critical',
            'msg': 'No wicket-keeper — a keeper is mandatory in all formats.'})
    elif keeper_count > 1:
        weaknesses.append({'type': 'keeper', 'severity': 'warning',
            'msg': f'{keeper_count} keepers selected — only 1 is needed.'})

    # 2. Incomplete squad
    if n < 11:
        weaknesses.append({'type': 'team', 'severity': 'critical',
            'msg': f'Only {n}/11 players selected.'})

    # 3. Top order fragile
    if top_order_strength < 35:
        weaknesses.append({'type': 'bat', 'severity': 'critical',
            'msg': f'Top order is very weak (score {top_order_strength}/100) — '
                   f'add proven match-winners to positions 1–4.'})
    elif top_order_strength < 55:
        weaknesses.append({'type': 'bat', 'severity': 'warning',
            'msg': f'Top order is below average (score {top_order_strength}/100) — '
                   f'consider stronger openers or No.3.'})

    # 4. Batting depth
    if batting_depth < 25:
        weaknesses.append({'type': 'bat', 'severity': 'warning',
            'msg': 'Brittle lower order — team will struggle if top 5 fail.'})

    # 5. Death bowling
    if match_format in ('odi', 't20') and death_bowling_strength < 30:
        weaknesses.append({'type': 'bowl', 'severity': 'critical',
            'msg': f'Death bowling is very weak (score {death_bowling_strength}/100) — '
                   f'team will leak runs in the final overs.'})
    elif match_format in ('odi', 't20') and death_bowling_strength < 50:
        weaknesses.append({'type': 'bowl', 'severity': 'warning',
            'msg': 'Death bowling needs improvement — vulnerable in overs 16–20.'})

    # 6. Bowling depth
    if bowling_depth < 40:
        weaknesses.append({'type': 'bowl', 'severity': 'critical',
            'msg': f'Bowling attack is too thin (score {bowling_depth}/100) — '
                   f'team has fewer than 4 genuine bowling options.'})

    # 7. Experience
    if team_experience < 30:
        weaknesses.append({'type': 'experience', 'severity': 'warning',
            'msg': 'Very inexperienced squad — may struggle under pressure.'})

    # 8. Pace/spin balance
    if pace_spin_balance < 35 and n >= 8:
        pace_or_spin = 'pace' if pace_count < spinner_count else 'spin'
        weaknesses.append({'type': 'balance', 'severity': 'warning',
            'msg': f'One-dimensional bowling — too few {pace_or_spin} options for varied conditions.'})

    # 9. All-rounders
    if allrounder_count == 0:
        weaknesses.append({'type': 'balance', 'severity': 'warning',
            'msg': 'No all-rounders — team has zero flexibility in batting order or bowling rotations.'})
    elif allrounder_quality < 30 and allrounder_count > 0:
        weaknesses.append({'type': 'balance', 'severity': 'info',
            'msg': 'All-rounders are one-dimensional — look for players who genuinely contribute in both departments.'})

    # 10. Format-specific conditions
    if format_conditions < 35:
        fmt_label = {'odi': 'ODI (50-over)', 'test': 'Test match', 't20': 'T20'}[match_format]
        weaknesses.append({'type': 'format', 'severity': 'warning',
            'msg': f'Squad is poorly suited for {fmt_label} cricket — '
                   f'key format requirements ({"SR & economy" if match_format == "t20" else "average & 5-wicket hauls" if match_format == "test" else "avg & death bowling"}) are not met.'})

    # 11. No pace / no spin (if 8+ players selected)
    if n >= 8:
        if pace_count == 0:
            weaknesses.append({'type': 'bowl', 'severity': 'warning',
                'msg': 'No pace bowlers — will struggle on fast, bouncy pitches.'})
        if spinner_count == 0:
            weaknesses.append({'type': 'bowl', 'severity': 'warning',
                'msg': 'No spinners — vulnerable on turning tracks.'})

    # ── Stars (0.5-step, 0–5) ─────────────────────────────────
    stars = round((overall / 20) * 2) / 2

    return {
        # Core
        'overall':          overall,
        'avgBat':           avg_bat,
        'avgBowl':          avg_bowl,
        'battingUnit':      batting_unit,
        'bowlingUnit':      bowling_unit,
        'topBatter':        top_batter,
        'topBowler':        top_bowler,
        'stars':            stars,
        'scored':           scored,
        'weaknesses':       weaknesses,

        # Composition
        'selected_count':   n,
        'keeper_count':     keeper_count,
        'batter_count':     batter_count,
        'bowler_count':     bowler_count,
        'allrounder_count': allrounder_count,
        'pace_count':       pace_count,
        'spinner_count':    spinner_count,
        'has_keeper':       keeper_count >= 1,

        # Specialised metrics (all 0–100)
        'metrics': {
            'top_order_strength':     top_order_strength,
            'death_bowling_strength': death_bowling_strength,
            'batting_depth':          batting_depth,
            'bowling_depth':          bowling_depth,
            'team_experience':        team_experience,
            'pace_spin_balance':      pace_spin_balance,
            'allrounder_quality':     allrounder_quality,
            'format_conditions':      format_conditions,
        },
    }


# ─────────────────────────────────────────────────────────────
#  Per-player stat endpoints
# ─────────────────────────────────────────────────────────────

# GET /api/player/<id>/odi/
@api_view(['GET'])
def player_odi_stats(request, id):
    batting = OdiBatting.objects.filter(player_id=id).first()
    bowling = OdiBowling.objects.filter(player_id=id).first()
    return Response({
        'batting': OdiBattingSerializer(batting).data if batting else None,
        'bowling': OdiBowlingSerializer(bowling).data if bowling else None,
    })


# GET /api/player/<id>/test/
@api_view(['GET'])
def player_test_stats(request, id):
    batting = TestBatting.objects.filter(player_id=id).first()
    bowling = TestBowling.objects.filter(player_id=id).first()
    return Response({
        'batting': TestBattingSerializer(batting).data if batting else None,
        'bowling': TestBowlingSerializer(bowling).data if bowling else None,
    })


# GET /api/player/<id>/t20/
@api_view(['GET'])
def player_t20_stats(request, id):
    batting = T20Batting.objects.filter(player_id=id).first()
    bowling = T20Bowling.objects.filter(player_id=id).first()
    return Response({
        'batting': T20BattingSerializer(batting).data if batting else None,
        'bowling': T20BowlingSerializer(bowling).data if bowling else None,
    })


# ─────────────────────────────────────────────────────────────
#  Player profile — all formats in one call
#  GET /api/player/<id>/profile/
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
def player_profile(request, id):
    player = get_object_or_404(Player, id=id)
    country = Country.objects.filter(id=player.country_id).only('id', 'country', 'image_url').first()

    odi_bat   = OdiBatting.objects.filter(player_id=id).first()
    odi_bowl  = OdiBowling.objects.filter(player_id=id).first()
    test_bat  = TestBatting.objects.filter(player_id=id).first()
    test_bowl = TestBowling.objects.filter(player_id=id).first()
    t20_bat   = T20Batting.objects.filter(player_id=id).first()
    t20_bowl  = T20Bowling.objects.filter(player_id=id).first()
    odi_ar    = OdiAllRound.objects.filter(player_id=id).first()
    test_ar   = TestAllRound.objects.filter(player_id=id).first()
    t20_ar    = T20AllRound.objects.filter(player_id=id).first()

    return Response({
        'player': PlayerSerializer(player).data,
        'country': {
            'id': country.id,
            'name': country.country,
            'image_url': country.image_url,
        } if country else None,

        'odi': {
            'batting':   OdiBattingSerializer(odi_bat).data   if odi_bat   else None,
            'bowling':   OdiBowlingSerializer(odi_bowl).data  if odi_bowl  else None,
            'allround':  OdiAllRoundSerializer(odi_ar).data   if odi_ar    else None,
        },
        'test': {
            'batting':   TestBattingSerializer(test_bat).data   if test_bat   else None,
            'bowling':   TestBowlingSerializer(test_bowl).data  if test_bowl  else None,
            'allround':  TestAllRoundSerializer(test_ar).data   if test_ar    else None,
        },
        't20': {
            'batting':   T20BattingSerializer(t20_bat).data   if t20_bat   else None,
            'bowling':   T20BowlingSerializer(t20_bowl).data  if t20_bowl  else None,
            'allround':  T20AllRoundSerializer(t20_ar).data   if t20_ar    else None,
        },
    })


# ─────────────────────────────────────────────────────────────
#  Leaderboard endpoints — Top 10 per category
# ─────────────────────────────────────────────────────────────

# GET /api/stats/odi/batting/top/
@api_view(['GET'])
def top_odi_batsmen(request):
    rows = (
        OdiBatting.objects
        .filter(runs__isnull=False, innings__isnull=False, innings__gt=0)
        .order_by(F('runs').desc(nulls_last=True), 'player_id')[:30]
    )
    data = OdiBattingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/odi/bowling/top/
@api_view(['GET'])
def top_odi_bowlers(request):
    rows = (
        OdiBowling.objects
        .filter(wickets__isnull=False, wickets__gt=0)
        .order_by(F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = OdiBowlingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/odi/allround/top/
@api_view(['GET'])
def top_odi_allrounders(request):
    rows = (
        OdiAllRound.objects
        .filter(
            runs__isnull=False,
            wickets__isnull=False,
            wickets__gt=0,
            batting_avg__isnull=False,
            bowling_avg__isnull=False,
        )
        .order_by(F('runs').desc(nulls_last=True), F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = OdiAllRoundSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/test/batting/top/
@api_view(['GET'])
def top_test_batsmen(request):
    rows = TestBatting.objects.order_by('-runs')[:30]
    data = TestBattingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/test/bowling/top/
@api_view(['GET'])
def top_test_bowlers(request):
    rows = (
        TestBowling.objects
        .filter(wickets__isnull=False, wickets__gt=0)
        .order_by(F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = TestBowlingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/test/allround/top/
@api_view(['GET'])
def top_test_allrounders(request):
    rows = (
        TestAllRound.objects
        .filter(
            runs__isnull=False,
            wickets__isnull=False,
            wickets__gt=0,
            batting_avg__isnull=False,
            bowling_avg__isnull=False,
        )
        .order_by(F('runs').desc(nulls_last=True), F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = TestAllRoundSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/t20/batting/top/
@api_view(['GET'])
def top_t20_batsmen(request):
    rows = (
        T20Batting.objects
        .filter(
            runs__isnull=False,
            runs__gt=0,
            average__isnull=False,
            strike_rate__isnull=False,
        )
        .order_by(F('runs').desc(nulls_last=True), 'player_id')[:30]
    )
    data = T20BattingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/t20/bowling/top/
@api_view(['GET'])
def top_t20_bowlers(request):
    rows = (
        T20Bowling.objects
        .filter(wickets__isnull=False, wickets__gt=0)
        .order_by(F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = T20BowlingSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# GET /api/stats/t20/allround/top/
@api_view(['GET'])
def top_t20_allrounders(request):
    rows = (
        T20AllRound.objects
        .filter(
            runs__isnull=False,
            wickets__isnull=False,
            wickets__gt=0,
            batting_avg__isnull=False,
            bowling_avg__isnull=False,
        )
        .order_by(F('runs').desc(nulls_last=True), F('wickets').desc(nulls_last=True), 'player_id')[:30]
    )
    data = T20AllRoundSerializer(rows, many=True).data
    with_names = _attach_names(list(data))
    return Response(_dedupe_by_player_name(with_names, limit=10))


# ─────────────────────────────────────────────────────────────
#  Compare two players across all formats + batting & bowling
#  GET /api/compare/?player1=<id>&player2=<id>&format=odi|test|t20
# ─────────────────────────────────────────────────────────────
@api_view(['GET'])
def compare_players(request):
    p1_id  = request.GET.get('player1')
    p2_id  = request.GET.get('player2')
    fmt    = (request.GET.get('match_format') or 'odi').lower()

    if not p1_id or not p2_id:
        return Response(
            {'detail': 'Both player1 and player2 query params are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        p1_id_int = int(p1_id)
        p2_id_int = int(p2_id)
    except (TypeError, ValueError):
        return Response(
            {'detail': 'player1 and player2 must be valid integer IDs.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # FIX: was using string p1_id/p2_id instead of int p1_id_int/p2_id_int
    p1 = Player.objects.filter(id=p1_id_int).first()
    p2 = Player.objects.filter(id=p2_id_int).first()

    if not p1 or not p2:
        return Response(
            {'detail': 'One or both players were not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    def get_stats(player_id_int, format_key):
        """Return { batting: {...}, bowling: {...} } for a given player + format."""
        if format_key == 'odi':
            bat  = OdiBatting.objects.filter(player_id=player_id_int).first()
            bowl = OdiBowling.objects.filter(player_id=player_id_int).first()
            return {
                'batting': OdiBattingSerializer(bat).data   if bat   else None,
                'bowling': OdiBowlingSerializer(bowl).data  if bowl  else None,
            }
        elif format_key == 'test':
            bat  = TestBatting.objects.filter(player_id=player_id_int).first()
            bowl = TestBowling.objects.filter(player_id=player_id_int).first()
            return {
                'batting': TestBattingSerializer(bat).data   if bat   else None,
                'bowling': TestBowlingSerializer(bowl).data  if bowl  else None,
            }
        else:  # t20
            bat  = T20Batting.objects.filter(player_id=player_id_int).first()
            bowl = T20Bowling.objects.filter(player_id=player_id_int).first()
            return {
                'batting': T20BattingSerializer(bat).data   if bat   else None,
                'bowling': T20BowlingSerializer(bowl).data  if bowl  else None,
            }

    # FIX: pass integer IDs, not the raw string query params
    p1_stats = get_stats(p1_id_int, fmt)
    p2_stats = get_stats(p2_id_int, fmt)

    return Response({
        'format': fmt.upper(),
        'player1': {
            'id':      p1.id,
            'name':    p1.name,
            'role':    p1.playing_role,
            'batting': p1_stats['batting'],
            'bowling': p1_stats['bowling'],
        },
        'player2': {
            'id':      p2.id,
            'name':    p2.name,
            'role':    p2.playing_role,
            'batting': p2_stats['batting'],
            'bowling': p2_stats['bowling'],
        },
    })


@api_view(['POST'])
def analyze_team_builder(request):
    payload = request.data if isinstance(request.data, dict) else {}
    player_ids   = payload.get('player_ids')
    match_format = str(payload.get('match_format') or 'odi').lower().strip()

    if match_format not in VALID_TEAM_FORMATS:
        return Response(
            {'detail': 'match_format must be one of: odi, test, t20.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not isinstance(player_ids, list) or not player_ids:
        return Response(
            {'detail': 'player_ids must be a non-empty list.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        normalized_ids = [int(player_id) for player_id in player_ids]
    except (TypeError, ValueError):
        return Response(
            {'detail': 'player_ids must contain only integers.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(normalized_ids) > 11:
        return Response(
            {'detail': 'A team can contain at most 11 players.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if len(set(normalized_ids)) != len(normalized_ids):
        return Response(
            {'detail': 'Duplicate player IDs are not allowed.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    players_by_id = {
        player.id: player
        for player in Player.objects.filter(id__in=normalized_ids).only(
            'id', 'name', 'full_name', 'playing_role', 'bowling_style', 'image_url'
        )
    }
    missing_ids = [player_id for player_id in normalized_ids if player_id not in players_by_id]
    if missing_ids:
        return Response(
            {'detail': 'Some players were not found.', 'missing_ids': missing_ids},
            status=status.HTTP_404_NOT_FOUND,
        )

    ordered_players = [players_by_id[player_id] for player_id in normalized_ids]
    analysis = _build_team_analysis(ordered_players, match_format)
    return Response({
        'format': match_format,
        **analysis,
    })