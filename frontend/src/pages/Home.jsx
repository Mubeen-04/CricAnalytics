import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PlayerCard from '../components/PlayerCard';
import { SkeletonCard } from '../components/Loader';
import {
  fetchPlayers,
  fetchTopOdiBatsmen,   fetchTopOdiBowlers,   fetchTopOdiAllrounders,
  fetchTopTestBatsmen,  fetchTopTestBowlers,  fetchTopTestAllrounders,
  fetchTopT20Batsmen,   fetchTopT20Bowlers,   fetchTopT20Allrounders,
} from '../services/api';
import '../styles/Home.css';

const FEATURES = [
  { icon: '📊', title: 'Deep Analytics',    desc: 'Batting & bowling stats across ODI, Test and T20.' },
  { icon: '⚖️', title: 'Player Comparison', desc: 'Head-to-head across any format — batting and bowling.' },
  { icon: '🏆', title: 'Leaderboards',      desc: 'Top 10 batsmen, bowlers and all-rounders per format.' },
  { icon: '🏏', title: '3 Formats',         desc: 'Full ODI, Test and T20 international coverage.' },
  { icon: '🔍', title: 'Smart Search',      desc: 'Find players by name or role instantly.' },
  { icon: '📈', title: 'Career Profile',    desc: 'All formats in one profile — batting, bowling, all-round.' },
];

// Every leaderboard tab, keyed by format × category
const TABS = {
  ODI: {
    Batting:   { fetch: fetchTopOdiBatsmen,    cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'average',     label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
      { key: 'hundreds',    label: '100s' },
      { key: 'fifties',     label: '50s'  },
    ]},
    Bowling:   { fetch: fetchTopOdiBowlers,    cols: [
      { key: 'wickets',     label: 'Wkts',    gold: true },
      { key: 'bowling_avg', label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'economy',     label: 'Econ',    fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
    ]},
    'All-round': { fetch: fetchTopOdiAllrounders, cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'wickets',     label: 'Wkts' },
      { key: 'batting_avg', label: 'Bat Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'bowling_avg', label: 'Bwl Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
    ]},
  },
  Test: {
    Batting:   { fetch: fetchTopTestBatsmen,   cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'average',     label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
    ]},
    Bowling:   { fetch: fetchTopTestBowlers,   cols: [
      { key: 'wickets',     label: 'Wkts',    gold: true },
      { key: 'average',     label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'economy',     label: 'Econ',    fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
    ]},
    'All-round': { fetch: fetchTopTestAllrounders, cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'wickets',     label: 'Wkts' },
      { key: 'batting_avg', label: 'Bat Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'bowling_avg', label: 'Bwl Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
    ]},
  },
  T20: {
    Batting:   { fetch: fetchTopT20Batsmen,    cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'average',     label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
    ]},
    Bowling:   { fetch: fetchTopT20Bowlers,    cols: [
      { key: 'wickets',     label: 'Wkts',    gold: true },
      { key: 'average',     label: 'Avg',     fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'economy',     label: 'Econ',    fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'strike_rate', label: 'SR',      fmt: (v) => +v ? Number(v).toFixed(1) : '—' },
    ]},
    'All-round': { fetch: fetchTopT20Allrounders, cols: [
      { key: 'runs',        label: 'Runs',    gold: true },
      { key: 'wickets',     label: 'Wkts' },
      { key: 'batting_avg', label: 'Bat Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
      { key: 'bowling_avg', label: 'Bwl Avg', fmt: (v) => +v ? Number(v).toFixed(2) : '—' },
    ]},
  },
};

const FORMATS    = ['ODI', 'Test', 'T20'];
const CATEGORIES = ['Batting', 'Bowling', 'All-round'];

