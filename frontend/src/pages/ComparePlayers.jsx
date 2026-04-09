import { useState, useEffect, useRef } from 'react';
import { Loader } from '../components/Loader';
import { fetchPlayers, fetchComparison } from '../services/api';
import '../styles/ComparePlayers.css';

// Metrics per category, reading from the enriched compare response:
// { format, player1: { id, name, role, batting:{...}, bowling:{...} }, player2: {...} }

const BATTING_METRICS = [
  { key: 'runs',        label: 'Runs',        higher: true  },
  { key: 'average',     label: 'Batting Avg', higher: true,  fmt: (v) => Number(v).toFixed(2) },
  { key: 'strike_rate', label: 'Strike Rate', higher: true,  fmt: (v) => Number(v).toFixed(1) },
  { key: 'hundreds',    label: '100s',        higher: true  },
  { key: 'fifties',     label: '50s',         higher: true  },
];

const BOWLING_METRICS = [
  { key: 'wickets',     label: 'Wickets',     higher: true  },
  { key: 'average',     label: 'Bowl Avg',    higher: false, fmt: (v) => Number(v).toFixed(2) },
  { key: 'economy',     label: 'Economy',     higher: false, fmt: (v) => Number(v).toFixed(2) },
  { key: 'strike_rate', label: 'Bowl SR',     higher: false, fmt: (v) => Number(v).toFixed(1) },
];

const FORMATS = ['ODI', 'Test', 'T20'];

function displayName(player) {
  return player?.name || 'Unknown Player';
}

