import { OneMapPreviewMap } from './OneMapPreviewMap';

function toFallbackLatitude(yPercent) {
  return 1.494 - (yPercent / 100) * (1.494 - 1.144);
}

function toFallbackLongitude(xPercent) {
  return 103.535 + (xPercent / 100) * (104.502 - 103.535);
}

export function IncidentMapCanvas({ incidents, summary }) {
  const mapPoints = incidents.map((incident) => ({
    id: incident.id,
    query: incident.location,
    title: incident.title,
    description: `${incident.location} · ${incident.vicinityRadius}`,
    tone: incident.colorTone,
    radiusMeters: incident.radiusSize * 90,
    fallbackLatitude: toFallbackLatitude(incident.coordinates.y),
    fallbackLongitude: toFallbackLongitude(incident.coordinates.x)
  }));

  return (
    <section className="incident-map-canvas panel">
      <div className="map-toolbar">
        <label className="map-searchbar">
          <span className="searchbar-icon" aria-hidden="true">
            +
          </span>
          <input type="text" placeholder={summary.searchPlaceholder} aria-label="Search map areas" />
        </label>
        <button type="button" className="map-filter-pill">
          {summary.activeFiltersLabel}
        </button>
      </div>

      <div className="map-surface">
        <OneMapPreviewMap className="incident-onemap-preview" points={mapPoints} />

        <div className="map-surface-note">
          <p className="eyebrow">Geospatial Event Engine</p>
          <h2>Vicinity-aware public alerts</h2>
          <p className="muted-copy">
            Each event is tagged with a hazard type, severity, and a location radius so communities
            only see alerts relevant to where they are.
          </p>
        </div>
      </div>
    </section>
  );
}
