import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Severity colours reuse the existing theme tokens.
const SEVERITY_COLOR = {
  critical: '#ff7676',
  high: '#ffb554',
  medium: '#ffb554',
  low: '#55a7ff',
  info: '#19d39a',
};

const HYPERLOCAL_HAZARDS = new Set(['flood', 'fire', 'dengue']);

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

const SG_CENTER = [1.3521, 103.8198];

// Auto-fit the map to show all events
function FitBounds({ events }) {
  const map = useMap();
  useEffect(() => {
    const pts = events.filter((e) => e.lat != null && e.lng != null).map((e) => [e.lat, e.lng]);
    if (pts.length > 0) {
      map.fitBounds(pts, { padding: [50, 50], maxZoom: 14 });
    }
  }, [events, map]);
  return null;
}

export function CrisisMap({ events = [], onSelect, selectedId, height = '100%' }) {
  return (
    <div style={{ height, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
      <MapContainer
        center={SG_CENTER}
        zoom={12}
        style={{ height: '100%', width: '100%', background: '#0b0d11' }}
        scrollWheelZoom
      >
        {/* OneMap Night basemap — matches the dark theme, no API key needed for tiles */}
        <TileLayer
          url="https://www.onemap.gov.sg/maps/tiles/Night/{z}/{x}/{y}.png"
          attribution='<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo_round@2x.png" style="height:16px;width:16px;vertical-align:middle"/> OneMap | Map data &copy; <a href="https://www.sla.gov.sg">Singapore Land Authority</a>'
          minZoom={11}
          maxZoom={18}
        />

        <FitBounds events={events} />

        {events.map((e) => {
          if (e.lat == null || e.lng == null) return null;
          const color = SEVERITY_COLOR[e.severity] ?? '#55a7ff';
          const isSelected = e.id === selectedId;
          const showCircle = isSelected && HYPERLOCAL_HAZARDS.has(e.hazardType);
          return (
            <div key={e.id}>
              {showCircle && (
                <Circle
                  center={[e.lat, e.lng]}
                  radius={e.vicinityRadiusMeters ?? 500}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1.5 }}
                />
              )}
              {/* Event marker */}
              <CircleMarker
                center={[e.lat, e.lng]}
                radius={9}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.9, weight: 2 }}
                eventHandlers={{ click: () => onSelect?.(e) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{e.title}</strong>
                    <p style={{ margin: '4px 0', fontSize: 13 }}>{e.location}</p>
                    <p style={{ margin: '4px 0', fontSize: 13 }}>{e.publicAction}</p>
                    <span style={{ fontSize: 11, textTransform: 'uppercase', opacity: 0.7 }}>
                      {HAZARD_LABEL[e.hazardType] ?? 'Hazard'} / {e.source} / {e.severity}
                      {e.isDemo ? ' / demo' : ''}
                    </span>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