export default function Home() {
  const [players, setPlayers]         = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [fmt, setFmt]         = useState('ODI');
  const [cat, setCat]         = useState('Batting');
  const [tabData, setTabData] = useState([]);
  const [loadingTab, setLoadingTab] = useState(true);

  // Featured players
  useEffect(() => {
    fetchPlayers()
      .then((d) => {
        if (!Array.isArray(d)) {
          setPlayers([]);
          return;
        }

        const seen = new Set();
        const unique = [];
        for (const p of d) {
          const key = (p?.full_name || p?.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          unique.push(p);
          if (unique.length === 8) break;
        }
        setPlayers(unique);
      })
      .catch(() => setPlayers([]))
      .finally(() => setLoadingCards(false));
  }, []);

  // Leaderboard
  useEffect(() => {
    setLoadingTab(true);
    TABS[fmt][cat].fetch()
      .then((d) => setTabData(Array.isArray(d) ? d : []))
      .catch(() => setTabData([]))
      .finally(() => setLoadingTab(false));
  }, [fmt, cat]);

  const cols = TABS[fmt][cat].cols;

  return (
    <div className="home page-wrapper">

      {/* Hero */}
      <section className="home__hero">
        <div className="home__hero-bg" />
        <div className="home__hero-grid" />
        <div className="container">
          <div className="home__hero-content">
            <div className="home__hero-eyebrow">Cricket Analytics Platform</div>
            <h1 className="home__hero-title">THE NUMBERS<span>BEHIND THE GAME</span></h1>
            <p className="home__hero-subtitle">
              In-depth statistics, player profiles and analytics across all formats of international cricket.
            </p>
            <div className="home__hero-actions">
              <Link to="/players" className="btn btn--primary">Explore Players →</Link>
              <Link to="/rankings" className="btn btn--ghost">Leaderboards</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured players */}
      <section className="home__section">
        <div className="container">
          <div className="home__section-header">
            <h2 className="home__section-title">Featured <em>Players</em></h2>
            <Link to="/players" className="home__section-link">View all →</Link>
          </div>
          {loadingCards ? (
            <div className="home__players-grid">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="home__players-grid">
              {players.map((p) => <PlayerCard key={p.id} player={p} showId={false} />)}
            </div>
          )}
        </div>
      </section>

      {/* Leaderboards */}
      <section className="home__section">
        <div className="container">
          <div className="home__section-header">
            <h2 className="home__section-title">Top <em>Performers</em></h2>
            <Link to="/rankings" className="home__section-link">All leaderboards →</Link>
          </div>

          {/* Format tabs */}
          <div className="home__format-tabs" style={{ marginBottom: 10 }}>
            {FORMATS.map((f) => (
              <button key={f} className={`format-tab ${fmt === f ? 'active' : ''}`} onClick={() => setFmt(f)}>
                {f}
              </button>
            ))}
          </div>

          {/* Category tabs */}
          <div className="home__format-tabs" style={{ marginBottom: 20 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`format-tab ${cat === c ? 'active' : ''}`}
                onClick={() => setCat(c)}
                style={{ fontSize: 12 }}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="home__rankings-table">
            <table className="rankings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  {cols.map((c) => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {loadingTab ? (
                  <tr><td colSpan={cols.length + 2} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : tabData.length === 0 ? (
                  <tr><td colSpan={cols.length + 2} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>No data</td></tr>
                ) : (
                  tabData.map((row, i) => (
                    <tr key={i}>
                      <td className={`rank ${i < 3 ? 'rank--top' : ''}`}>{i + 1}</td>
                      <td className="player-name">{row.player_name || 'Unknown Player'}</td>
                      {cols.map((c) => (
                        <td key={c.key} className="stat-value mono" style={c.gold ? { color: 'var(--accent-gold)' } : {}}>
                          {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="home__features">
        <div className="container">
          <div className="home__section-header" style={{ marginBottom: 28 }}>
            <h2 className="home__section-title">What's <em>Inside</em></h2>
          </div>
          <div className="home__features-grid">
            {FEATURES.map(({ icon, title, desc }) => (
              <div className="feature-card" key={title}>
                <div className="feature-card__icon">{icon}</div>
                <div className="feature-card__title">{title}</div>
                <div className="feature-card__desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}