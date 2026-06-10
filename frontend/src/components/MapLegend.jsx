const DEFAULT_ITEMS = [
  { label: 'Critical', tone: 'critical' },
  { label: 'High priority', tone: 'high' },
  { label: 'Support / dispatched', tone: 'support' },
  { label: 'Selected vicinity', tone: 'radius' },
];

export function MapLegend({ items = DEFAULT_ITEMS, compact = false }) {
  return (
    <div
      className={`operational-map-legend${compact ? ' is-compact' : ''}`}
      aria-label="Map status legend"
    >
      {items.map((item) => (
        <span key={item.label} className="operational-map-legend-item">
          <span className={`operational-map-swatch is-${item.tone}`} aria-hidden="true" />
          {item.label}
        </span>
      ))}
    </div>
  );
}
