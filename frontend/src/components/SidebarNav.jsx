import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { id: 'overview', label: 'Overview', path: '/', icon: 'overview' },
  { id: 'incident-map', label: 'Incident Map', path: '/incident-map', icon: 'map' },
  { id: 'resources', label: 'Resources', path: '/resources', icon: 'resources' },
  { id: 'hospitals', label: 'Hospitals', path: '/hospitals', icon: 'hospitals' },
  { id: 'alerts', label: 'Alerts', path: '/alerts', icon: 'alerts' },
];

export function SidebarNav() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="brand-block">
        <div className="brand-mark">M</div>
        <div>
          <p className="brand-name">MURUS</p>
          <p className="brand-name accent">SG</p>
        </div>
      </div>

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
        <Link to="/responder" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-responder" aria-hidden="true" />
          <span>Responder View</span>
        </Link>
        <Link to="/resident" className="nav-item persona-jump">
          <span className="nav-icon nav-icon-resident" aria-hidden="true" />
          <span>Resident View</span>
        </Link>
      </div>
    </aside>
  );
}
