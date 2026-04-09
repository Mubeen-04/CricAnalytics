import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { analyzeTeamBuilder, fetchPlayers, fetchPlayerProfile } from '../services/api';
import '../styles/TeamBuilder.css';

// ── Country map ───────────────────────────────────────────
const COUNTRIES = {
  1:{name:'England',flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿'}, 2:{name:'Australia',flag:'🇦🇺'},
  3:{name:'South Africa',flag:'🇿🇦'}, 4:{name:'West Indies',flag:'🏝️'},
  5:{name:'New Zealand',flag:'🇳🇿'}, 6:{name:'India',flag:'🇮🇳'},
  7:{name:'Pakistan',flag:'🇵🇰'}, 8:{name:'Sri Lanka',flag:'🇱🇰'},
  9:{name:'Zimbabwe',flag:'🇿🇼'}, 25:{name:'Bangladesh',flag:'🇧🇩'},
  29:{name:'Ireland',flag:'🇮🇪'}, 40:{name:'Afghanistan',flag:'🇦🇫'},
};

// ── Scoring engine ────────────────────────────────────────
// Returns { batting, bowling, overall, formatScores, weaknesses, stars }
function scorePlayer(profile, format) {
  if (!profile) return null;
  const data = profile[format]; // odi / test / t20
  if (!data) return { batting: 0, bowling: 0 };

  const bat = data.batting;
  const bowl = data.bowling;

  // Batting score 0–100
  let batScore = 0;
  if (bat) {
    const avg = parseFloat(bat.average) || 0;
    const sr  = parseFloat(bat.strike_rate) || 0;
    const runs = parseInt(bat.runs) || 0;

    if (format === 'test') {
      batScore = Math.min(100,
        (avg / 60) * 40 +         // avg weight
        (Math.min(runs, 8000) / 8000) * 35 +  // runs weight
        (sr > 0 ? Math.min(sr / 80, 1) * 25 : 0)
      );
    } else if (format === 'odi') {
      batScore = Math.min(100,
        (avg / 55) * 35 +
        (Math.min(runs, 8000) / 8000) * 30 +
        (Math.min(sr, 130) / 130) * 35
      );
    } else { // t20
      batScore = Math.min(100,
        (avg / 40) * 25 +
        (Math.min(runs, 3000) / 3000) * 25 +
        (Math.min(sr, 160) / 160) * 50
      );
    }
    batScore = Math.round(batScore);
  }

  // Bowling score 0–100
  let bowlScore = 0;
  if (bowl) {
    const num = (...keys) => {
      for (const k of keys) {
        const value = parseFloat(bowl[k]);
        if (Number.isFinite(value) && value > 0) return value;
      }
      return 0;
    };

    const avg = num('bowling_average', 'bowling_avg', 'average');
    const econ = num('economy_rate', 'economy');
    const wkts = num('wickets');
    const sr = num('bowling_strike_rate', 'strike_rate');

    if (avg > 0 && econ > 0) {
      const avgScore  = Math.max(0, 1 - (avg - 20) / 30);   // 20 avg = perfect
      const econScore = Math.max(0, 1 - (econ - 3.5) / 4);  // 3.5 econ = perfect
      const wktScore  = Math.min(wkts, 200) / 200;
      bowlScore = Math.round(Math.min(100,
        avgScore * 40 + econScore * 35 + wktScore * 25
      ));
    } else if (wkts > 0 || sr > 0) {
      // Fallback when average/economy are missing but wickets/strike-rate exist.
      const wktScore = Math.min(wkts, 200) / 200;
      const srScore = sr > 0 ? Math.max(0, 1 - (sr - 15) / 40) : 0;
      bowlScore = Math.round(Math.min(100, wktScore * 75 + srScore * 25));
    }
  }

  return { batting: batScore, bowling: bowlScore };
}

// ── Mini avatar ───────────────────────────────────────────
function MiniAvatar({ player, size = 40 }) {
  const [err, setErr] = useState(false);
  const initials = (player.name || '')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  if (player.image_url && !err) {
    return (
      <div className="tb-avatar" style={{ width: size, height: size }}>
        <img src={player.image_url} alt={player.name}
          onError={() => setErr(true)} />
      </div>
    );
  }
  return (
    <div className="tb-avatar tb-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}

// ── Score bar ────────────────────────────────────────────
function ScoreBar({ value, color = 'gold', label }) {
  const clr = color === 'gold'  ? 'var(--accent-gold)'
            : color === 'blue'  ? 'var(--accent-blue)'
            : color === 'green' ? 'var(--accent-green)'
            : 'var(--accent-cyan)';
  return (
    <div className="tb-bar">
      <div className="tb-bar__header">
        <span className="tb-bar__label">{label}</span>
        <span className="tb-bar__value" style={{ color: clr }}>{value}</span>
      </div>
      <div className="tb-bar__track">
        <div className="tb-bar__fill"
          style={{ width: `${value}%`, background: clr }} />
      </div>
    </div>
  );
}

// ── Stars ────────────────────────────────────────────────
function Stars({ value }) {
  return (
    <div className="tb-stars">
      {[1,2,3,4,5].map((n) => (
        <span key={n}
          className={`tb-star ${value >= n ? 'full' : value >= n - 0.5 ? 'half' : 'empty'}`}>
          ★
        </span>
      ))}
    </div>
  );
}

// ── Player slot (in the XI) ───────────────────────────────
function PlayerSlot({ index, player, onRemove, format }) {
  const scores = player?.profile ? scorePlayer(player.profile, format) : null;

  if (!player) {
    return (
      <div className="tb__slot tb__slot--empty">
        <div className="tb__slot__num">{index + 1}</div>
        <div className="tb__slot__empty-label">Empty slot</div>
      </div>
    );
  }

  return (
    <div className="tb__slot tb__slot--filled">
      <div className="tb__slot__num">{index + 1}</div>
      <MiniAvatar player={player} size={44} />
      <div className="tb__slot__info">
        <div className="tb__slot__name">{player.name}</div>
        <div className="tb__slot__role">{player.playing_role || '—'}</div>
      </div>
      {scores && (
        <div className="tb__slot__scores">
          <span className="tb__slot__score tb__slot__score--bat" title="Batting score">
            🏏 {scores.batting}
          </span>
          <span className="tb__slot__score tb__slot__score--bowl" title="Bowling score">
            🎯 {scores.bowling}
          </span>
        </div>
      )}
      <button className="tb__slot__remove" onClick={() => onRemove(index)}
        title="Remove player">✕</button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
const FORMATS = ['odi', 'test', 't20'];
const FORMAT_LABELS = { odi: 'ODI', test: 'Test', t20: 'T20' };
const DB_ROLE_ORDER = [
  'Wicketkeeper Batter',
  'All-Rounder',
  'Bowling All-Rounder',
  'Batting All-Rounder',
  'Batter',
  'Opening Batter',
  'Top-Order Batter',
  'Middle-Order Batter',
  'Bowler',
];

function roleMatchesFilter(player, filter) {
  if (filter === 'All') return true;
  const role = String(player.playing_role || '').trim().toLowerCase();
  return role === filter.trim().toLowerCase();
}

function buildBrowseRoleFilters(players) {
  const EXCLUDED_BROWSE_ROLES = new Set(['wicketkeeper']);
  const roleSet = new Set(
    (players || [])
      .map((p) => String(p.playing_role || '').trim())
      .filter((role) => role && !EXCLUDED_BROWSE_ROLES.has(role.toLowerCase()))
  );

  const ordered = DB_ROLE_ORDER.filter((role) => roleSet.has(role));
  const extras = Array.from(roleSet)
    .filter((role) => !DB_ROLE_ORDER.includes(role))
    .sort((a, b) => a.localeCompare(b));

  return ['All', ...ordered, ...extras];
}

export default function TeamBuilder() {
  const [roster, setRoster]           = useState([]); // max 11 players
  const [format, setFormat]           = useState('odi');
  const [allPlayers, setAllPlayers]   = useState([]);
  const [browseQuery, setBrowseQuery] = useState('');
  const [browseRoleFilter, setBrowseRoleFilter] = useState('All');
  const [loadingProfiles, setLoadingProfiles] = useState({});
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisTrigger, setAnalysisTrigger] = useState(0);
  const [analysis, setAnalysis]       = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const browseRoleFilters = buildBrowseRoleFilters(allPlayers);

  // Load all players for browse panel
  useEffect(() => {
    fetchPlayers().then((d) => setAllPlayers(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    if (!browseRoleFilters.includes(browseRoleFilter)) {
      setBrowseRoleFilter('All');
    }
  }, [browseRoleFilter, browseRoleFilters]);

  useEffect(() => {
    if (!analysisOpen) return;
    if (roster.length < 5) {
      setAnalysis(null);
      setAnalysisError('Add at least 5 players to analyse this team.');
      setAnalysisLoading(false);
      return;
    }

    let cancelled = false;

    const loadAnalysis = async () => {
      setAnalysisLoading(true);
      setAnalysisError('');
      setAnalysis(null);
      try {
        const data = await analyzeTeamBuilder(roster.map((player) => player.id), format);
        if (!cancelled) {
          setAnalysis(data);
        }
      } catch (_) {
        if (!cancelled) {
          setAnalysisError('Unable to analyse the team right now.');
        }
      } finally {
        if (!cancelled) {
          setAnalysisLoading(false);
        }
      }
    };

    loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysisOpen, analysisTrigger, format, roster]);

  // Add player to roster (fetches full profile for scoring)
  const addPlayer = useCallback(async (player) => {
    if (roster.length >= 11) return;
    if (roster.find((p) => p.id === player.id)) return;

    setLoadingProfiles((prev) => ({ ...prev, [player.id]: true }));
    let profile = null;
    try {
      const data = await fetchPlayerProfile(player.id);
      // profile = { odi, test, t20 }
      profile = { odi: data.odi, test: data.test, t20: data.t20 };
    } catch (_) {}

    setRoster((prev) => {
      if (prev.length >= 11 || prev.find((p) => p.id === player.id)) return prev;
      return [...prev, { ...player, profile }];
    });
    setLoadingProfiles((prev) => { const n = { ...prev }; delete n[player.id]; return n; });
  }, [roster]);

  const removePlayer = (index) => {
    setRoster((prev) => prev.filter((_, i) => i !== index));
  };

  const clearTeam = () => {
    setRoster([]);
    setAnalysisOpen(false);
    setAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(false);
  };

  const handleAnalyzeClick = () => {
    setAnalysisOpen(true);
    setAnalysisTrigger((prev) => prev + 1);
  };

  // Browse filtered
  const browsePlayers = allPlayers.filter((p) => {
    const matchesQuery = browseQuery.trim()
      ? p.name.toLowerCase().includes(browseQuery.toLowerCase())
      : true;
    const matchesRole = roleMatchesFilter(p, browseRoleFilter);
    return matchesQuery && matchesRole;
  });
  const hasActiveBrowseFilters = Boolean(browseQuery.trim()) || browseRoleFilter !== 'All';

  const inRoster = (id) => roster.some((p) => p.id === id);

  return (
    <div className="tb page-wrapper">
      <div className="container">

        {/* ── Header ── */}
        <div className="tb__header">
          <div className="tb__header-left">
            <div className="tb__eyebrow">Team Builder</div>
            <h1 className="tb__title">BUILD YOUR <span>XI</span></h1>
            <p className="tb__subtitle">
              Pick 11 players, choose a format and get a full strength analysis.
            </p>
          </div>
          <div className="tb__header-right">
            <div className="tb__counter">
              <span className="tb__counter-num">{roster.length}</span>
              <span className="tb__counter-den">/11</span>
            </div>
            {roster.length > 0 && (
              <button className="tb__clear-btn" onClick={clearTeam}>
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Format selector ── */}
        <div className="tb__format-bar">
          {FORMATS.map((f) => (
            <button
              key={f}
              className={`tb__format-btn ${format === f ? 'active' : ''}`}
              onClick={() => setFormat(f)}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="tb__body">

          {/* ── LEFT: Player picker ── */}
          <div className="tb__picker">
            <div className="tb__picker-head">
              <span className="tb__picker-title">Browse</span>
            </div>

            <div className="tb__browse-panel">
              <input
                className="tb__search-input"
                type="text"
                placeholder="Filter players…"
                value={browseQuery}
                onChange={(e) => setBrowseQuery(e.target.value)}
              />
              <div className="tb__browse-toolbar">
                <label className="tb__browse-select-wrap" aria-label="Filter by role">
                  <span className="tb__browse-select-label">Role</span>
                  <select
                    className="tb__browse-select"
                    value={browseRoleFilter}
                    onChange={(e) => setBrowseRoleFilter(e.target.value)}
                  >
                    {browseRoleFilters.map((filter) => (
                      <option key={filter} value={filter}>{filter}</option>
                    ))}
                  </select>
                </label>
                {hasActiveBrowseFilters && (
                  <button
                    type="button"
                    className="tb__browse-reset"
                    onClick={() => {
                      setBrowseQuery('');
                      setBrowseRoleFilter('All');
                    }}
                  >
                    Reset filters
                  </button>
                )}
              </div>
              <div className="tb__browse-list">
                {browsePlayers.slice(0, 80).map((p) => {
                  const already = inRoster(p.id);
                  const loading = loadingProfiles[p.id];
                  const country = COUNTRIES[p.country_id];
                  const countryName = country?.name || 'Unknown';
                  return (
                    <button
                      key={p.id}
                      className={`tb__browse-item ${already ? 'already' : ''} ${roster.length >= 11 && !already ? 'disabled' : ''}`}
                      onClick={() => !already && roster.length < 11 && addPlayer(p)}
                      disabled={already || loading || (roster.length >= 11 && !already)}
                    >
                      {p.image_url ? (
                        <img className="tb__browse-img" src={p.image_url} alt={p.name}
                          onError={(e) => e.target.style.display = 'none'} />
                      ) : (
                        <div className="tb__browse-initials">
                          {p.name.split(' ').map((w) => w[0]).slice(0,2).join('')}
                        </div>
                      )}
                      <div className="tb__browse-info">
                        <div className="tb__browse-name">{p.name}</div>
                        <div className="tb__browse-meta">
                          {countryName} | {p.playing_role || '—'}
                        </div>
                      </div>
                      {already
                        ? <span className="tb__browse-check">✓</span>
                        : loading
                        ? <span className="tb__browse-check tb__browse-check--loading">…</span>
                        : <span className="tb__browse-add">+</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: XI slots + Analyse button ── */}
          <div className="tb__xi">
            <div className="tb__xi-header">
              <span className="tb__xi-title">YOUR XI</span>
              {roster.length === 11 && (
                <span className="tb__xi-full">Full squad ✓</span>
              )}
            </div>

            <div className="tb__slots">
              {Array.from({ length: 11 }).map((_, i) => (
                <PlayerSlot
                  key={i}
                  index={i}
                  player={roster[i] || null}
                  onRemove={removePlayer}
                  format={format}
                />
              ))}
            </div>

            {roster.length >= 5 && (
              <button
                className="tb__analyse-btn"
                disabled={analysisLoading}
                onClick={handleAnalyzeClick}
              >
                {analysisLoading ? 'Analysing...' : '⚡ Analyse Team Strength'}
              </button>
            )}
            {roster.length > 0 && roster.length < 5 && (
              <p className="tb__analyse-hint">
                Add at least 5 players to analyse
              </p>
            )}
          </div>
        </div>

        {/* ── Analysis panel ── */}
        {analysisOpen && (
          <div className="tb__analysis">
            <div className="tb__analysis-header">
              <h2 className="tb__analysis-title">
                Team Analysis — <span>{FORMAT_LABELS[format]}</span>
              </h2>
              <button className="tb__analysis-close"
                onClick={() => setAnalysisOpen(false)}>✕</button>
            </div>

            {analysisLoading && (
              <div className="tb__analysis-state">Analysing team strength...</div>
            )}

            {!analysisLoading && analysisError && (
              <div className="tb__analysis-state tb__analysis-state--error">{analysisError}</div>
            )}

            {!analysisLoading && !analysisError && !analysis && (
              <div className="tb__analysis-state">No analysis available yet.</div>
            )}

            {!analysisLoading && !analysisError && analysis && (
              <>

            {/* Overall score */}
            <div className="tb__analysis-hero">
              <div className="tb__overall">
                <div className="tb__overall-ring"
                  style={{ '--pct': analysis.overall }}>
                  <div className="tb__overall-inner">
                    <div className="tb__overall-num">{analysis.overall}</div>
                    <div className="tb__overall-label">/ 100</div>
                  </div>
                </div>
                <div className="tb__overall-right">
                  <div className="tb__overall-grade">
                    {analysis.overall >= 75 ? '💎 Elite'
                     : analysis.overall >= 55 ? '⭐ Strong'
                     : analysis.overall >= 40 ? '✅ Average'
                     : '⚠️ Weak'}
                  </div>
                  <Stars value={analysis.stars} />
                  <div className="tb__overall-fmt">
                    {FORMAT_LABELS[format]} Format
                  </div>
                </div>
              </div>
            </div>

            {/* Batting / Bowling bars */}
            <div className="tb__analysis-section">
              <div className="tb__section-title">Strength Breakdown</div>
              <div className="tb__bars">
                <ScoreBar value={analysis.battingUnit}  color="gold"  label="Batting Strength" />
                <ScoreBar value={analysis.bowlingUnit} color="blue"  label="Bowling Strength" />
                <ScoreBar
                  value={analysis.overall}
                  color="green" label="Overall Balance" />
              </div>
            </div>

            {/* Per-player scores */}
            <div className="tb__analysis-section">
              <div className="tb__section-title">Player Scores</div>
              <div className="tb__player-scores">
                {analysis.scored.map((p) => (
                  <div key={p.id} className="tb__ps-row">
                    <MiniAvatar player={p} size={36} />
                    <div className="tb__ps-name">
                      <Link to={`/players/${p.id}`} className="tb__ps-link">
                        {p.name}
                      </Link>
                      <span className="tb__ps-role">{p.playing_role || '—'}</span>
                    </div>
                    <div className="tb__ps-bars">
                      <div className="tb__ps-bar-wrap">
                        <span className="tb__ps-bar-label">🏏</span>
                        <div className="tb__ps-track">
                          <div className="tb__ps-fill tb__ps-fill--bat"
                            style={{ width: `${p.scores.batting}%` }} />
                        </div>
                        <span className="tb__ps-bar-num">{p.scores.batting}</span>
                      </div>
                      <div className="tb__ps-bar-wrap">
                        <span className="tb__ps-bar-label">🎯</span>
                        <div className="tb__ps-track">
                          <div className="tb__ps-fill tb__ps-fill--bowl"
                            style={{ width: `${p.scores.bowling}%` }} />
                        </div>
                        <span className="tb__ps-bar-num">{p.scores.bowling}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top performers */}
            <div className="tb__analysis-section">
              <div className="tb__section-title">Top Performers</div>
              <div className="tb__tops">
                {analysis.topBatter && (
                  <div className="tb__top-card tb__top-card--bat">
                    <div className="tb__top-label">Best Batter 🏏</div>
                    <div className="tb__top-name">{analysis.topBatter.name}</div>
                    <div className="tb__top-score">{analysis.topBatter.scores.batting}/100</div>
                  </div>
                )}
                {analysis.topBowler && analysis.topBowler.scores.bowling > 0 && (
                  <div className="tb__top-card tb__top-card--bowl">
                    <div className="tb__top-label">Best Bowler 🎯</div>
                    <div className="tb__top-name">{analysis.topBowler.name}</div>
                    <div className="tb__top-score">{analysis.topBowler.scores.bowling}/100</div>
                  </div>
                )}
              </div>
            </div>

            {/* Weaknesses */}
            {analysis.weaknesses.length > 0 && (
              <div className="tb__analysis-section">
                <div className="tb__section-title">Weaknesses & Suggestions</div>
                <div className="tb__weaknesses">
                  {analysis.weaknesses.map((w, i) => (
                    <div key={i} className={`tb__weakness tb__weakness--${w.type}`}>
                      <span className="tb__weakness-icon">
                        {w.type === 'bat' ? '🏏'
                         : w.type === 'bowl' ? '🎯'
                         : w.type === 'balance' ? '⚖️' : '⚠️'}
                      </span>
                      {w.msg}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analysis.weaknesses.length === 0 && (
              <div className="tb__no-weaknesses">
                🏆 Well-balanced team! No major weaknesses found.
              </div>
            )}

              </>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
