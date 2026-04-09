// Player model fields:
//   id, name, full_name, gender, batting_style, bowling_style,
//   playing_role, country_id, image_url

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PlayerCard.css';

// country_id → { name, flag emoji }
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

function initials(name = '') {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function roleCls(role = '') {
  const r = role.toLowerCase();
  if (r.includes('bowl'))                                 return 'player-card__role--bowler';
  if (r.includes('allround') || r.includes('all-round')) return 'player-card__role--allrounder';
  if (r.includes('keeper') || r.includes('wicket'))      return 'player-card__role--keeper';
  return '';
}

function normalizeCountryName(value = '') {
  return value.replace(/^\s*[A-Z]{2,3}\s+/, '').trim();
}

function Avatar({ name, imageUrl }) {
  const [imgError, setImgError] = useState(false);
  if (imageUrl && !imgError) {
    return (
      <div className="player-card__avatar">
        <img src={imageUrl} alt={name} onError={() => setImgError(true)} />
      </div>
    );
  }
  return (
    <div className="player-card__avatar player-card__avatar--initials">
      {initials(name)}
    </div>
  );
}

export default function PlayerCard({ player, showId = true }) {
  const navigate = useNavigate();
  const { id, name, playing_role, batting_style, bowling_style, country_id, image_url } = player;
  const country = COUNTRIES[country_id];
  const countryName = normalizeCountryName(country?.name || '');

  return (
    <div className="player-card" onClick={() => navigate(`/players/${id}`)}>
      <div className="player-card__header">
        <Avatar name={name} imageUrl={image_url} />
        <div className="player-card__info">
          <div className="player-card__name">{name}</div>
          <div className="player-card__meta">
            {countryName && <span className="player-card__country">{countryName}</span>}
          </div>
          {playing_role && (
            <span className={`player-card__role ${roleCls(playing_role)}`}>
              {playing_role}
            </span>
          )}
        </div>
      </div>

      <div className={`player-card__stats ${showId ? '' : 'player-card__stats--two'}`}>
        <div className="player-card__stat">
          <div className="player-card__stat-value player-card__stat-value--style">
            {batting_style || '—'}
          </div>
          <div className="player-card__stat-label">Bat Style</div>
        </div>
        <div className="player-card__stat">
          <div className="player-card__stat-value player-card__stat-value--style">
            {bowling_style || '—'}
          </div>
          <div className="player-card__stat-label">Bowl Style</div>
        </div>
        {showId && (
          <div className="player-card__stat">
            <div className="player-card__stat-value player-card__stat-value--id mono">
              #{id}
            </div>
            <div className="player-card__stat-label">Player ID</div>
          </div>
        )}
      </div>
    </div>
  );
}
