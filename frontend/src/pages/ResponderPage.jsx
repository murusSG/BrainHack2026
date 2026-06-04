import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEvents } from '../hooks/useEvents';

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
      chain: 'Select an incident to generate a capacity-aware destination.',
      destination: 'dispatcher review',
    };
  }

  const destinationByHazard = {
    medical: {
      destination: 'NUH',
      chain: 'TTSH near capacity (94%) -> reroute to NUH (23 min, receiving capacity available)',
    },
    flood: {
      destination: 'SCDF Alpha staging',
      chain: 'Avoid low-lying access roads -> stage via higher-ground response corridor',
    },
    fire: {
      destination: 'nearest SCDF fire post',
      chain: 'Route around smoke perimeter -> dispatch nearest available fire appliance',
    },
    haze: {
      destination: 'NEA field post',
      chain: 'Approach from upwind corridor -> support public-health advisory sweep',
    },
    dengue: {
      destination: 'NEA vector team zone',
      chain: 'Prioritise cluster perimeter -> dispatch vector-control support route',
    },
    traffic: {
      destination: 'LTA diversion node',
      chain: 'Bypass congestion radius -> coordinate access-control route',
    },
  };
  const route = destinationByHazard[incident.hazardType] ?? {
    destination: 'command staging',
    chain: 'Use safest available corridor -> confirm destination with dispatcher',
  };

  return {
    title: `${incident.title} at ${incident.location}`,
    ...route,
  };
}

export function ResponderPage() {
  const { events, status, error } = useEvents();
  const [selected, setSelected] = useState(null);
  const [routingStatus, setRoutingStatus] = useState('pending');
  const isLoading = status === 'loading';
  const demoEventCount = events.filter((event) => event.isDemo).length;
  const liveEventCount = events.length - demoEventCount;
  const feedLabel =
    status === 'loading'
      ? 'Syncing'
      : status === 'error'
        ? 'Fallback'
        : `${liveEventCount}/${demoEventCount}`;

  const sortedIncidents = useMemo(() => {
    return events
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
  }, [events]);

  const activeIncident = selected ?? sortedIncidents[0];
  const routeRecommendation = buildRouteRecommendation(activeIncident);

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
          <p className="responder-status-value">{isLoading ? '...' : sortedIncidents.length}</p>
        </article>
        <article className="responder-status-card">
          <p className="responder-status-label">Live/Demo</p>
          <p className="responder-status-value">{feedLabel}</p>
        </article>
      </section>

      {status === 'error' && (
        <p className="responder-feed-warning">
          Live feed unavailable ({error}). Showing demo scenarios only.
        </p>
      )}

      <section className="responder-route-card">
        <div>
          <div className="responder-route-kicker">
            <p className="eyebrow">Capacity-aware route</p>
            <span className="demo-chip">
              {activeIncident?.isDemo ? 'Demo route' : 'Live route'}
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
          <span className="pill">{status === 'loading' ? 'Syncing' : 'Dispatch-ready'}</span>
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
                    {incident.isDemo ? 'demo event' : 'live feed'}
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