function SelectorAvatar({ player }) {
  const [imgError, setImgError] = useState(false);
  const name = displayName(player);
  const imageUrl = player?.image_url;

  if (imageUrl && !imgError) {
    return (
      <div className="player-selector__selected-avatar player-selector__selected-avatar--image">
        <img src={imageUrl} alt={name} onError={() => setImgError(true)} />
      </div>
    );
  }

  return (
    <div className="player-selector__selected-avatar">
      {name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
    </div>
  );
}

// ── Player search dropdown ────────────────────────────────
function PlayerSelector({ label, selected, onSelect, allPlayers }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const timer = useRef(null);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(() => {
      const lq = q.toLowerCase();
      setResults(
        allPlayers
          .filter((p) => {
            const shortName = (p?.name || '').toLowerCase();
            return shortName.includes(lq);
          })
          .slice(0, 8)
      );
    }, 200);
  };

  const choose = (p) => { onSelect(p); setQuery(''); setResults([]); };

  if (selected) {
    return (
      <div className="player-selector">
        <div className="player-selector__label">{label}</div>
        <div className="player-selector__selected">
          <SelectorAvatar player={selected} />
          <div className="player-selector__selected-info">
            <div className="player-selector__selected-name">{displayName(selected)}</div>
            <div className="player-selector__selected-meta">{selected.playing_role}</div>
          </div>
          <button className="player-selector__clear" onClick={() => onSelect(null)}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div className="player-selector">
      <div className="player-selector__label">{label}</div>
      <input
        className="player-selector__search"
        type="text"
        placeholder="Type player name…"
        value={query}
        onChange={handleChange}
      />
      {results.length > 0 && (
        <div className="player-selector__dropdown">
          {results.map((p) => (
            <button key={p.id} className="player-selector__option" onClick={() => choose(p)}>
              <span>{displayName(p)}</span>
              <span className="player-selector__option-country">{p.playing_role}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Compare bar ───────────────────────────────────────────
function CompareBar({ label, v1, v2, higherBetter, fmt }) {
  const n1 = parseFloat(v1) || 0;
  const n2 = parseFloat(v2) || 0;
  const p1w = higherBetter ? n1 >= n2 : n1 <= n2;
  const p2w = higherBetter ? n2 >= n1 : n2 <= n1;
  const d = (v) => (v == null || isNaN(Number(v))) ? '—' : fmt ? fmt(v) : v;

  return (
    <div className="compare-row">
      <div className="compare-row__label">{label}</div>
      <div className="compare-row__bars">
        <div className="compare-row__player">
          <div className={`compare-row__value ${p1w ? 'compare-row__value--better' : n1 === n2 ? '' : 'compare-row__value--worse'}`}>{d(v1)}</div>
        </div>
        <div className="compare-row__center-label">{label}</div>
        <div className="compare-row__player compare-row__player--right">
          <div className={`compare-row__value ${p2w ? 'compare-row__value--better' : n1 === n2 ? '' : 'compare-row__value--worse'}`}>{d(v2)}</div>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────
export default function ComparePlayers() {
  const [allPlayers, setAllPlayers]   = useState([]);
  const [p1, setP1]                   = useState(null);
  const [p2, setP2]                   = useState(null);
  const [fmt, setFmt]                 = useState('ODI');
  const [result, setResult]           = useState(null);
  const [loading, setLoading]         = useState(false);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    fetchPlayers()
      .then((d) => setAllPlayers(Array.isArray(d) ? d : []))
      .catch(() => setAllPlayers([]))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    if (!p1 || !p2) { setResult(null); return; }
    setLoading(true);
    fetchComparison(p1.id, p2.id, fmt.toLowerCase())
      .then(setResult)
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  }, [p1, p2, fmt]);

  const d1 = result?.player1 || {};
  const d2 = result?.player2 || {};
  const bat1 = d1.batting || {};
  const bat2 = d2.batting || {};
  const bowl1 = d1.bowling || {};
  const bowl2 = d2.bowling || {};

  // ODI batting has richer data; Test/T20 have fewer fields — show only common ones
  const batMetrics = fmt === 'ODI' ? BATTING_METRICS : BATTING_METRICS.slice(0, 3);

  return (
    <div className="compare-page page-wrapper">
      <div className="container">

        <div className="compare-page__header">
          <h1 className="compare-page__title">Compare <span>Players</span></h1>
          <p className="compare-page__subtitle">Head-to-head batting &amp; bowling comparison across any format</p>
        </div>

        {/* Player selectors */}
        <div className="compare-page__selectors">
          <PlayerSelector label="Player 1" selected={p1} onSelect={setP1} allPlayers={allPlayers} />
          <div className="compare-page__vs">VS</div>
          <PlayerSelector label="Player 2" selected={p2} onSelect={setP2} allPlayers={allPlayers} />
        </div>

        {/* Format toggle — only shown once both players selected */}
        {p1 && p2 && (
          <div className="compare-page__formats" style={{ padding: '0 16px' }}>
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFmt(f)}
                className={`compare-page__format-btn ${fmt === f ? 'active' : ''}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Output */}
        {!p1 || !p2 ? (
          <div className="compare-page__placeholder">
            <div className="compare-page__placeholder-icon">⚖️</div>
            <div className="compare-page__placeholder-text">
              {loadingList ? 'Loading player list…' : 'Select two players above to compare'}
            </div>
          </div>
        ) : loading ? (
          <Loader text="Fetching stats…" />
        ) : !result ? (
          <div className="compare-page__placeholder">
            <div className="compare-page__placeholder-icon">📊</div>
            <div className="compare-page__placeholder-text">No data available for this format combination</div>
          </div>
        ) : (
          <div className="compare-results">

            {/* Names header */}
            <div className="compare-page__names">
              <div>
                <div className="compare-page__player-name">{d1.name}</div>
                <div className="compare-page__player-role">{d1.role}</div>
              </div>
              <div className="compare-page__format-label">
                {fmt}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="compare-page__player-name">{d2.name}</div>
                <div className="compare-page__player-role">{d2.role}</div>
              </div>
            </div>

            {/* Batting section */}
            <div className="compare-section-title">
              BATTING
            </div>
            {batMetrics.map(({ key, label, higher, fmt: fmtFn }) => (
              <CompareBar key={`bat-${key}`} label={label} v1={bat1[key]} v2={bat2[key]} higherBetter={higher} fmt={fmtFn} />
            ))}

            {/* Bowling section */}
            <div className="compare-section-title">
              BOWLING
            </div>
            {BOWLING_METRICS.map(({ key, label, higher, fmt: fmtFn }) => (
              <CompareBar key={`bowl-${key}`} label={label} v1={bowl1[key]} v2={bowl2[key]} higherBetter={higher} fmt={fmtFn} />
            ))}

          </div>
        )}

      </div>
    </div>
  );
}