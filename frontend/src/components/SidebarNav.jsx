import { navigationItems } from '../data/dashboardData';

export function SidebarNav({ activePage, onSelectPage }) {
  const implementedPages = new Set([
    'overview',
    'incident-map',
    'resources',
    'hospitals',
    'alerts'
  ]);

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
        {navigationItems.map((item) => {
          const isImplemented = implementedPages.has(item.id);

          return (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${activePage === item.id ? 'active' : ''} ${!isImplemented ? 'disabled' : ''}`}
            aria-current={activePage === item.id ? 'page' : undefined}
            onClick={() => isImplemented && onSelectPage?.(item.id)}
            disabled={!isImplemented}
          >
            <span className="nav-icon" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
          );
        })}
      </nav>
    </aside>
  );
}
