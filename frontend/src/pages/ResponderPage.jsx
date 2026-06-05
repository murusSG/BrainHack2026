import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AllocationApprovalPanel } from '../components/AllocationApprovalPanel';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { api } from '../services/api';
import {
  clusterToRecommendation,
  isClusterPendingReview,
  normaliseIncidentClusters,
} from '../services/incidentClusterAdapter';

const RESPONDER_LOCATION = {
  label: 'Responder 21',
  lat: 1.3521,
  lng: 103.8198,
};

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const HAZARD_LABEL = {
  flood: 'Flood',
  haze: 'Haze',
  dengue: 'Dengue',
  fire: 'Fire',
  medical: 'Medical',
  traffic: 'Traffic',
  mrt: 'MRT',
  weather: 'Weather',
  lightning: 'Lightning',
  incident: 'Incident',
};

function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return 'Distance pending';
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

function severityTone(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'support';
}

function buildRouteRecommendation(incident) {
  if (!incident) {
    return {
      title: 'No route recommendation',
      chain: 'Select an incident to review route and agency status.',
      destination: 'dispatcher review',
    };
  }

  return {
    title: `${incident.title} at ${incident.location}`,
    destination: incident.location,
    chain:
      incident.approvalStatus === 'approved'
        ? incident.dispatchLog
        : 'Awaiting selected agency approval before operational dispatch is marked.',
  };
}

