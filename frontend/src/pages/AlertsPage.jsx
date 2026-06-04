import {
  alertDetail,
  alertResponders,
  alertsFeed,
  alertsPageMeta,
  broadcastSteps
} from '../data/dashboardData';
import { useMemo, useState } from 'react';

function AlertFeedCard({ item, selected, onSelect }) {
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(item.id);
    }
  }

  return (
    <article
      className={`alert-feed-card ${selected ? 'active' : ''}`}
      onClick={() => onSelect(item.id)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
    >
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
  return (
    <div className="spatial-map-card">
      <div className="spatial-grid" />
      <div className="spatial-sg-shape" />
      <div className="spatial-alert-zone outer" />
      <div className="spatial-alert-zone middle" />
      <div className="spatial-alert-zone core" />
      <div className="spatial-map-label">{alertDetail.mapLabel}</div>
    </div>
  );
}

export function AlertsPage() {
  const initialAlertId = alertsFeed.find((item) => item.active)?.id ?? alertsFeed[0]?.id;
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(alertsPageMeta.tabs[0]);
  const [selectedAlertId, setSelectedAlertId] = useState(initialAlertId);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [actionNotice, setActionNotice] = useState('Alert feed ready for dispatcher review.');

  const alertsWithStatus = useMemo(
    () =>
      alertsFeed.map((item) => ({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      })),
    [statusOverrides]
  );

  const selectedAlert =
    alertsWithStatus.find((item) => item.id === selectedAlertId) ?? alertsWithStatus[0];
  const selectedDetail = buildAlertDetail(selectedAlert);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return alertsWithStatus.filter((item) => {
      const matchesTab =
        activeTab === 'All Alerts' ||
        (activeTab === 'Critical Only' && item.severity === 'critical') ||
        (activeTab === 'By Region' && item.region === selectedAlert.region) ||
        (activeTab === 'Unacknowledged' && item.status === 'unacknowledged');
      const searchable = [item.id, item.title, item.region, item.source, item.status, item.severity]
        .join(' ')
        .toLowerCase();

      return matchesTab && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [activeTab, alertsWithStatus, query, selectedAlert.region]);

  function updateSelectedStatus(status) {
    setStatusOverrides((current) => ({
      ...current,
      [selectedAlert.id]: status,
    }));
  }

  function handleAcknowledge() {
    updateSelectedStatus('acknowledged');
    setActionNotice(`${selectedAlert.id} acknowledged and kept in the command feed.`);
  }

  function handleEscalate() {
    updateSelectedStatus('escalated');
    setActionNotice(`${selectedAlert.id} escalated to command review.`);
  }

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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setActiveTab('Unacknowledged')}
          >
            {alertsPageMeta.filterLabel}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => setActionNotice('New advisory draft staged from the selected alert.')}
          >
            {alertsPageMeta.advisoryLabel}
          </button>
        </div>
      </section>

      <section className="alerts-layout">
        <aside className="alerts-feed-panel">
          <div className="alerts-tabs">
            {alertsPageMeta.tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                className={`alerts-tab ${tab === activeTab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="alerts-feed-list">
            {filteredAlerts.map((item) => (
              <AlertFeedCard
                key={item.id}
                item={item}
                selected={item.id === selectedAlert.id}
                onSelect={(id) => {
                  setSelectedAlertId(id);
                  setActionNotice(`${id} loaded into the detail pane.`);
                }}
              />
            ))}
            {filteredAlerts.length === 0 && (
              <p className="alert-empty-state">No alerts match this view.</p>
            )}
          </div>
        </aside>

        <section className="alerts-detail-panel">
          <div className="alerts-detail-head">
            <div>
              <div className="alerts-case-row">
                <span className={`alert-severity-pill severity-${selectedDetail.severity}`}>
                  {selectedDetail.severity}
                </span>
                <span className="alerts-case-id">CASE ID: {selectedDetail.caseId}</span>
                <span className="alert-status-pill">{selectedAlert.status}</span>
              </div>
              <h2>{selectedDetail.title}</h2>
              <p className="alerts-summary">{selectedDetail.summary}</p>
              <p className="alert-action-notice">{actionNotice}</p>
            </div>

            <div className="alerts-detail-actions">
              <button
                type="button"
                className="primary-button detail-action-button"
                onClick={handleAcknowledge}
              >
                Acknowledge Alert
              </button>
              <button
                type="button"
                className="ghost-button detail-action-button"
                onClick={handleEscalate}
              >
                Escalate to Command
              </button>
            </div>
          </div>

          <div className="alert-facts-grid">
            {selectedDetail.facts.map((fact) => (
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
              <button
                type="button"
                className="inline-link"
                onClick={() =>
                  setActionNotice(`Smart broadcast template applied for ${selectedAlert.id}.`)
                }
              >
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

function buildAlertDetail(item) {
  if (!item) {
    return alertDetail;
  }

  if (item.id === alertDetail.caseId) {
    return {
      ...alertDetail,
      severity: item.severity,
      facts: [
        ...alertDetail.facts.slice(0, 2),
        { label: 'Current status', value: item.status },
        { label: 'Data source', value: item.source },
      ],
    };
  }

  return {
    severity: item.severity,
    caseId: item.id,
    title: item.title,
    summary: `${item.source} reported ${item.title.toLowerCase()} in ${item.region}. Current command status is ${item.status}.`,
    facts: [
      { label: 'Incident location', value: item.region },
      { label: 'Time detected', value: item.timeAgo },
      { label: 'Current status', value: item.status },
      { label: 'Data source', value: item.source },
    ],
    mapLabel: alertDetail.mapLabel,
  };
}
