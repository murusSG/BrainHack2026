import {
  alertDetail,
  alertResponders,
  alertsFeed,
  alertsPageMeta,
  broadcastSteps
} from '../data/dashboardData';
import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/api';

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
        <span className={`alert-status-pill ${alertStatusTone(item.status)}`}>{item.status}</span>
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

export function AlertsPage({ session }) {
  const location = useLocation();
  const routedDraft = location.state?.residentAlertDraft;
  const initialAlertId = alertsFeed.find((item) => item.active)?.id ?? alertsFeed[0]?.id;
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState(alertsPageMeta.tabs[0]);
  const [selectedAlertId, setSelectedAlertId] = useState(initialAlertId);
  const [statusOverrides, setStatusOverrides] = useState({});
  const [actionNotice, setActionNotice] = useState('');
  const [composerOpen, setComposerOpen] = useState(Boolean(location.state?.openResidentAlertComposer));
  const [publishState, setPublishState] = useState('idle');
  const [publishError, setPublishError] = useState('');
  const [publishedResidentAlert, setPublishedResidentAlert] = useState(null);
  const [publishForm, setPublishForm] = useState({
    title: routedDraft?.title ?? 'Flash flood advisory for Orchard Road residents',
    body: routedDraft?.body ?? 'Avoid basement links and use sheltered routes until the water recedes.',
    publicAction: routedDraft?.publicAction ?? 'Avoid the affected area and follow route diversions.',
    locationLabel: routedDraft?.locationLabel ?? 'Orchard Road',
    severity: routedDraft?.severity ?? 'danger',
    lat: routedDraft?.lat ?? '1.3048',
    lng: routedDraft?.lng ?? '103.8318',
    radiusMeters: routedDraft?.radiusMeters ?? '1200',
    smsEnabled: false,
    whatsappEnabled: false,
    telegramEnabled: false,
  });

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
            onClick={() => setComposerOpen((current) => !current)}
          >
            {alertsPageMeta.advisoryLabel}
          </button>
        </div>
      </section>

      {composerOpen && (
        <section className="alerts-composer-panel">
          <div className="alerts-composer-head">
            <h2>Publish resident alert</h2>
            <span>Citizen-safe wording only</span>
          </div>
          <div className="alerts-composer-grid">
            <label>
              <span>Title</span>
              <input
                value={publishForm.title}
                onChange={(event) => setPublishForm((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <label>
              <span>Location</span>
              <input
                value={publishForm.locationLabel}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, locationLabel: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Public action</span>
              <input
                value={publishForm.publicAction}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, publicAction: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Body</span>
              <textarea
                rows="3"
                value={publishForm.body}
                onChange={(event) => setPublishForm((current) => ({ ...current, body: event.target.value }))}
              />
            </label>
          </div>
          <div className="alerts-composer-row">
            <label>
              <span>Severity</span>
              <input
                value={publishForm.severity}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, severity: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Radius</span>
              <input
                value={publishForm.radiusMeters}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, radiusMeters: event.target.value }))
                }
              />
            </label>
            <label>
              <span>Latitude</span>
              <input
                value={publishForm.lat}
                onChange={(event) => setPublishForm((current) => ({ ...current, lat: event.target.value }))}
              />
            </label>
            <label>
              <span>Longitude</span>
              <input
                value={publishForm.lng}
                onChange={(event) => setPublishForm((current) => ({ ...current, lng: event.target.value }))}
              />
            </label>
          </div>
          <div className="alerts-channel-toggles" aria-label="External notification channels">
            <label className="alerts-channel-toggle">
              <input
                type="checkbox"
                checked={publishForm.smsEnabled}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, smsEnabled: event.target.checked }))
                }
              />
              <span>
                SMS
                <small>Uses SMS_DEMO_RECIPIENTS.</small>
              </span>
            </label>
            <label className="alerts-channel-toggle">
              <input
                type="checkbox"
                checked={publishForm.whatsappEnabled}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, whatsappEnabled: event.target.checked }))
                }
              />
              <span>
                WhatsApp
                <small>Uses WHATSAPP_DEMO_RECIPIENTS.</small>
              </span>
            </label>
            <label className="alerts-channel-toggle">
              <input
                type="checkbox"
                checked={publishForm.telegramEnabled}
                onChange={(event) =>
                  setPublishForm((current) => ({ ...current, telegramEnabled: event.target.checked }))
                }
              />
              <span>
                Telegram
                <small>Uses TELEGRAM_DEMO_CHAT_IDS.</small>
              </span>
            </label>
          </div>
          <div className="alerts-composer-actions">
            <button
              type="button"
              className="primary-button"
              disabled={publishState === 'publishing'}
              onClick={async () => {
                setPublishState('publishing');
                setPublishError('');
                try {
                  const published = await api.publishResidentAlert({
                    title: publishForm.title,
                    body: publishForm.body,
                    publicAction: publishForm.publicAction,
                    locationLabel: publishForm.locationLabel,
                    severity: publishForm.severity,
                    lat: Number(publishForm.lat),
                    lng: Number(publishForm.lng),
                    radiusMeters: Number(publishForm.radiusMeters),
                    smsEnabled: publishForm.smsEnabled,
                    whatsappEnabled: publishForm.whatsappEnabled,
                    telegramEnabled: publishForm.telegramEnabled,
                  }, session?.token);
                  setPublishState('done');
                  setPublishedResidentAlert(published);
                  setComposerOpen(false);
                  setActionNotice(`Resident alert published for ${published.locationLabel}.`);
                } catch (err) {
                  setPublishState('error');
                  setPublishError(err.message);
                }
              }}
            >
              {publishState === 'publishing' ? 'Publishing' : 'Publish to residents'}
            </button>
            <button type="button" className="ghost-button" onClick={() => setComposerOpen(false)}>
              Cancel
            </button>
          </div>
          {publishError && <p className="alert-action-notice">{publishError}</p>}
          {publishedResidentAlert && (
            <div className="alerts-lifecycle-actions">
              <span>Resident alert: {publishedResidentAlert.status}</span>
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  setPublishState('publishing');
                  setPublishError('');
                  try {
                    const updated = await api.updateResidentAlert(
                      publishedResidentAlert.id,
                      {
                        status: 'updated',
                        body: `${publishForm.body} Updated guidance has been confirmed by command.`,
                        publicAction: publishForm.publicAction,
                      },
                      session?.token
                    );
                    setPublishedResidentAlert(updated);
                    setPublishState('done');
                    setActionNotice(`Resident alert updated for ${updated.locationLabel}.`);
                  } catch (err) {
                    setPublishState('error');
                    setPublishError(err.message);
                  }
                }}
              >
                Update guidance
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={async () => {
                  setPublishState('publishing');
                  setPublishError('');
                  try {
                    const resolved = await api.updateResidentAlert(
                      publishedResidentAlert.id,
                      {
                        status: 'resolved',
                        body: 'The immediate hazard has cleared. Continue to avoid any closed routes until agencies reopen them.',
                        publicAction: 'All clear for immediate danger. Follow posted route closures.',
                        severity: 'info',
                      },
                      session?.token
                    );
                    setPublishedResidentAlert(resolved);
                    setPublishState('done');
                    setActionNotice(`All-clear issued for ${resolved.locationLabel}.`);
                  } catch (err) {
                    setPublishState('error');
                    setPublishError(err.message);
                  }
                }}
              >
                Issue all-clear
              </button>
            </div>
          )}
        </section>
      )}

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
            <div className="alerts-detail-copy">
              <div className="alerts-case-row">
                <span className={`alert-severity-pill severity-${selectedDetail.severity}`}>
                  {selectedDetail.severity}
                </span>
                <span className="alerts-case-id">CASE ID: {selectedDetail.caseId}</span>
                <span className={`alert-status-pill ${alertStatusTone(selectedAlert.status)}`}>
                  {selectedAlert.status}
                </span>
              </div>
              <h2>{selectedDetail.title}</h2>
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

            <p className="alerts-summary">{selectedDetail.summary}</p>
            {actionNotice ? <p className="alert-action-notice">{actionNotice}</p> : null}
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

function alertStatusTone(status) {
  const normalized = String(status ?? '').toLowerCase();
  if (
    normalized.includes('unacknowledged') ||
    normalized.includes('unbroadcasted') ||
    normalized.includes('escalated') ||
    normalized.includes('critical')
  ) {
    return 'status-urgent';
  }

  if (
    normalized.includes('acknowledged') ||
    normalized.includes('broadcasted') ||
    normalized.includes('resolved')
  ) {
    return 'status-stable';
  }

  return 'status-neutral';
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
