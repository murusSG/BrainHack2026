export function LoadingSkeleton({ rows = 3, compact = false }) {
  return (
    <div className={`skeleton-list${compact ? ' skeleton-list-compact' : ''}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <span className="skeleton-line skeleton-line-short" />
          <span className="skeleton-line skeleton-line-long" />
          <span className="skeleton-line skeleton-line-mid" />
        </div>
      ))}
    </div>
  );
}

export function MapLoadingSkeleton({ label = 'Syncing live map feed' }) {
  return (
    <div className="map-loading-skeleton" role="status">
      <span className="map-loading-ring" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
