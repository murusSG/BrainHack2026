import { Link, useLocation } from 'react-router-dom';
import { AppLogo } from './AppLogo';

const navItems = [
  { id: 'overview', label: 'Overview', path: '/overview', icon: 'overview' },
  { id: 'incident-map', label: 'Incident Map', path: '/incident-map', icon: 'map' },
  { id: 'resources', label: 'Resources', path: '/resources', icon: 'resources' },
  { id: 'hospitals', label: 'Hospitals', path: '/hospitals', icon: 'hospitals' },
  { id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'alerts' },
  { id: 'system-flow', label: 'System Flow', path: '/system-flow', icon: 'system' },
];

export function SidebarNav() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <Link to="/overview" className="brand-block" aria-label="MURUS SG overview">
        <AppLogo variant="sidebar" />
      </Link>

      <p className="nav-section-label">Operations</p>
      <nav className="nav-list" aria-label="Primary">
        {navItems.map((item) => {
          const isActive =
            item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <span className={`nav-icon nav-icon-${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="persona-jump-list">
        <p className="nav-section-label">Persona views</p>
        <Link to="/dispatcher" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-responder" aria-hidden="true" />
          <span>Dispatcher View</span>
        </Link>
        <Link to="/responder" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-responder" aria-hidden="true" />
          <span>Responder View</span>
        </Link>
        <Link to="/resident" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-resident" aria-hidden="true" />
          <span>Resident View</span>
        </Link>
        <Link to="/public-dashboard" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-resident" aria-hidden="true" />
          <span>Public Dashboard</span>
        </Link>
        <div className="sidebar-status-card">
          <span className="live-dot" />
          <div>
            <strong>Command services online</strong>
            <small>Realtime feeds and approvals active</small>
          </div>
        </div>
      </div>
    </aside>
  );
}
