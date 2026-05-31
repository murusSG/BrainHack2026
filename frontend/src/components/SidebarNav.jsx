import { navigationItems } from '../data/dashboardData';

export function SidebarNav() {
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
        {navigationItems.map((item, index) => (
          <button
            key={item}
            type="button"
            className={`nav-item ${index === 0 ? 'active' : ''}`}
            aria-current={index === 0 ? 'page' : undefined}
          >
            <span className="nav-icon" aria-hidden="true" />
            <span>{item}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
