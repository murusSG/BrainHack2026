import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Topbar({ session, onSignOut }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [topbarNotice, setTopbarNotice] = useState('Systems online');

  function handleSubmit(event) {
    event.preventDefault();
    const target = routeForQuery(query);
    navigate(target.path);
    setTopbarNotice(target.notice);
  }

  return (
    <header className="topbar">
      <form className="searchbar" onSubmit={handleSubmit}>
        <span className="searchbar-icon" aria-hidden="true">
          /
        </span>
        <input
          type="text"
          placeholder="Search incidents, resources, hospitals, or advisories..."
          aria-label="Search incidents, resources, hospitals, or advisories"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>

      <div className="topbar-actions">
        <div className="system-pill">
          <span className="live-dot" />
          <span>{topbarNotice}</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Notifications"
          onClick={() => setTopbarNotice('3 command notifications queued')}
        >
          !
        </button>
        <button
          type="button"
          className="profile-button"
          aria-label="User profile"
          onClick={() => setTopbarNotice(`${session?.identity ?? 'Dispatcher'} profile active`)}
        >
          {initialsFor(session?.identity)}
        </button>
        <button
          type="button"
          className="ghost-button topbar-link-button"
          onClick={() => navigate('/public-dashboard')}
        >
          Public
        </button>
        <button
          type="button"
          className="ghost-button topbar-link-button"
          onClick={() => {
            onSignOut?.();
            navigate('/login');
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function initialsFor(identity) {
  if (!identity) return 'DS';
  return (
    identity
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'DS'
  );
}

function routeForQuery(query) {
  const text = query.trim().toLowerCase();
  if (text.includes('hospital') || text.includes('bed') || text.includes('icu')) {
    return { path: '/hospitals', notice: 'Hospital view opened from search' };
  }

  if (text.includes('resource') || text.includes('ambulance') || text.includes('shelter')) {
    return { path: '/resources', notice: 'Resource view opened from search' };
  }

  if (text.includes('alert') || text.includes('advisory') || text.includes('notification')) {
    return { path: '/alerts', notice: 'Alerts view opened from search' };
  }

  if (text.includes('map') || text.includes('incident') || text.includes('flood')) {
    return { path: '/incident-map', notice: 'Incident map opened from search' };
  }

  return { path: '/', notice: text ? 'Overview opened from search' : 'Overview ready' };
}
