export function MetricCard({ label, value, delta, tone }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <p className="metric-label">{label}</p>
      <div className="metric-row">
        <p className="metric-value">{value}</p>
        <span className="metric-icon" aria-hidden="true" />
      </div>
      <p className="metric-delta">{delta}</p>
    </article>
  );
}
