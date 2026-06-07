import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEvents } from '../hooks/useEvents';
import { api } from '../services/api';

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

const WATCH_POINTS = [
  { id: 'home', label: 'Home', sublabel: 'Tampines St 21', lat: 1.3536, lng: 103.9450 },
  { id: 'parents', label: "Mum's place", sublabel: 'Woodlands', lat: 1.4382, lng: 103.7890 },
  { id: 'work', label: 'Work', sublabel: 'Orchard Road', lat: 1.3048, lng: 103.8318 },
];

const SEVERITY_RANK = {
  info: 0,
  low: 1,
  advisory: 2,
  medium: 2,
  warning: 3,
  high: 3,
  danger: 4,
  critical: 4,
};

function statusTone(severity) {
  if (!severity) return 'clear';
  return (SEVERITY_RANK[severity] ?? 0) >= 3 ? 'critical' : 'warning';
}

export function ResidentPage() {
  const { events, status, error } = useEvents();
  const [activePoint, setActivePoint] = useState(WATCH_POINTS[0].id);
  const [shelterNote, setShelterNote] = useState(null);
  const [shelterLoading, setShelterLoading] = useState(false);
  const [residentAlerts, setResidentAlerts] = useState([]);
  const [residentAlertStatus, setResidentAlertStatus] = useState('loading');
  const [residentAlertError, setResidentAlertError] = useState(null);
  const [acknowledgedAlertIds, setAcknowledgedAlertIds] = useState(() => new Set());
  const isLoading = status === 'loading';
  const demoEventCount = events.filter((event) => event.isDemo).length;
  const liveEventCount = events.length - demoEventCount;
  const feedLabel =
    status === 'loading'
      ? 'Syncing'
      : status === 'error'
        ? 'Demo fallback'
        : `${liveEventCount} live / ${demoEventCount} demo`;

  useEffect(() => {
    let cancelled = false;

    async function loadResidentAlerts() {
      setResidentAlertStatus('loading');
      try {
        const alerts = await api.residentAlerts();
        if (cancelled) return;
        setResidentAlerts(Array.isArray(alerts) ? alerts : []);
        setResidentAlertError(null);
        setResidentAlertStatus('done');
      } catch (err) {
        if (cancelled) return;
        setResidentAlerts([]);
        setResidentAlertError(err.message);
        setResidentAlertStatus('error');
      }
    }

    loadResidentAlerts();

    return () => {
      cancelled = true;
    };
  }, []);

  const statusByPoint = useMemo(() => {
    return WATCH_POINTS.map((point) => {
      const affecting = events.filter((event) => {
        if (event.lat == null || event.lng == null) return false;
        const distance = distanceMeters(point, event);
        return distance <= (event.vicinityRadiusMeters ?? 500);
      });
      affecting.sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
      return { point, affecting };
    });
  }, [events]);

  const active = statusByPoint.find((statusItem) => statusItem.point.id === activePoint);
  const alertsByPoint = useMemo(() => {
    const sourceAlerts =
      residentAlerts.length > 0 ? residentAlerts : events.map(eventToFallbackResidentAlert);

    return WATCH_POINTS.map((point) => {
      const affecting = sourceAlerts.filter((alert) => alertAffectsPoint(alert, point));
      affecting.sort(
        (a, b) => (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0)
      );
      return { point, affecting };
    });
  }, [events, residentAlerts]);

  const activeAlerts = alertsByPoint.find((statusItem) => statusItem.point.id === activePoint);
  const activeSeverity = activeAlerts?.affecting[0]?.severity ?? active?.affecting[0]?.severity;
  const activeTone = isLoading || residentAlertStatus === 'loading' ? 'loading' : statusTone(activeSeverity);
  const alertFeedSource = residentAlerts.length > 0 ? 'Resident alert channel' : 'Event-derived fallback';

  async function handleNearestShelter(point) {
    setShelterLoading(true);
    setShelterNote(`Finding nearest SCDF shelter for ${point.label}...`);
    try {
      const nearest = await api.scdfNearest(point.lat, point.lng, 'SHELTER');
      const shelter = Array.isArray(nearest) ? nearest[0] : null;
      if (!shelter) {
        setShelterNote(`No configured SCDF shelter records found near ${point.label}.`);
        return;
      }
      const distance = shelter.distance_meters
        ? ` (${Math.round(shelter.distance_meters)}m away)`
        : '';
      const address = shelter.address ? `, ${shelter.address}` : '';
      setShelterNote(`Nearest shelter for ${point.label}: ${shelter.name}${address}${distance}`);
    } catch (err) {
      setShelterNote(
        `Nearest shelter for ${point.label}: ${shelterForPoint(point.id)}. Live lookup unavailable (${err.message}).`
      );
    } finally {
      setShelterLoading(false);
    }
  }

  return (
    <div className="resident-page">
      <header className="resident-header">
        <div>
          <p className="resident-kicker">MURUS SG</p>
          <h1>Your safety brief</h1>
        </div>
        <div className="resident-header-actions">
          <span className="resident-feed-pill">{feedLabel}</span>
          <Link to="/" className="resident-command-link">
            Command view
          </Link>
        </div>
      </header>

      <div className="resident-watch-grid" aria-label="Saved locations">
        {WATCH_POINTS.map((point) => {
          const pointStatus = statusByPoint.find((item) => item.point.id === point.id);
          const worstSeverity = pointStatus?.affecting[0]?.severity;
          const pointTone = isLoading ? 'loading' : statusTone(worstSeverity);

          return (
            <button
              key={point.id}
              type="button"
              onClick={() => {
                setActivePoint(point.id);
                setShelterNote(null);
              }}
              className={`resident-watch-button ${activePoint === point.id ? 'is-active' : ''}`}
            >
              <span className={`resident-status-dot is-${pointTone}`} aria-hidden="true" />
              <span className="resident-watch-label">{point.label}</span>
              <span className="resident-watch-sublabel">{point.sublabel}</span>
            </button>
          );
        })}
      </div>

      <section className={`resident-crisis-card is-${activeTone}`}>
        {isLoading || residentAlertStatus === 'loading' ? (
          <>
            <p className="resident-alert-count">Syncing resident alerts</p>
            <LoadingSkeleton rows={2} compact />
          </>
        ) : activeAlerts?.affecting.length === 0 ? (
          <>
            <span className="resident-clear-badge">CLEAR</span>
            <h2>All clear at {active.point.label}</h2>
            <p>No active citizen alerts in your area right now.</p>
          </>
        ) : (
          <>
            <p className="resident-alert-count">
              {activeAlerts.affecting.length} alert{activeAlerts.affecting.length > 1 ? 's' : ''} near{' '}
              {activeAlerts.point.label}
            </p>
            <div className="resident-alert-list">
              {activeAlerts.affecting.map((alert) => {
                const acknowledged = acknowledgedAlertIds.has(alert.id);
                return (
                <article key={alert.id} className={`resident-alert-card ${acknowledged ? 'is-read' : ''}`}>
                  <div className="resident-alert-meta">
                    <span className={`resident-alert-source is-${alert.sourceType}`}>
                      {alert.sourceType === 'command_broadcast' ? 'Command alert' : 'Incident active'}
                    </span>
                    <span className={`resident-alert-status is-${alert.status ?? 'active'}`}>
                      {alert.status === 'resolved' ? 'All clear' : alert.status === 'updated' ? 'Updated' : 'Active'}
                    </span>
                    <span>{alert.locationLabel}</span>
                  </div>
                  <h2>{alert.title}</h2>
                  <p>{alert.body}</p>
                  <p className="resident-action-copy">Action: {alert.publicAction}</p>
                  <div className="resident-card-actions">
                    <Link to="/incident-map" className="resident-primary-button resident-button-link">
                      View on map
                    </Link>
                    <button
                      type="button"
                      className="resident-secondary-button"
                      disabled={shelterLoading}
                      onClick={() => handleNearestShelter(active.point)}
                    >
                      {shelterLoading ? 'Finding shelter' : 'Nearest shelter'}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="resident-ack-button"
                    onClick={() =>
                      setAcknowledgedAlertIds((current) => {
                        const next = new Set(current);
                        next.add(alert.id);
                        return next;
                      })
                    }
                    disabled={acknowledged}
                  >
                    {acknowledged ? 'Acknowledged' : 'Mark as read'}
                  </button>
                </article>
                );
              })}
            </div>
            <p className="resident-alert-footnote">Source: {alertFeedSource}</p>
          </>
        )}
      </section>

      {shelterNote && <p className="resident-shelter-note">{shelterNote}</p>}

      {status === 'error' && (
        <p className="resident-feed-warning">
          Live feed unavailable ({error}). Showing demo scenarios only.
        </p>
      )}

      {residentAlertStatus === 'error' && (
        <p className="resident-feed-warning">
          Resident alert channel unavailable ({residentAlertError}). Showing event-derived alerts.
        </p>
      )}

      <section className="resident-map-shell" aria-label="Nearby crisis map">
        {isLoading ? (
          <MapLoadingSkeleton label="Syncing nearby hazards" />
        ) : (
          <MapErrorBoundary resetKey={events.length}>
            <CrisisMap events={events} />
          </MapErrorBoundary>
        )}
      </section>
    </div>
  );
}

function shelterForPoint(pointId) {
  if (pointId === 'work') return 'Orchard Gateway concourse, demo routing';
  if (pointId === 'parents') return 'Woodlands Community Club, demo routing';
  return 'Tampines Hub, demo routing';
}

function alertAffectsPoint(alert, point) {
  if (alert.audience?.type === 'all') return true;
  if (alert.lat == null || alert.lng == null) return false;
  return distanceMeters(point, { lat: alert.lat, lng: alert.lng }) <= (alert.radiusMeters ?? 500);
}

function eventToFallbackResidentAlert(event) {
  return {
    id: `fallback:${event.id}`,
    sourceType: event.isDemo ? 'command_broadcast' : 'incident_activated',
    title: event.title,
    body: `${event.source} signal near ${event.location}.`,
    publicAction: event.publicAction,
    severity: event.severity,
    status: 'active',
    locationLabel: event.location,
    lat: event.lat,
    lng: event.lng,
    radiusMeters: event.vicinityRadiusMeters ?? 500,
  };
}
