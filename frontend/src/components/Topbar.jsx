export function Topbar() {
  return (
    <header className="topbar">
      <label className="searchbar">
        <span className="searchbar-icon" aria-hidden="true">
          /
        </span>
        <input
          type="text"
          placeholder="Search incidents, resources, hospitals, or advisories..."
          aria-label="Search incidents, resources, hospitals, or advisories"
        />
      </label>

      <div className="topbar-actions">
        <div className="system-pill">
          <span className="live-dot" />
          <span>Systems online</span>
        </div>
        <button type="button" className="icon-button" aria-label="Notifications">
          !
        </button>
        <button type="button" className="profile-button" aria-label="User profile">
          DS
        </button>
      </div>
    </header>
  );
}
