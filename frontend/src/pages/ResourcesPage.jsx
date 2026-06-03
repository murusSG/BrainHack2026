import {
  interAgencyRequestForm,
  resourceLedgerTabs,
  resourceShortageAlert,
  resourceTrend
} from '../data/dashboardData';
import { useScdfResources } from '../hooks/useScdfResources';

function resourceSymbol(icon) {
  if (icon === 'fleet') {
    return 'fleet';
  }

  if (icon === 'water') {
    return 'water';
  }

  if (icon === 'shelter') {
    return 'home';
  }

  return 'beds';
}

function buildTrendPath(values, max, height) {
  const width = 100;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

function buildTrendArea(values, max, height) {
  const width = 100;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

export function ResourcesPage() {
  const { status, error, summaryCards, ledgerEntries, ledgerMeta } = useScdfResources();
  const chartHeight = 100;
  const stockPath = buildTrendPath(resourceTrend.currentStock, resourceTrend.yMax, chartHeight);
  const stockArea = buildTrendArea(resourceTrend.currentStock, resourceTrend.yMax, chartHeight);
  const demandPath = buildTrendPath(resourceTrend.projectedDemand, resourceTrend.yMax, chartHeight);
  const syncLabel =
    status === 'loading'
      ? 'Syncing SCDF'
      : status === 'error'
        ? 'Planning fallback'
        : ledgerMeta.syncStatus;

  return (
    <div className="resources-page">
      <section className="hero-panel resource-hero">
        <div>
          <h1>Resource Availability</h1>
          <p className="hero-copy">
            Real-time inventory and capacity monitoring across Singapore agencies.
          </p>
        </div>
        <div className="hero-actions">
          <span className="pill">{syncLabel}</span>
          <button type="button" className="ghost-button">
            Export Report
          </button>
          <button type="button" className="ghost-button">
            Filters
          </button>
          <button type="button" className="primary-button">
            Log View
          </button>
        </div>
      </section>

      {status === 'error' && (
        <p className="feed-warning">
          SCDF public resource feed unavailable ({error}). Showing planning defaults.
        </p>
      )}

      <section className="resource-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="resource-summary-card">
            <div className="resource-card-top">
              <span className={`resource-icon icon-${resourceSymbol(card.icon)}`} aria-hidden="true" />
              <span className={`resource-change tone-${card.tone}`}>{card.change}</span>
            </div>
            <h3>{card.label}</h3>
            <p className="resource-card-value">{card.value}</p>
            <p className="resource-card-detail">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="resource-main-grid">
        <div className="resource-left-column">
          <section className="panel resource-chart-panel">
            <div className="resource-chart-heading">
              <div>
                <h2>{resourceTrend.title}</h2>
                <p>{resourceTrend.subtitle}</p>
              </div>
              <button type="button" className="ghost-button compact-button">
                {resourceTrend.timeframe}
              </button>
            </div>

            <div className="resource-chart-shell">
              <div className="resource-axis-column">
                {[6000, 4500, 3000, 1500, 0].map((tick) => (
                  <span key={tick}>{tick}</span>
                ))}
              </div>

              <div className="resource-chart-stage">
                <div className="resource-grid-lines" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((line) => (
                    <span key={line} />
                  ))}
                </div>

                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="resource-chart-svg">
                  <path d={stockArea} className="resource-area-fill" />
                  <path d={stockPath} className="resource-line stock-line" />
                  <path d={demandPath} className="resource-line demand-line" />
                </svg>

                <div className="resource-x-axis">
                  {resourceTrend.labels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="resource-chart-legend">
              <span className="legend-inline">
                <span className="legend-dot stock" aria-hidden="true" />
                Current Stock
              </span>
              <span className="legend-inline">
                <span className="legend-dot demand" aria-hidden="true" />
                Projected Demand
              </span>
            </div>
          </section>

          <section className="panel resource-ledger-panel">
            <div className="resource-ledger-head">
              <div>
                <h2>{ledgerMeta.title}</h2>
                <p>{ledgerMeta.subtitle}</p>
              </div>
              <label className="resource-ledger-search">
                <span className="searchbar-icon" aria-hidden="true">
                  +
                </span>
                <input
                  type="text"
                  placeholder={ledgerMeta.searchPlaceholder}
                  aria-label="Search resource ledger"
                />
              </label>
            </div>

            <div className="resource-ledger-tabs">
              {resourceLedgerTabs.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`resource-tab ${index === 0 ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="resource-ledger-table">
              <div className="resource-ledger-row resource-ledger-header">
                <span>Unit ID</span>
                <span>Type</span>
                <span>Base Station</span>
                <span>Crew</span>
                <span>Battery / Fuel</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              {ledgerEntries.map((entry) => (
                <div key={entry.unitId} className="resource-ledger-row">
                  <span className="ledger-strong">{entry.unitId}</span>
                  <span>{entry.type}</span>
                  <span>{entry.baseStation}</span>
                  <span>{entry.crew}</span>
                  <span className="battery-cell">
                    <span className="battery-bar">
                      <span style={{ width: `${entry.capacity}%` }} />
                    </span>
                    <span>{entry.capacity}%</span>
                  </span>
                  <span>
                    <span className={`ledger-status status-${entry.statusTone}`}>{entry.status}</span>
                  </span>
                  <button type="button" className="ledger-menu-button" aria-label={`Actions for ${entry.unitId}`}>
                    ⋮
                  </button>
                </div>
              ))}
            </div>

            <div className="resource-ledger-footer">
              <span>{ledgerMeta.syncStatus}</span>
              <button type="button" className="inline-link">
                {ledgerMeta.auditLabel}
              </button>
            </div>
          </section>

          <section className="resource-alert-banner">
            <div className="resource-alert-icon" aria-hidden="true">
              !
            </div>
            <div className="resource-alert-copy">
              <h2>{resourceShortageAlert.title}</h2>
              <p>{resourceShortageAlert.message}</p>
              <div className="resource-alert-actions">
                <button type="button" className="alert-primary">
                  Initiate Transfer
                </button>
                <button type="button" className="alert-secondary">
                  Ignore
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="resource-right-column">
          <section className="resource-request-panel">
            <div className="section-heading light">
              <div>
                <h2>{interAgencyRequestForm.title}</h2>
                <p>{interAgencyRequestForm.subtitle}</p>
              </div>
            </div>

            <div className="resource-form-grid">
              <label className="resource-field full">
                <span>Resource Type</span>
                <select defaultValue={interAgencyRequestForm.resourceTypes[0]}>
                  {interAgencyRequestForm.resourceTypes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="resource-field">
                <span>Quantity</span>
                <input type="number" defaultValue="0" />
              </label>

              <label className="resource-field">
                <span>Priority Level</span>
                <select defaultValue={interAgencyRequestForm.priorities[0]}>
                  {interAgencyRequestForm.priorities.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="resource-field full">
                <span>Reason for Request</span>
                <textarea
                  rows="4"
                  placeholder="Describe the incident requirements..."
                  defaultValue=""
                />
              </label>
            </div>

            <button type="button" className="resource-submit-button">
              + Submit Request
            </button>
          </section>
        </aside>
      </section>
    </div>
  );
}
