// ─────────────────────────────────────────────────────────
//  API service — exact match to CricAnalytics Django backend
//
//  Base URL uses current domain (works on localhost and production)
// ─────────────────────────────────────────────────────────

const BASE = `${window.location.origin}/api`;

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
  return res.json();
}

// ── Players app ───────────────────────────────────────────
// GET /api/players/
export const fetchPlayers   = ()      => get('/players/');
// GET /api/player/<id>/
export const fetchPlayer    = (id)    => get(`/player/${id}/`);
// GET /api/search/?q=<query>
export const searchPlayers  = (q)     => get(`/search/?q=${encodeURIComponent(q)}`);

// ── Per-player stats (now return { batting, bowling }) ────
// GET /api/player/<id>/odi/
export const fetchOdiStats  = (id)    => get(`/player/${id}/odi/`);
// GET /api/player/<id>/test/
export const fetchTestStats = (id)    => get(`/player/${id}/test/`);
// GET /api/player/<id>/t20/
export const fetchT20Stats  = (id)    => get(`/player/${id}/t20/`);

// GET /api/player/<id>/profile/
// Returns: { player, odi:{batting,bowling,allround}, test:{...}, t20:{...} }
export const fetchPlayerProfile = (id) => get(`/player/${id}/profile/`);

// ── Leaderboards ─────────────────────────────────────────
// ODI
export const fetchTopOdiBatsmen     = () => get('/stats/odi/batting/top/');
export const fetchTopOdiBowlers     = () => get('/stats/odi/bowling/top/');
export const fetchTopOdiAllrounders = () => get('/stats/odi/allround/top/');
// Test
export const fetchTopTestBatsmen     = () => get('/stats/test/batting/top/');
export const fetchTopTestBowlers     = () => get('/stats/test/bowling/top/');
export const fetchTopTestAllrounders = () => get('/stats/test/allround/top/');
// T20
export const fetchTopT20Batsmen     = () => get('/stats/t20/batting/top/');
export const fetchTopT20Bowlers     = () => get('/stats/t20/bowling/top/');
export const fetchTopT20Allrounders = () => get('/stats/t20/allround/top/');

// ── Compare ───────────────────────────────────────────────
// GET /api/compare/?player1=<id>&player2=<id>&format=odi|test|t20
// Returns: { format, player1:{id,name,role,batting,bowling}, player2:{...} }
export const fetchComparison = (p1Id, p2Id, format = 'odi') =>
  get(`/compare/?player1=${p1Id}&player2=${p2Id}&match_format=${encodeURIComponent(format)}`);

// ── Team Builder ──────────────────────────────────────────
// POST /api/team-builder/analyze/   body: { player_ids: [...], match_format: 'odi'|'test'|'t20' }
export async function analyzeTeamBuilder(playerIds, format = 'odi') {
  const res = await fetch(`${BASE}/team-builder/analyze/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_ids: playerIds, match_format: format }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}