import { useState } from 'react';
import { CrisisMap } from '../components/CrisisMap';
import { LoadingSkeleton, MapLoadingSkeleton } from '../components/LoadingSkeleton';
import { MapErrorBoundary } from '../components/MapErrorBoundary';
import { useEvents } from '../hooks/useEvents';

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

export function IncidentMapPage() {
  const { events, status, error } = useEvents();
  const [selected, setSelected] = useState(null);
  const isLoading = status === 'loading';

  return (
    <div className="incident-map-page">
      <section className="incident-map-layout">
        <div className="incident-map-main">
          <section className="panel map-panel">
            <div className="incident-map-shell">
              {isLoading ? (
                <MapLoadingSkeleton />
              ) : (
                <MapErrorBoundary resetKey={events.length}>
                  <CrisisMap events={events} onSelect={setSelected} selectedId={selected?.id} />
                </MapErrorBoundary>
              )}
            </div>
          </section>

          {status === 'error' && (
            <p className="feed-warning">
              Live feed unavailable ({error}). Showing demo scenarios only.
            </p>
          )}
        </div>

        <aside className="incident-map-sidebar">
          <section className="panel incident-list-panel">
            <div className="section-heading incident-list-heading">
              <div>
                <p className="eyebrow">Active incidents</p>
                <h2>{isLoading ? 'Syncing map events' : `${events.length} live map events`}</h2>
              </div>
              <span className="pill">{isLoading ? 'Syncing' : 'Live'}</span>
            </div>

            {isLoading ? (
              <LoadingSkeleton rows={5} compact />
            ) : events.length === 0 ? (
              <div className="incident-empty-state">
                <p>No active incidents are available from the current feeds.</p>
              </div>
            ) : (
              <div className="incident-list">
                {events.map((incident) => (
                  <article
                    key={incident.id}
                    className={`incident-list-card${selected?.id === incident.id ? ' incident-list-card--active' : ''}`}
                    onClick={() => setSelected(incident)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="incident-list-top">
                      <p className="incident-code">{incident.source}</p>
                      <span className={`severity-chip chip-${severityTone(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <h3>{incident.title}</h3>
                    <p className="incident-location">{incident.location}</p>
                    <p className="incident-meta-inline">
                      {HAZARD_LABEL[incident.hazardType] ?? 'Hazard'}
                      {incident.vicinityRadiusMeters
                        ? ` | ${incident.vicinityRadiusMeters}m radius`
                        : ''}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </div>
  );
}

function severityTone(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'high';
  return 'support';
}
