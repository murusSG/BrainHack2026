function formatRoleLabel(role) {
  if (!role) return 'Operations';

  return role
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function Topbar({ currentRole, identity, onOpenPublicDashboard, onSignOut }) {
  return (
    <header className="topbar">
      <label className="searchbar">
        <span className="searchbar-icon" aria-hidden="true">
          +
        </span>
        <input
          type="text"
          placeholder="Search incidents, resources, hospitals, or advisories..."
          aria-label="Search incidents, resources, hospitals, or advisories"
        />
      </label>

      <div className="topbar-actions">
        <div className="pill role-pill">
          <span>{formatRoleLabel(currentRole)}</span>
          {identity ? <span className="role-pill-detail">{identity}</span> : null}
        </div>
        <button type="button" className="ghost-button" onClick={() => onOpenPublicDashboard?.()}>
          Public view
        </button>
        <div className="system-pill">
          <span className="live-dot" />
          <span>Systems online</span>
        </div>
        <button type="button" className="ghost-button" onClick={() => onSignOut?.()}>
          Sign out
        </button>
        <button type="button" className="icon-button" aria-label="Notifications">
          1
        </button>
        <button type="button" className="profile-button" aria-label="User profile">
          DS
        </button>
      </div>
    </header>
  );
}
