import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader } from '../components/Loader';
import { fetchPlayerProfile } from '../services/api';
import '../styles/PlayerProfile.css';

// ── Country map ───────────────────────────────────────────
const COUNTRIES = {
  1:  { name: 'England',      flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  2:  { name: 'Australia',    flag: '🇦🇺' },
  3:  { name: 'South Africa', flag: '🇿🇦' },
  4:  { name: 'West Indies',  flag: '🏝️' },
  5:  { name: 'New Zealand',  flag: '🇳🇿' },
  6:  { name: 'India',        flag: '🇮🇳' },
  7:  { name: 'Pakistan',     flag: '🇵🇰' },
  8:  { name: 'Sri Lanka',    flag: '🇱🇰' },
  9:  { name: 'Zimbabwe',     flag: '🇿🇼' },
  25: { name: 'Bangladesh',   flag: '🇧🇩' },
  29: { name: 'Ireland',      flag: '🇮🇪' },
  40: { name: 'Afghanistan',  flag: '🇦🇫' },
};

// ── Helpers ───────────────────────────────────────────────
function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}
function normalizeCountryName(value = '') {
  return value.replace(/^\s*[A-Z]{2,3}\s+/, '').trim();
}
function f2(v)  { return v != null && !isNaN(v) ? Number(v).toFixed(2) : '—'; }
function f1(v)  { return v != null && !isNaN(v) ? Number(v).toFixed(1) : '—'; }
function fInt(v){ return v != null ? v : '—'; }

