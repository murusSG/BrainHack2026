import { Fragment, useEffect, useMemo, useRef } from 'react';
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
const SINGAPORE_BOUNDS = {
  minLat: 1.1,
  maxLat: 1.5,
  minLng: 103.5,
  maxLng: 104.2,
};

// Auto-fit only when marker geometry changes, not on every polling refresh.
function FitBounds({ events }) {
  const map = useMap();
  const lastGeometryKey = useRef('');
  const lastGeometry = useRef(new Map());
  const geometry = useMemo(
    () =>
      events
        .map((event) => {
          const coordinates = coordinatesForEvent(event);
          if (!coordinates) return null;
          return {
            id: event.id,
            lat: coordinates[0],
            lng: coordinates[1],
          };
        })
        .filter(Boolean)
        .sort((left, right) => left.id.localeCompare(right.id)),
    [events]
  );
  const geometryKey = geometry
    .map((event) => `${event.id}:${event.lat.toFixed(6)}:${event.lng.toFixed(6)}`)
    .join('|');

  useEffect(() => {
    if (geometryKey === lastGeometryKey.current) return;

    if (!geometry.length) {
      lastGeometryKey.current = '';
      lastGeometry.current = new Map();
      return;
    }

    const previousGeometry = lastGeometry.current;
    const shouldFit =
      previousGeometry.size === 0 ||
      geometry.some((event) => {
        const previous = previousGeometry.get(event.id);
        return !previous || previous.lat !== event.lat || previous.lng !== event.lng;
      });
    lastGeometryKey.current = geometryKey;
    lastGeometry.current = new Map(
      geometry.map((event) => [event.id, { lat: event.lat, lng: event.lng }])
    );
    if (!shouldFit) return;

    const points = geometry.map((event) => [event.lat, event.lng]);
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: false });
    } else {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 14, animate: false });
    }
  }, [geometry, geometryKey, map]);

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
          const coordinates = coordinatesForEvent(e);
          if (!coordinates) return null;
          const color = e.markerColor ?? SEVERITY_COLOR[e.severity] ?? '#55a7ff';
          const isSelected = e.id === selectedId;
          const showCircle = isSelected && HYPERLOCAL_HAZARDS.has(e.hazardType);
          return (
            <Fragment key={e.id}>
              {showCircle && (
                <Circle
                  center={coordinates}
                  radius={e.vicinityRadiusMeters ?? 500}
                  pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1.5 }}
                />
              )}
              {/* Event marker */}
              <CircleMarker
                center={coordinates}
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
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}

function coordinatesForEvent(event) {
  const lat = parseCoordinate(event?.lat, 'lat');
  const lng = parseCoordinate(event?.lng, 'lng');
  if (lat === undefined || lng === undefined) return null;
  if (
    lat < SINGAPORE_BOUNDS.minLat ||
    lat > SINGAPORE_BOUNDS.maxLat ||
    lng < SINGAPORE_BOUNDS.minLng ||
    lng > SINGAPORE_BOUNDS.maxLng
  ) {
    return null;
  }
  return [lat, lng];
}

function parseCoordinate(value, axis) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' && !value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  if (axis === 'lat' && (parsed < -90 || parsed > 90)) return undefined;
  if (axis === 'lng' && (parsed < -180 || parsed > 180)) return undefined;
  return parsed;
}
