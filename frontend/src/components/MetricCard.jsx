export function MetricCard({ label, value, delta, tone, loading = false }) {
  const iconClass = metricIconClass(label);

  return (
    <article className={`metric-card ui-surface tone-${tone}`}>
      <p className="metric-label">{label}</p>
      <div className="metric-row">
        {loading ? (
          <span className="metric-value metric-value-skeleton" aria-hidden="true" />
        ) : (
          <p className="metric-value">{value}</p>
        )}
        <span className={`metric-icon ${iconClass}`} aria-hidden="true" />
      </div>
      <p className="metric-delta">{delta}</p>
    </article>
  );
}

function metricIconClass(label) {
  const normalised = label.toLowerCase();
  if (normalised.includes('incident')) return 'metric-icon-shield';
  if (normalised.includes('case')) return 'metric-icon-pulse';
  if (normalised.includes('icu') || normalised.includes('bed')) return 'metric-icon-bed';
  if (normalised.includes('ambulance')) return 'metric-icon-fleet';
  if (normalised.includes('volunteer')) return 'metric-icon-people';
  return 'metric-icon-pulse';
}
