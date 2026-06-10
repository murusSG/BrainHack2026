import {
  alertDetail,
  alertsFeed,
  alertsPageMeta
} from '../data/dashboardData';
import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ScreenHeader, ScreenPage, ScreenPanel } from '../components/ui';
import { api } from '../services/api';

function AlertFeedCard({ item, selected, onSelect }) {
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(item.id);
    }
  }

  return (
    <ScreenPanel
      as="article"
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
      <div className="alert-feed-bottom">
        <span className={`alert-status-pill ${alertStatusTone(item.status)}`}>{item.status}</span>
      </div>
    </ScreenPanel>
  );
}

export function AlertsPage({ session }) {
  const location = useLocation();
  const routedDraft = location.state?.residentAlertDraft;
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [activeTab, setActiveTab] = useState(alertsPageMeta.tabs[0]);
  const [incidentAlerts, setIncidentAlerts] = useState([]);
  const [selectedAlertId, setSelectedAlertId] = useState(
    () => alertsFeed.find((item) => item.active)?.id ?? alertsFeed[0]?.id
  );
  const [statusOverrides, setStatusOverrides] = useState({});
  const [actionNotice, setActionNotice] = useState('');
  const [publishState, setPublishState] = useState('idle');
  const [publishError, setPublishError] = useState('');
  const [publishedResidentAlert, setPublishedResidentAlert] = useState(null);
  const [publishForm, setPublishForm] = useState(() => buildInitialPublishForm(routedDraft));

  useEffect(() => {
    let cancelled = false;

    async function loadIncidentAlerts() {
      try {
        const clusters = await api.incidentClusters();
        const items = await Promise.all(
          (Array.isArray(clusters) ? clusters : [])
            .filter((cluster) => cluster.status !== 'declined' && cluster.status !== 'closed')
            .map((cluster) => clusterToAlertFeedItem(cluster))
        );
        if (!cancelled) {
          setIncidentAlerts(items.filter(Boolean));
        }
      } catch (_error) {
        if (!cancelled) {
          setIncidentAlerts([]);
        }
      }
    }

    loadIncidentAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  const mergedAlerts = useMemo(
    () => [
      ...incidentAlerts,
      ...alertsFeed,
    ],
    [incidentAlerts]
  );

  const alertsWithStatus = useMemo(
    () =>
      mergedAlerts.map((item) => ({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      })),
    [mergedAlerts, statusOverrides]
  );
  const criticalAlertCount = useMemo(
    () => alertsWithStatus.filter((item) => isCriticalSeverity(item.severity)).length,
    [alertsWithStatus]
  );

  useEffect(() => {
    if (!alertsWithStatus.some((item) => item.id === selectedAlertId)) {
      setSelectedAlertId(alertsWithStatus[0]?.id ?? null);
    }
  }, [alertsWithStatus, selectedAlertId]);

  const selectedAlert =
    alertsWithStatus.find((item) => item.id === selectedAlertId) ?? alertsWithStatus[0];
  const selectedDetail = buildAlertDetail(selectedAlert);

  useEffect(() => {
    if (!selectedAlert || selectedAlert.sourceType !== 'incident_cluster') return;

    setPublishForm((current) => ({
      ...current,
      ...buildPublishFormFromIncidentAlert(selectedAlert),
      smsEnabled: current.smsEnabled,
      whatsappEnabled: current.whatsappEnabled,
      telegramEnabled: current.telegramEnabled,
    }));
  }, [selectedAlert]);

  const filteredAlerts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return alertsWithStatus
      .filter((item) => {
        const matchesTab =
          activeTab === 'All Alerts' ||
          (activeTab === 'Critical Only' && isCriticalSeverity(item.severity)) ||
          (activeTab === 'By Region' && item.region === selectedAlert?.region) ||
          (activeTab === 'Unacknowledged' && item.status === 'unacknowledged');
        const searchable = [item.id, item.title, item.region, item.source, item.status, item.severity]
          .join(' ')
          .toLowerCase();

        return matchesTab && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => alertSeverityRank(left.severity) - alertSeverityRank(right.severity));
  }, [activeTab, alertsWithStatus, query, selectedAlert?.region]);

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
    <ScreenPage className="alerts-page">
      <ScreenHeader
        as="section"
        className="alerts-topbar"
        visual="routeGrid"
        visualVariant="subtleBackground"
        visualPosition="center"
      >
        <div className="alerts-title-group">
          <h1>{alertsPageMeta.title}</h1>
          <span className="alerts-critical-pill">
            {criticalAlertCount} critical active
          </span>
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
            onClick={() => setActionNotice('Resident alert form is ready below for publishing.')}
          >
            {alertsPageMeta.advisoryLabel}
          </button>
        </div>
      </ScreenHeader>

      <ScreenPanel className="alerts-layout">
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
              <ScreenPanel as="article" key={fact.label} className="alert-fact-card">
                <p>{fact.label}</p>
                <strong>{fact.value}</strong>
              </ScreenPanel>
            ))}
          </div>

          <ScreenPanel className="alerts-composer-panel alerts-composer-panel--inline">
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
                <select
                  value={publishForm.severity}
                  onChange={(event) =>
                    setPublishForm((current) => ({ ...current, severity: event.target.value }))
                  }
                >
                  <option value="critical">Critical</option>
                  <option value="danger">High</option>
                  <option value="warning">Warning</option>
                  <option value="info">Information</option>
                </select>
              </label>
              <label>
                <span>Radius</span>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={publishForm.radiusMeters}
                  onChange={(event) =>
                    setPublishForm((current) => ({ ...current, radiusMeters: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  value={publishForm.lat}
                  onChange={(event) => setPublishForm((current) => ({ ...current, lat: event.target.value }))}
                />
              </label>
              <label>
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.0001"
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
                    setActionNotice(`Resident alert published for ${published.locationLabel}.`);
                  } catch (err) {
                    setPublishState('error');
                    setPublishError(err.message);
                  }
                }}
              >
                {publishState === 'publishing' ? 'Publishing' : 'Publish to residents'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  setPublishForm(
                    selectedAlert?.sourceType === 'incident_cluster'
                      ? {
                          ...buildPublishFormFromIncidentAlert(selectedAlert),
                          smsEnabled: false,
                          whatsappEnabled: false,
                          telegramEnabled: false,
                        }
                      : buildInitialPublishForm(routedDraft)
                  );
                  setActionNotice('Resident alert draft reset.');
                }}
              >
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
          </ScreenPanel>
        </section>
      </ScreenPanel>
    </ScreenPage>
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

