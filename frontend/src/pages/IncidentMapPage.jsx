import {
  geospatialIncidents,
  incidentMapLegend,
  incidentMapSummary,
  quickActionLogs
} from '../data/dashboardData';
import { IncidentMapCanvas } from '../components/IncidentMapCanvas';

export function IncidentMapPage() {
  return (
    <div className="incident-map-page">
      <section className="incident-map-layout">
        <div className="incident-map-main">
          <IncidentMapCanvas incidents={geospatialIncidents} summary={incidentMapSummary} />

          <div className="incident-map-bottom">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Map Legend</h2>
                  <p>Color and radius cues for field teams and community broadcasts.</p>
                </div>
              </div>
              <div className="map-legend-list">
                {incidentMapLegend.map((item) => (
                  <div key={item.label} className="map-legend-item">
                    <span className={`legend-swatch swatch-${item.tone}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel geospatial-engine-panel">
              <div className="section-heading">
                <div>
                  <h2>Visualised Alerts</h2>
                  <p>Broadcast instructions can be paired with OneMap overlays and nearby safe routes.</p>
                </div>
                <span className="pill">OneMap-ready</span>
              </div>
              <div className="engine-points">
                <article className="engine-card">
                  <h3>Location-aware filtering</h3>
                  <p className="muted-copy">
                    The “is this for me?” filter checks radius, hazard type, and severity before
                    showing an alert to commanders, responders, or residents.
                  </p>
                </article>
                <article className="engine-card">
                  <h3>Street to regional coverage</h3>
                  <p className="muted-copy">
                    Dengue clusters stay street-level, flood alerts stay hyperlocal, and haze-style
                    incidents can scale up to regional visibility.
                  </p>
                </article>
              </div>
            </section>
          </div>
        </div>

        <aside className="incident-map-sidebar">
          <section className="panel incident-list-panel">
            <div className="section-heading incident-list-heading">
              <div>
                <p className="eyebrow">Active incidents</p>
                <h2>{geospatialIncidents.length} live map events</h2>
              </div>
              <span className="pill">{incidentMapSummary.lastSynced}</span>
            </div>

            <div className="incident-filter-row">
              <button type="button" className="ghost-button compact-button">
                Severity
              </button>
              <button type="button" className="primary-button compact-button">
                Newest
              </button>
            </div>

            <label className="incident-filter-search">
              <span className="searchbar-icon" aria-hidden="true">
                +
              </span>
              <input type="text" placeholder="Filter list..." aria-label="Filter incidents" />
            </label>

            <div className="incident-list">
              {geospatialIncidents.map((incident) => (
                <article key={incident.id} className="incident-list-card">
                  <div className="incident-list-top">
                    <p className="incident-code">{incident.id}</p>
                    <span className={`severity-chip chip-${incident.colorTone}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <h3>{incident.title}</h3>
                  <p className="incident-location">{incident.location}</p>
                  <p className="muted-copy">{incident.advisory}</p>
                  <div className="incident-meta-grid">
                    <div>
                      <p className="incident-meta-label">Vicinity radius</p>
                      <p className="incident-meta-value">{incident.vicinityRadius}</p>
                    </div>
                    <div>
                      <p className="incident-meta-label">Public impact</p>
                      <p className="incident-meta-value">{incident.personaImpact}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel quick-log-panel">
            <div className="section-heading">
              <div>
                <h2>Quick Action Logs</h2>
                <p>Latest changes to the map-assisted alert workflow.</p>
              </div>
            </div>
            <div className="quick-log-list">
              {quickActionLogs.map((item) => (
                <article key={item} className="quick-log-entry">
                  <span className="quick-log-dot" aria-hidden="true" />
                  <p>{item}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