export function ResponderPage() {
  const [selected, setSelected] = useState(null);
  const [routingStatus, setRoutingStatus] = useState('pending');
  const [incidentClusters, setIncidentClusters] = useState([]);
  const [incidentEvents, setIncidentEvents] = useState([]);
  const [incidentClusterStatus, setIncidentClusterStatus] = useState('loading');
  const [incidentApprovalNotice, setIncidentApprovalNotice] = useState('');
  const isLoading = incidentClusterStatus === 'loading';
  const pendingReviewClusters = incidentClusters.filter(isClusterPendingReview);
  const approvedClusterCount = incidentClusters.filter((cluster) => cluster.resource_allocation_status === 'approved').length;
  const feedLabel =
    incidentClusterStatus === 'loading'
      ? 'Syncing'
      : incidentClusterStatus === 'error'
        ? 'Error'
        : `${pendingReviewClusters.length}/${approvedClusterCount}`;

  const sortedIncidents = useMemo(() => {
    return incidentEvents
      .filter((event) => event.lat != null && event.lng != null)
      .map((event) => ({
        ...event,
        distanceFromResponder: distanceMeters(RESPONDER_LOCATION, event),
      }))
      .sort((a, b) => {
        const severityDelta =
          (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
        if (severityDelta !== 0) return severityDelta;
        return a.distanceFromResponder - b.distanceFromResponder;
      });
  }, [incidentEvents]);

  const activeIncident = selected ?? sortedIncidents[0];
  const routeRecommendation = buildRouteRecommendation(activeIncident);
  const incidentRecommendation = clusterToRecommendation(pendingReviewClusters[0]);

  async function refreshIncidentClusters() {
    try {
      const clusters = await api.incidentClusters();
      const nextClusters = clusters ?? [];
      const nextEvents = await normaliseIncidentClusters(nextClusters, api);
      setIncidentClusters(nextClusters);
      setIncidentEvents(nextEvents);
      setIncidentClusterStatus('done');
    } catch {
      setIncidentClusterStatus('error');
    }
  }

  useEffect(() => {
    refreshIncidentClusters();
    const intervalId = window.setInterval(refreshIncidentClusters, 5000);
    window.addEventListener('focus', refreshIncidentClusters);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIncidentClusters);
    };
  }, []);

  async function handleIncidentAgencyStatusChange(recommendationId, agencyIds, status) {
    if (!incidentRecommendation || recommendationId !== incidentRecommendation.id) return null;

    if (status !== 'approved') {
      setIncidentApprovalNotice('Recommendation updated locally. Real notification workflow is not implemented.');
      return incidentRecommendation;
    }

    const cluster = incidentClusters.find((item) => item.incident_id === incidentRecommendation.incidentId);
    const approvedAgencies = new Set(cluster?.approved_agencies ?? []);
    incidentRecommendation.agencies
      .filter((agency) => agencyIds.includes(agency.id))
      .forEach((agency) => approvedAgencies.add(agency.agency));

    try {
      const approval = await api.approveResourceAllocation({
        incident_id: incidentRecommendation.incidentId,
        dispatcher_id: 'RESP-DEMO',
        approved_agencies: Array.from(approvedAgencies),
      });
      setIncidentApprovalNotice(approval.message);
      const clusters = await api.incidentClusters();
      const nextClusters = clusters ?? [];
      const nextEvents = await normaliseIncidentClusters(nextClusters, api);
      setIncidentClusters(nextClusters);
      setIncidentEvents(nextEvents);
      setIncidentClusterStatus('done');
      setSelected((current) => {
        if (!current || current.id !== `cluster-${incidentRecommendation.incidentId}`) return current;
        const updated = nextEvents.find((event) => event.id === current.id);
        return updated ?? current;
      });
      return clusterToRecommendation(
        (clusters ?? []).find((item) => item.incident_id === incidentRecommendation.incidentId)
      );
    } catch {
      setIncidentClusterStatus('error');
      setIncidentApprovalNotice('Approval could not be saved. Keep this recommendation in responder review.');
      return null;
    }
  }

  return (
    <div className="responder-page">
      <header className="responder-header">
        <div>
          <p className="eyebrow">Responder lens</p>
          <h1>Field Response</h1>
          <p className="responder-header-copy">
            Live hazards, nearby incidents, and destination decisions for units already on the move.
          </p>
        </div>
        <Link to="/" className="responder-command-link">
          Command view
        </Link>
      </header>

      <section className="responder-status-row">
        <article className="responder-status-card">
          <p className="responder-status-label">Unit</p>
          <p className="responder-status-value">{RESPONDER_LOCATION.label}</p>
        </article>
        <article className="responder-status-card">
          <p className="responder-status-label">Queue</p>
          <p className="responder-status-value">{isLoading ? '...' : pendingReviewClusters.length}</p>
        </article>
        <article className="responder-status-card">
          <p className="responder-status-label">Review/Approved</p>
          <p className="responder-status-value">{feedLabel}</p>
        </article>
      </section>

      {incidentClusterStatus === 'error' && (
        <p className="responder-feed-warning">
          Incident cluster feed unavailable. Check the Node API connection.
        </p>
      )}

      <section className="responder-allocation-section">
        {incidentRecommendation ? (
          <>
            <AllocationApprovalPanel
              recommendation={incidentRecommendation}
              commandStateStatus={incidentClusterStatus}
              onAgencyStatusChange={handleIncidentAgencyStatusChange}
              showContactAction={false}
              showGeneratedAt={false}
            />
            {incidentApprovalNotice && (
              <p className="allocation-command-note">{incidentApprovalNotice}</p>
            )}
          </>
        ) : (
          <section className="allocation-panel panel" aria-labelledby="responder-allocation-title">
            <div className="section-heading allocation-heading">
              <div>
                <p className="eyebrow">AI-assisted allocation</p>
                <h2 id="responder-allocation-title">Responder Review Queue</h2>
                <p>Public incident reports that create new clusters will appear here.</p>
              </div>
              <span className="allocation-risk-pill">
                {incidentClusterStatus === 'loading' ? 'Syncing' : 'Clear'}
              </span>
            </div>
            <button
              type="button"
              className="ghost-button compact-button responder-refresh-button"
              onClick={refreshIncidentClusters}
            >
              Refresh queue
            </button>
          </section>
        )}
      </section>

      <section className="responder-route-card">
        <div>
          <div className="responder-route-kicker">
            <p className="eyebrow">Capacity-aware route</p>
            <span className="demo-chip">
              {activeIncident?.approvalStatus === 'approved' ? 'Approved' : 'Live route'}
            </span>
          </div>
          <h2>{routeRecommendation.title}</h2>
          <p className="responder-route-chain">
            {routeRecommendation.chain}
          </p>
        </div>
        <div className="responder-route-actions">
          <button
            type="button"
            className="responder-accept-button"
            onClick={() => setRoutingStatus('accepted')}
          >
            Accept
          </button>
          <button
            type="button"
            className="responder-decline-button"
            onClick={() => setRoutingStatus('declined')}
          >
            Decline
          </button>
        </div>
        <p className={`responder-route-status is-${routingStatus}`}>
          {routingStatus === 'pending'
            ? 'Awaiting responder decision'
            : routingStatus === 'accepted'
              ? `Route accepted - ${routeRecommendation.destination} destination locked`
              : 'Route declined - dispatcher review requested'}
        </p>
      </section>

      <section className="responder-map-card panel">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Incident map</p>
            <h2>{activeIncident ? activeIncident.title : 'No active incident selected'}</h2>
          </div>
          {activeIncident && (
            <span className={`severity-chip chip-${severityTone(activeIncident.severity)}`}>
              {activeIncident.severity}
            </span>
          )}
        </div>
        <div className="responder-map-shell">
          {isLoading ? (
            <MapLoadingSkeleton />
          ) : (
            <MapErrorBoundary resetKey={sortedIncidents.length}>
              <CrisisMap
                events={sortedIncidents}
                onSelect={setSelected}
                selectedId={activeIncident?.id}
              />
            </MapErrorBoundary>
          )}
        </div>
      </section>

      <section className="responder-incident-panel panel">
        <div className="responder-section-heading">
          <div>
            <p className="eyebrow">Priority queue</p>
            <h2>Sorted by severity, then proximity</h2>
          </div>
          <span className="pill">{incidentClusterStatus === 'loading' ? 'Syncing' : 'Dispatch-ready'}</span>
        </div>

        {isLoading ? (
          <LoadingSkeleton rows={4} compact />
        ) : sortedIncidents.length === 0 ? (
          <div className="responder-empty-state">
            <p>No incidents available for dispatch right now.</p>
          </div>
        ) : (
          <div className="responder-incident-list">
            {sortedIncidents.map((incident, index) => (
              <button
                type="button"
                key={incident.id}
                className={`responder-incident-card${
                  activeIncident?.id === incident.id ? ' is-active' : ''
                }`}
                onClick={() => setSelected(incident)}
              >
                <span className="responder-rank">{index + 1}</span>
                <span className="responder-incident-copy">
                  <span className="responder-incident-title">{incident.title}</span>
                  <span className="responder-incident-meta">
                    {incident.location} | {HAZARD_LABEL[incident.hazardType] ?? 'Hazard'} |{' '}
                    {formatDistance(incident.distanceFromResponder)} |{' '}
                    {incident.approvalStatus === 'approved' ? incident.dispatchLog : 'awaiting approval'}
                  </span>
                </span>
                <span className={`severity-chip chip-${severityTone(incident.severity)}`}>
                  {incident.severity}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