// ── Avatar with image fallback ────────────────────────────
function ProfileAvatar({ name, imageUrl }) {
  const [imgError, setImgError] = useState(false);
  if (imageUrl && !imgError) {
    return (
      <div className="profile__avatar">
        <img src={imageUrl} alt={name} onError={() => setImgError(true)} />
      </div>
    );
  }
  return (
    <div className="profile__avatar profile__avatar--initials">
      {initials(name)}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const cls = color === 'gold'  ? 'stat-card__value--highlight'
            : color === 'green' ? 'stat-card__value--green'
            : color === 'blue'  ? 'stat-card__value--blue' : '';
  return (
    <div className="stat-card">
      <div className={`stat-card__value ${cls}`}>{value}</div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

// ── Stat grids per format × category ─────────────────────

function OdiBat({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No ODI batting data.</p>;
  return <div className="stats-cards">
    <StatCard label="Span"        value={s.span}             />
    <StatCard label="Matches"     value={fInt(s.matches)}    />
    <StatCard label="Innings"     value={fInt(s.innings)}    />
    <StatCard label="Not Out"     value={fInt(s.not_out)}    />
    <StatCard label="Runs"        value={fInt(s.runs)}       color="gold"  />
    <StatCard label="High Score"  value={fInt(s.high_score)} color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}      color="green" />
    <StatCard label="Balls Faced" value={fInt(s.balls_faced)}/>
    <StatCard label="Strike Rate" value={f1(s.strike_rate)}  color="blue"  />
    <StatCard label="100s"        value={fInt(s.hundreds)}   />
    <StatCard label="50s"         value={fInt(s.fifties)}    />
    <StatCard label="Ducks"       value={fInt(s.ducks)}      />
    <StatCard label="4s"          value={fInt(s.fours)}      />
    <StatCard label="6s"          value={fInt(s.sixes)}      />
  </div>;
}

function OdiBowl({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No ODI bowling data.</p>;
  return <div className="stats-cards">
    <StatCard label="Span"        value={s.span}             />
    <StatCard label="Balls"       value={fInt(s.balls)}      />
    <StatCard label="Wickets"     value={fInt(s.wickets)}    color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}      color="green" />
    <StatCard label="Economy"     value={f2(s.economy)}      color="blue"  />
    <StatCard label="Strike Rate" value={f1(s.strike_rate)}  />
  </div>;
}

function TestBat({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No Test batting data.</p>;
  return <div className="stats-cards">
    <StatCard label="Span"        value={s.span}             />
    <StatCard label="Matches"     value={fInt(s.matches)}    />
    <StatCard label="Innings"     value={fInt(s.innings)}    />
    <StatCard label="Runs"        value={fInt(s.runs)}       color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}      color="green" />
    <StatCard label="Strike Rate" value={f1(s.strike_rate)}  color="blue"  />
  </div>;
}

function TestBowl({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No Test bowling data.</p>;
  return <div className="stats-cards">
    <StatCard label="Wickets"     value={fInt(s.wickets)}   color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}     color="green" />
    <StatCard label="Economy"     value={f2(s.economy)}     color="blue"  />
    <StatCard label="Strike Rate" value={f1(s.strike_rate)} />
  </div>;
}

function T20Bat({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No T20 batting data.</p>;
  return <div className="stats-cards">
    <StatCard label="Runs"        value={fInt(s.runs)}      color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}     color="green" />
    <StatCard label="Strike Rate" value={f1(s.strike_rate)} color="blue"  />
    <StatCard label="4s"          value={fInt(s.fours)}     />
    <StatCard label="6s"          value={fInt(s.sixes)}     />
  </div>;
}

function T20Bowl({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No T20 bowling data.</p>;
  return <div className="stats-cards">
    <StatCard label="Wickets"     value={fInt(s.wickets)}   color="gold"  />
    <StatCard label="Average"     value={f2(s.average)}     color="green" />
    <StatCard label="Economy"     value={f2(s.economy)}     color="blue"  />
    <StatCard label="Strike Rate" value={f1(s.strike_rate)} />
  </div>;
}

function AllRound({ s }) {
  if (!s) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No all-round data.</p>;
  return <div className="stats-cards">
    <StatCard label="Runs"     value={fInt(s.runs)}       color="gold"  />
    <StatCard label="Wickets"  value={fInt(s.wickets)}    color="gold"  />
    <StatCard label="Bat Avg"  value={f2(s.batting_avg)}  color="green" />
    <StatCard label="Bowl Avg" value={f2(s.bowling_avg)}  color="blue"  />
  </div>;
}

// ── Page ─────────────────────────────────────────────────
const FORMAT_TABS = ['ODI', 'Test', 'T20'];
const CAT_TABS    = ['Batting', 'Bowling', 'All-round'];

export default function PlayerProfile() {
  const { id } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [fmt, setFmt]         = useState('ODI');
  const [cat, setCat]         = useState('Batting');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPlayerProfile(id)
      .then(setData)
      .catch(() => setError('Player not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader full text="Loading profile…" />;
  if (error) return (
    <div className="profile page-wrapper">
      <div className="container" style={{ textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ fontSize: 18, color: 'var(--text-secondary)', margin: '16px 0' }}>{error}</div>
        <Link to="/players" className="btn btn--ghost">← Back to Players</Link>
      </div>
    </div>
  );

  const { player, country, odi, test, t20 } = data;
  const displayName = player.full_name || player.name;

  function renderStats() {
    if (fmt === 'ODI') {
      if (cat === 'Batting')   return <OdiBat   s={odi?.batting}  />;
      if (cat === 'Bowling')   return <OdiBowl  s={odi?.bowling}  />;
      if (cat === 'All-round') return <AllRound s={odi?.allround} />;
    }
    if (fmt === 'Test') {
      if (cat === 'Batting')   return <TestBat  s={test?.batting}  />;
      if (cat === 'Bowling')   return <TestBowl s={test?.bowling}  />;
      if (cat === 'All-round') return <AllRound s={test?.allround} />;
    }
    if (fmt === 'T20') {
      if (cat === 'Batting')   return <T20Bat   s={t20?.batting}  />;
      if (cat === 'Bowling')   return <T20Bowl  s={t20?.bowling}  />;
      if (cat === 'All-round') return <AllRound s={t20?.allround} />;
    }
  }

  return (
    <div className="profile page-wrapper">
      <div className="container">
        <Link to="/players" className="profile__back">← Back to Players</Link>

        {/* ── Hero ── */}
        <div className="profile__hero">
          <ProfileAvatar name={displayName} imageUrl={player.image_url} />

          <div className="profile__identity">
            <h1 className="profile__name">{displayName}</h1>

            {/* "Also known as" when full_name differs from name */}
            {player.full_name && player.full_name !== player.name && (
              <p className="profile__aka">Also known as: {player.name}</p>
            )}

            <div className="profile__badges">
              {country?.name && (
                <span className="badge badge--country">
                  {country.image_url && <img className="badge__flag-img" src={country.image_url} alt={country.name} />}
                  {country.name}
                </span>
              )}
              {player.playing_role && (
                <span className="badge badge--role">{player.playing_role}</span>
              )}
              {player.gender && (
                <span className="badge badge--gender">{player.gender}</span>
              )}
            </div>

            <div className="profile__details">
              {player.batting_style && (
                <span className="profile__detail">
                  Batting: <strong>{player.batting_style}</strong>
                </span>
              )}
              {player.bowling_style && (
                <span className="profile__detail">
                  Bowling: <strong>{player.bowling_style}</strong>
                </span>
              )}
            </div>

            {/* Description */}
            {player.description && (
              <p className="profile__description">{player.description}</p>
            )}
          </div>
        </div>

        {/* ── Format selector ── */}
        <div className="profile__format-selector">
          {FORMAT_TABS.map((f) => (
            <button
              key={f}
              className={`profile__format-btn ${fmt === f ? 'active' : ''}`}
              onClick={() => setFmt(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── Category tabs ── */}
        <div className="profile__tabs">
          {CAT_TABS.map((c) => (
            <button
              key={c}
              className={`profile__tab ${cat === c ? 'active' : ''}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* ── Stats ── */}
        <div className="profile__stats-section">
          <div className="profile__stats-section-title">{fmt} — {cat}</div>
          {renderStats()}
        </div>

        {/* ── Cross-format summary ── */}
        <div className="profile__stats-section" style={{ marginTop: 32 }}>
          <div className="profile__stats-section-title">Format Overview — Runs &amp; Wickets</div>
          <div className="stats-cards">
            <StatCard label="ODI Runs"   value={fInt(odi?.batting?.runs)}    color="gold" />
            <StatCard label="ODI Wkts"   value={fInt(odi?.bowling?.wickets)} color="blue" />
            <StatCard label="Test Runs"  value={fInt(test?.batting?.runs)}   color="gold" />
            <StatCard label="Test Wkts"  value={fInt(test?.bowling?.wickets)}color="blue" />
            <StatCard label="T20 Runs"   value={fInt(t20?.batting?.runs)}    color="gold" />
            <StatCard label="T20 Wkts"   value={fInt(t20?.bowling?.wickets)} color="blue" />
          </div>
        </div>

      </div>
    </div>
  );
}


