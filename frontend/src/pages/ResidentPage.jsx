import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEvents } from '../hooks/useEvents';

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

const SEVERITY_RANK = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };

function statusTone(severity) {
  if (!severity) return 'clear';
  return (SEVERITY_RANK[severity] ?? 0) >= 3 ? 'critical' : 'warning';
}

export function ResidentPage() {
  const { events, status, error } = useEvents();
  const [activePoint, setActivePoint] = useState(WATCH_POINTS[0].id);
  const isLoading = status === 'loading';

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
  const activeSeverity = active?.affecting[0]?.severity;
  const activeTone = isLoading ? 'loading' : statusTone(activeSeverity);

  return (
    <div className="resident-page">
      <header className="resident-header">
        <div>
          <p className="resident-kicker">MURUS SG</p>
          <h1>Your safety brief</h1>
        </div>
        <Link to="/" className="resident-command-link">
          Command view
        </Link>
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
              onClick={() => setActivePoint(point.id)}
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
        {isLoading ? (
          <>
            <p className="resident-alert-count">Syncing live data</p>
            <LoadingSkeleton rows={2} compact />
          </>
        ) : active?.affecting.length === 0 ? (
          <>
            <span className="resident-clear-badge">CLEAR</span>
            <h2>All clear at {active.point.label}</h2>
            <p>No active hazards in your area right now.</p>
          </>
        ) : (
          <>
            <p className="resident-alert-count">
              {active.affecting.length} alert{active.affecting.length > 1 ? 's' : ''} near{' '}
              {active.point.label}
            </p>
            <div className="resident-alert-list">
              {active.affecting.map((event) => (
                <article key={event.id} className="resident-alert-card">
                  <h2>{event.title}</h2>
                  <p className="resident-action-copy">Action: {event.publicAction}</p>
                  <div className="resident-card-actions">
                    <button type="button" className="resident-primary-button">
                      View on map
                    </button>
                    <button type="button" className="resident-secondary-button">
                      Nearest shelter
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {status === 'error' && (
        <p className="resident-feed-warning">
          Live feed unavailable ({error}). Showing demo scenarios only.
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
