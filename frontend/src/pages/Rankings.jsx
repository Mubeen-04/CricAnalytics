import { useState, useEffect } from 'react';
import { Loader } from '../components/Loader';
import {
  fetchTopOdiBatsmen,   fetchTopOdiBowlers,   fetchTopOdiAllrounders,
  fetchTopTestBatsmen,  fetchTopTestBowlers,  fetchTopTestAllrounders,
  fetchTopT20Batsmen,   fetchTopT20Bowlers,   fetchTopT20Allrounders,
} from '../services/api';
import '../styles/Rankings.css';

const safeFixed = (v, digits) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : '—';
};

const BOARDS = {
  ODI: {
    Batting: {
      fetch: fetchTopOdiBatsmen,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',    main: true },
        { key: 'average',     label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
        { key: 'hundreds',    label: '100s' },
        { key: 'fifties',     label: '50s' },
      ],
    },
    Bowling: {
      fetch: fetchTopOdiBowlers,
      mainKey: 'wickets',
      cols: [
        { key: 'wickets',     label: 'Wickets', main: true },
        { key: 'bowling_avg', label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'economy',     label: 'Economy', fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
      ],
    },
    'All-round': {
      fetch: fetchTopOdiAllrounders,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',     main: true },
        { key: 'wickets',     label: 'Wickets' },
        { key: 'batting_avg', label: 'Bat Avg',  fmt: (v) => safeFixed(v, 2) },
        { key: 'bowling_avg', label: 'Bowl Avg', fmt: (v) => safeFixed(v, 2) },
      ],
    },
  },
  Test: {
    Batting: {
      fetch: fetchTopTestBatsmen,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',    main: true },
        { key: 'average',     label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
      ],
    },
    Bowling: {
      fetch: fetchTopTestBowlers,
      mainKey: 'wickets',
      cols: [
        { key: 'wickets',     label: 'Wickets', main: true },
        { key: 'average',     label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'economy',     label: 'Economy', fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
      ],
    },
    'All-round': {
      fetch: fetchTopTestAllrounders,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',     main: true },
        { key: 'wickets',     label: 'Wickets' },
        { key: 'batting_avg', label: 'Bat Avg',  fmt: (v) => safeFixed(v, 2) },
        { key: 'bowling_avg', label: 'Bowl Avg', fmt: (v) => safeFixed(v, 2) },
      ],
    },
  },
  T20: {
    Batting: {
      fetch: fetchTopT20Batsmen,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',    main: true },
        { key: 'average',     label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
      ],
    },
    Bowling: {
      fetch: fetchTopT20Bowlers,
      mainKey: 'wickets',
      cols: [
        { key: 'wickets',     label: 'Wickets', main: true },
        { key: 'average',     label: 'Avg',     fmt: (v) => safeFixed(v, 2) },
        { key: 'economy',     label: 'Economy', fmt: (v) => safeFixed(v, 2) },
        { key: 'strike_rate', label: 'SR',      fmt: (v) => safeFixed(v, 1) },
      ],
    },
    'All-round': {
      fetch: fetchTopT20Allrounders,
      mainKey: 'runs',
      cols: [
        { key: 'runs',        label: 'Runs',     main: true },
        { key: 'wickets',     label: 'Wickets' },
        { key: 'batting_avg', label: 'Bat Avg',  fmt: (v) => safeFixed(v, 2) },
        { key: 'bowling_avg', label: 'Bowl Avg', fmt: (v) => safeFixed(v, 2) },
      ],
    },
  },
};

const FORMATS    = ['ODI', 'Test', 'T20'];
const CATEGORIES = ['Batting', 'Bowling', 'All-round'];

function RankBadge({ rank }) {
  const cls = rank === 1 ? 'rank-badge--1' : rank === 2 ? 'rank-badge--2' : rank === 3 ? 'rank-badge--3' : '';
  return <span className={`rank-badge ${cls}`}>{rank}</span>;
}

export default function Rankings() {
  const [fmt, setFmt]         = useState('ODI');
  const [cat, setCat]         = useState('Batting');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    BOARDS[fmt][cat].fetch()
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [fmt, cat]);

  const board  = BOARDS[fmt][cat];

  return (
    <div className="rankings-page page-wrapper">
      <div className="container">
        <div className="rankings-page__header">
          <h1 className="rankings-page__title">Leaderboards &amp; <span>Rankings</span></h1>
          <p className="rankings-page__subtitle">Top 10 performers per format and discipline</p>
        </div>

        {/* Format selector */}
        <div className="rankings-page__controls">
          <div className="rankings-toggle-group">
            {FORMATS.map((f) => (
              <button key={f} className={`rankings-toggle ${fmt === f ? 'active' : ''}`} onClick={() => setFmt(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="rankings-toggle-group">
            {CATEGORIES.map((c) => (
              <button key={c} className={`rankings-toggle ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? <Loader text="Loading…" /> : (
          <div className="rankings-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>Rank</th>
                  <th>Player</th>
                  {board.cols.map((c) => <th key={c.key}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={board.cols.length + 2} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data</td></tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={i}>
                      <td><RankBadge rank={i + 1} /></td>
                      <td>
                        <div className="player-cell">
                          <div>
                            <div className="player-cell__name">{row.player_short_name || row.player_name || 'Unknown Player'}</div>
                          </div>
                        </div>
                      </td>
                      {board.cols.map((c) => (
                        <td key={c.key}>
                          {c.main ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-gold)', fontWeight: 600 }}>
                              {row[c.key] ?? '—'}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent-cyan)' }}>
                              {c.fmt ? c.fmt(row[c.key]) : (row[c.key] ?? '—')}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}