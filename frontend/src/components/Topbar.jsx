import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NOTIFICATIONS = [
  { id: 1, title: 'Mass Casualty Event — Jurong East', detail: 'SCDF activated 4 appliances. Command approval pending.', time: '2 min ago', tone: 'critical' },
  { id: 2, title: 'Hospital Capacity Alert — NTFGH', detail: 'General bed occupancy exceeded 90%. Surge protocol triggered.', time: '11 min ago', tone: 'warning' },
  { id: 3, title: 'Flood Sensor Threshold Breached', detail: 'Buona Vista canal water level at 1.8 m. Monitoring escalated.', time: '34 min ago', tone: 'info' },
];

export function Topbar({ session, onSignOut }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [topbarNotice, setTopbarNotice] = useState('Systems online');
  const [notifOpen, setNotifOpen] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const target = routeForQuery(query);
    const trimmed = query.trim();
    const path = trimmed ? `${target.path}?q=${encodeURIComponent(trimmed)}` : target.path;
    navigate(path);
    setTopbarNotice(target.notice);
  }

  return (
    <header className="topbar">
      <form className="searchbar" onSubmit={handleSubmit}>
        <span className="searchbar-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search incidents, resources, hospitals, or advisories..."
          aria-label="Search incidents, resources, hospitals, or advisories"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <kbd>Enter</kbd>
      </form>

      <div className="topbar-actions">
        <div className="system-pill">
          <span className="live-dot" />
          <span>{topbarNotice}</span>
        </div>
        <div className="notif-anchor">
          <button
            type="button"
            className="icon-button"
            aria-label="Notifications"
            aria-expanded={notifOpen}
            onClick={() => {
              setNotifOpen((prev) => !prev);
              setTopbarNotice('3 command notifications queued');
            }}
          >
            <span className="notification-glyph" aria-hidden="true" />
            <span className="notif-badge" aria-hidden="true">3</span>
          </button>
          {notifOpen && (
            <div className="notif-panel" role="dialog" aria-label="Notifications panel">
              <div className="notif-panel-header">
                <strong>Command Notifications</strong>
                <button type="button" className="ghost-button" onClick={() => setNotifOpen(false)}>Dismiss</button>
              </div>
              <ul className="notif-list">
                {NOTIFICATIONS.map((n) => (
                  <li key={n.id} className={`notif-item notif-item--${n.tone}`}>
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-detail">{n.detail}</div>
                    <div className="notif-item-time">{n.time}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
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
