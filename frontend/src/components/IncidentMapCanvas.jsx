function hazardSymbol(icon) {
  if (icon === 'fire') {
    return 'flame';
  }

  if (icon === 'medical') {
    return 'pulse';
  }

  if (icon === 'outbreak') {
    return 'grid';
  }

  return 'waves';
}

export function IncidentMapCanvas({ incidents, summary }) {
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
        <svg className="sg-map-outline" viewBox="0 0 1000 700" aria-hidden="true">
          <path
            d="M174 446c-34-33-47-89-27-137 18-44 55-58 104-72 27-8 62-26 88-52 43-43 82-77 124-92 66-24 136-5 181 24 40 25 61 34 98 38 67 7 121 63 127 126 5 53-10 93-34 119-18 19-25 38-29 68-5 40-25 86-69 112-53 32-125 26-179 11-38-11-68-14-108-6-66 14-140 11-189-22-36-24-55-68-87-117z"
            className="sg-mainland"
          />
          <path
            d="M267 171c24-14 58-18 81-2 10 7 6 22-10 27-30 10-62 14-83 2-14-8-7-19 12-27z"
            className="sg-islet"
          />
          <path
            d="M767 181c19-12 51-9 64 8 6 8 1 18-11 22-27 9-55 9-68-1-10-8-2-20 15-29z"
            className="sg-islet"
          />
        </svg>

        <div className="map-grid" aria-hidden="true" />

        {incidents.map((incident) => (
          <article
            key={incident.id}
            className={`map-marker marker-${incident.colorTone}`}
            style={{ left: `${incident.coordinates.x}%`, top: `${incident.coordinates.y}%` }}
          >
            <div
              className={`marker-radius radius-${incident.colorTone}`}
              style={{ width: `${incident.radiusSize * 12}px`, height: `${incident.radiusSize * 12}px` }}
            />
            <div className="marker-pin">
              <span className={`marker-symbol symbol-${hazardSymbol(incident.icon)}`} aria-hidden="true" />
            </div>
            <div className="marker-tooltip">
              <p className="marker-id">{incident.id}</p>
              <h3>{incident.title}</h3>
              <p className="muted-copy">
                {incident.location} · {incident.vicinityRadius}
              </p>
            </div>
          </article>
        ))}

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
