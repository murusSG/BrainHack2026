import {
  alertDetail,
  alertResponders,
  alertsFeed,
  alertsPageMeta,
  broadcastSteps
} from '../data/dashboardData';
import { OneMapPreviewMap } from '../components/OneMapPreviewMap';

function AlertFeedCard({ item }) {
  return (
    <article className={`alert-feed-card ${item.active ? 'active' : ''}`}>
      <div className="alert-feed-top">
        <p className="alert-feed-id">{item.id}</p>
        <span className={`alert-severity-pill severity-${item.severity}`}>{item.severity}</span>
      </div>
      <h3>{item.title}</h3>
      <p className="alert-feed-meta">
        {item.region} <span>•</span> {item.timeAgo}
      </p>
      <div className="alert-feed-bottom">
        <p>Source: {item.source}</p>
        <span className="alert-status-pill">{item.status}</span>
      </div>
    </article>
  );
}

function SpatialMapCard() {
  const points = [
    {
      query: 'Orchard Road, Singapore',
      title: alertDetail.title,
      description: alertDetail.summary,
      tone: 'critical',
      radiusMeters: 900,
      fallbackLatitude: 1.3048,
      fallbackLongitude: 103.8318
    },
    {
      query: 'Stamford Diversion Canal, Singapore',
      title: 'Sensor source area',
      description: 'Water level monitoring point.',
      tone: 'warning',
      fallbackLatitude: 1.2938,
      fallbackLongitude: 103.8523
    }
  ];

  return (
    <div className="spatial-map-card">
      <OneMapPreviewMap className="alerts-onemap-preview" points={points} zoom={13} />
      <div className="spatial-map-label">{alertDetail.mapLabel}</div>
    </div>
  );
}

export function AlertsPage() {
  return (
    <div className="alerts-page">
      <section className="alerts-topbar">
        <div className="alerts-title-group">
          <h1>{alertsPageMeta.title}</h1>
          <span className="alerts-critical-pill">{alertsPageMeta.criticalActive}</span>
        </div>

        <div className="alerts-top-actions">
          <label className="alerts-filter-search">
            <span className="searchbar-icon" aria-hidden="true">
              +
            </span>
            <input
              type="text"
              placeholder={alertsPageMeta.filterPlaceholder}
              aria-label="Filter alert feed"
            />
          </label>
          <button type="button" className="ghost-button">
            {alertsPageMeta.filterLabel}
          </button>
          <button type="button" className="primary-button">
            {alertsPageMeta.advisoryLabel}
          </button>
        </div>
      </section>

      <section className="alerts-layout">
        <aside className="alerts-feed-panel">
          <div className="alerts-tabs">
            {alertsPageMeta.tabs.map((tab, index) => (
              <button key={tab} type="button" className={`alerts-tab ${index === 0 ? 'active' : ''}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="alerts-feed-list">
            {alertsFeed.map((item) => (
              <AlertFeedCard key={item.id} item={item} />
            ))}
          </div>
        </aside>

        <section className="alerts-detail-panel">
          <div className="alerts-detail-head">
            <div>
              <div className="alerts-case-row">
                <span className="alert-severity-pill severity-critical">{alertDetail.severity}</span>
                <span className="alerts-case-id">{alertsPageMeta.caseLabel}</span>
              </div>
              <h2>{alertDetail.title}</h2>
              <p className="alerts-summary">{alertDetail.summary}</p>
            </div>

            <div className="alerts-detail-actions">
              <button type="button" className="primary-button detail-action-button">
                Acknowledge Alert
              </button>
              <button type="button" className="ghost-button detail-action-button">
                Escalate to Command
              </button>
            </div>
          </div>

          <div className="alert-facts-grid">
            {alertDetail.facts.map((fact) => (
              <article key={fact.label} className="alert-fact-card">
                <p>{fact.label}</p>
                <strong>{fact.value}</strong>
              </article>
            ))}
          </div>

          <div className="alert-context-grid">
            <div className="alert-context-left">
              <div className="alert-section-title">Spatial Context & Proximity</div>
              <SpatialMapCard />
            </div>

            <aside className="alert-responders-panel">
              <div className="alert-section-title">Responders En Route</div>
              <div className="alert-responders-list">
                {alertResponders.map((responder) => (
                  <article key={responder.team} className="responder-card">
                    <div>
                      <h3>{responder.team}</h3>
                      <p>{responder.role}</p>
                    </div>
                    <span className="responder-eta">{responder.eta}</span>
                  </article>
                ))}
              </div>
              <button type="button" className="inline-link responders-link">
                View All Resources
              </button>
            </aside>
          </div>

          <section className="broadcast-center-panel">
            <div className="broadcast-center-head">
              <h3>{alertsPageMeta.registryTitle}</h3>
              <button type="button" className="inline-link">
                {alertsPageMeta.smartTemplate}
              </button>
            </div>

            <div className="broadcast-steps">
              {broadcastSteps.map((step) => (
                <article key={step} className="broadcast-step-card">
                  <span className="broadcast-step-index" aria-hidden="true">
                    {step.split('.')[0]}
                  </span>
                  <p>{step}</p>
                </article>
              ))}
            </div>
          </section>
        </section>
      </section>
    </div>
  );
}
