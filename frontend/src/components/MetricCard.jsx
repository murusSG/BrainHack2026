export function MetricCard({ label, value, delta, tone, loading = false }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <p className="metric-label">{label}</p>
      <div className="metric-row">
        {loading ? (
          <span className="metric-value metric-value-skeleton" aria-hidden="true" />
        ) : (
          <p className="metric-value">{value}</p>
        )}
        <span className="metric-icon" aria-hidden="true" />
      </div>
      <p className="metric-delta">{delta}</p>
    </article>
  );
}
