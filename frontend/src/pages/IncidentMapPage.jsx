import { useState } from 'react';
import { CrisisMap } from '../components/CrisisMap';
import { useEvents } from '../hooks/useEvents';

export function IncidentMapPage() {
  const { events, status, error } = useEvents();
  const [selected, setSelected] = useState(null);

  return (
    <div className="incident-map-page">
      <section className="incident-map-layout">
        <div className="incident-map-main">
          <section className="panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ height: 520 }}>
              <CrisisMap events={events} onSelect={setSelected} />
            </div>
          </section>

          {status === 'error' && (
            <p style={{ color: '#ffb554', padding: 12 }}>
              Live feed unavailable ({error}). Showing demo scenarios only.
            </p>
          )}
        </div>

        <aside className="incident-map-sidebar">
          <section className="panel incident-list-panel">
            <div className="section-heading incident-list-heading">
              <div>
                <p className="eyebrow">Active incidents</p>
                <h2>{events.length} live map events</h2>
              </div>
              <span className="pill">
                {status === 'loading' ? 'Syncing…' : 'Live'}
              </span>
            </div>

            <div className="incident-list">
              {events.map((incident) => (
                <article
                  key={incident.id}
                  className="incident-list-card"
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
                  <p className="muted-copy">{incident.publicAction}</p>
                  <div className="incident-meta-grid">
                    <div>
                      <p className="incident-meta-label">Vicinity radius</p>
                      <p className="incident-meta-value">{incident.vicinityRadiusMeters}m</p>
                    </div>
                    <div>
                      <p className="incident-meta-label">Hazard</p>
                      <p className="incident-meta-value">{incident.hazardType}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

// Map your severity values to the existing CSS chip classes
function severityTone(severity) {
  if (severity === 'critical') return 'critical';
  if (severity === 'high' || severity === 'medium') return 'high';
  return 'support';
}