function alertSeverityRank(severity) {
  const normalized = String(severity ?? '').toLowerCase();
  if (normalized === 'critical') return 0;
  if (normalized === 'danger' || normalized === 'high') return 1;
  if (normalized === 'warning') return 1;
  if (normalized === 'info') return 2;
  return 3;
}

function buildAlertDetail(item) {
  if (!item) {
    return alertDetail;
  }

  if (item.sourceType === 'incident_cluster') {
    const cluster = item.raw;
    return {
      severity: item.severity,
      caseId: item.id,
      title: item.title,
      summary:
        cluster?.extracted_incident?.description ||
        `Resident report routed into command review for ${item.region}.`,
      facts: [
        { label: 'Incident location', value: item.locationLabel || item.region },
        { label: 'Time detected', value: item.timeAgo },
        { label: 'Current status', value: item.status },
        { label: 'Data source', value: item.source },
        { label: 'Grouped reports', value: String(cluster?.reports?.length ?? 0) },
        {
          label: 'Recommended agencies',
          value:
            cluster?.recommendations
              ? [
                  ...(cluster.recommendations.mandatory_agencies ?? []).map((agency) => agency.agency),
                  ...(cluster.recommendations.suggested_agencies ?? []).map((agency) => agency.agency),
                ]
                  .filter((agency, index, agencies) => agencies.indexOf(agency) === index)
                  .join(', ') || 'Pending review'
              : 'Pending review',
        },
      ],
    };
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
  };
}

function buildInitialPublishForm(routedDraft) {
  return {
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
  };
}

function buildPublishFormFromIncidentAlert(alert) {
  return {
    title: alert.title,
    body: '',
    publicAction: '',
    locationLabel: alert.locationLabel ?? alert.region,
    severity: normalizeComposerSeverity(alert.severity),
    lat: alert.lat != null ? String(alert.lat) : '',
    lng: alert.lng != null ? String(alert.lng) : '',
    radiusMeters: alert.radiusMeters != null ? String(alert.radiusMeters) : '500',
  };
}

function isCriticalSeverity(severity) {
  const normalized = String(severity ?? '').toLowerCase();
  return normalized === 'critical' || normalized === 'danger' || normalized === 'high';
}

function normalizeComposerSeverity(severity) {
  const normalized = String(severity ?? '').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'danger' || normalized === 'high') return 'danger';
  if (normalized === 'warning' || normalized === 'medium' || normalized === 'moderate') return 'warning';
  return 'info';
}

async function clusterToAlertFeedItem(cluster) {
  const locationLabel =
    cluster?.canonical_event?.location?.addressText ||
    cluster?.extracted_incident?.location_text ||
    'Location pending';
  const coordinates = await resolveIncidentCoordinates(cluster, locationLabel);

  return {
    id: cluster.incident_id,
    title:
      `${titleCase(cluster?.extracted_incident?.incident_type || 'Incident')} - ${locationLabel}`,
    region: locationLabel,
    timeAgo: formatTimeAgo(cluster.updated_at ?? cluster.created_at),
    source: 'Resident incident report',
    severity: normalizeComposerSeverity(
      cluster?.canonical_event?.severity || cluster?.extracted_incident?.severity
    ),
    status: cluster.status,
    sourceType: 'incident_cluster',
    locationLabel,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    radiusMeters: cluster?.canonical_event?.vicinityRadiusMeters ?? 500,
    raw: cluster,
  };
}

async function resolveIncidentCoordinates(cluster, locationLabel) {
  const canonicalLocation = cluster?.canonical_event?.location;
  const canonicalCoordinates = parseCoordinates(
    canonicalLocation?.latitude,
    canonicalLocation?.longitude
  );
  if (canonicalCoordinates) return canonicalCoordinates;

  if (!locationLabel) return null;

  try {
    const results = await api.oneMapSearch(locationLabel);
    const first = Array.isArray(results) ? results[0] : results?.results?.[0];
    return parseCoordinates(
      first?.latitude ?? first?.lat ?? first?.LATITUDE,
      first?.longitude ?? first?.lng ?? first?.LONGITUDE
    );
  } catch {
    return null;
  }
}

function parseCoordinates(latValue, lngValue) {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatTimeAgo(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'just now';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? '' : 's'} ago`;
}

function titleCase(value = '') {
  return (
    value
      .split(' ')
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join(' ') || 'Incident'
  );
}
