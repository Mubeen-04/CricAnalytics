import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navbar.css';

const navItems = [
  { path: '/',              label: 'Home',    icon: '⚡' },
  { path: '/players',       label: 'Players', icon: '🏏' },
  { path: '/rankings',      label: 'Rankings',icon: '🏆' },
  { path: '/compare',       label: 'Compare', icon: '⚖️'  },
  { path: '/team-builder',  label: 'XI',      icon: '🧩' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar__inner">
          <NavLink to="/" className="navbar__logo" onClick={() => setOpen(false)}>
            <div className="navbar__logo-icon">🏏</div>
            <span className="navbar__logo-text">CRIC<span>ANALYTICS</span></span>
          </NavLink>

          <ul className="navbar__nav">
            {navItems.map(({ path, label, icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  end={path === '/'}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  <span className="nav-icon">{icon}</span>
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <button
            className="navbar__menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      <div className={`navbar__mobile-menu ${open ? 'open' : ''}`}>
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
            onClick={() => setOpen(false)}
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </div>
    </>
  );
}
