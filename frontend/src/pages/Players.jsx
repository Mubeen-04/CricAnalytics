import { useState, useEffect } from 'react';
import PlayerCard from '../components/PlayerCard';
import { SkeletonCard } from '../components/Loader';
import { fetchPlayers, searchPlayers } from '../services/api';
import '../styles/Players.css';

export default function Players() {
  const [all, setAll]         = useState([]);   // full list from /api/players/
  const [results, setResults] = useState([]);   // displayed (filtered)
  const [loading, setLoading] = useState(true);
  const [query, setQuery]     = useState('');
  const [searching, setSearching] = useState(false);

  // Load all players once
  useEffect(() => {
    fetchPlayers()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAll(list);
        setResults(list);
      })
      .catch(() => { setAll([]); setResults([]); })
      .finally(() => setLoading(false));
  }, []);

  // Search via /api/search/?q= when query changes (debounced)
  useEffect(() => {
    if (!query.trim()) {
      setResults(all);
      return;
    }
    const t = setTimeout(() => {
      setSearching(true);
      searchPlayers(query)
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [query, all]);

  // Client-side role filter (dynamic from DB-backed data)
  const [role, setRole] = useState('All');
  const roles = ['All', ...Array.from(new Set(all.map((p) => p.playing_role).filter(Boolean))).sort((a, b) => a.localeCompare(b))];

  const visible = role === 'All'
    ? results
    : results.filter((p) => p.playing_role === role);

  return (
    <div className="players-page page-wrapper">
      <div className="container">

        <div className="players-page__header">
          <h1 className="players-page__title">All <span>Players</span></h1>
          <p className="players-page__subtitle">Browse and search the full player database</p>
        </div>

        {/* Filters */}
        <div className="players-page__filters">
          <div className="search-input-wrapper">
            <span className="search-input-wrapper__icon">🔍</span>
            <input
              className="search-input"
              type="text"
              placeholder="Search by name or full name…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r === 'All' ? 'All Roles' : r}</option>
            ))}
          </select>
        </div>

        {!loading && (
          <p className="players-page__results-info">
            Showing <span>{visible.length}</span> player{visible.length !== 1 ? 's' : ''}
            {query && <> matching "<span>{query}</span>"</>}
          </p>
        )}

        {loading || searching ? (
          <div className="players-grid">
            {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">🏏</div>
            <div className="empty-state__title">No players found</div>
            <div className="empty-state__desc">Try a different name or role</div>
          </div>
        ) : (
          <div className="players-grid">
            {visible.map((p) => <PlayerCard key={p.id} player={p} showId={false} />)}
          </div>
        )}

      </div>
    </div>
  );
}