import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { id: 'overview', label: 'Overview', path: '/' },
  { id: 'incident-map', label: 'Incident Map', path: '/incident-map' },
  { id: 'resources', label: 'Resources', path: '/resources' },
  { id: 'hospitals', label: 'Hospitals', path: '/hospitals' },
  { id: 'alerts', label: 'Alerts', path: '/alerts' },
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
              <span className="nav-icon" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick jump to the public resident view — handy for the demo */}
      <Link to="/resident" className="nav-item" style={{ marginTop: 'auto' }}>
        <span className="nav-icon" aria-hidden="true" />
        <span>Resident View ↗</span>
      </Link>
    </aside>
  );
}