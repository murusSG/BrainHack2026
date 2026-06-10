import { useEffect, useMemo, useRef, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../services/api';

const SG_CENTER = [1.3521, 103.8198];

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

function FitRouteBounds({ points }) {
  const map = useMap();
  const lastKey = useRef('');
  const boundsKey = points.map((point) => point.join(',')).join('|');

  useEffect(() => {
    if (!points.length || boundsKey === lastKey.current) return;
    lastKey.current = boundsKey;
    if (points.length === 1) {
      map.setView(points[0], 14, { animate: false });
      return;
    }
    map.fitBounds(points, { padding: [32, 32], maxZoom: 16, animate: false });
  }, [boundsKey, map, points]);

  return null;
}

export function ResidentAlertVisualGuide({
  alert,
  point,
  homePoint,
  transportMode,
  mobilityNeed,
  profileLabel,
}) {
  const [guide, setGuide] = useResidentVisualGuide({
    alert,
    point,
    homePoint,
    transportMode,
    mobilityNeed,
    profileLabel,
  });

  const mapPoints = useMemo(
    () =>
      [
        [point.lat, point.lng],
        alert?.lat != null && alert?.lng != null ? [Number(alert.lat), Number(alert.lng)] : null,
        guide.target ? [guide.target.lat, guide.target.lng] : null,
        ...(guide.routePoints ?? []),
      ].filter(isValidMapPoint),
    [alert?.lat, alert?.lng, guide.routePoints, guide.target, point.lat, point.lng]
  );

  return (
    <section className="resident-visual-guide-card" aria-label={`Visual guidance for ${alert?.title ?? point.label}`}>
      <div className="resident-visual-guide-head">
        <div>
          <p className="resident-guidance-label">Visual next steps</p>
          <h3>{guide.heading}</h3>
        </div>
        <span className={`resident-route-badge is-${guide.routeTone}`}>{guide.routeLabel}</span>
      </div>

      <div className="resident-route-map" aria-label="Emergency route map preview">
        <MapContainer
          center={mapPoints[0] ?? SG_CENTER}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          dragging
        >
          <TileLayer
            url="https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"
            attribution='OneMap | Map data &copy; <a href="https://www.sla.gov.sg">Singapore Land Authority</a>'
            minZoom={11}
            maxZoom={18}
          />
          <FitRouteBounds points={mapPoints} />
          {alert?.lat != null && alert?.lng != null && (
            <>
              <Circle
                center={[Number(alert.lat), Number(alert.lng)]}
                radius={alert.radiusMeters ?? 500}
                pathOptions={{
                  color: '#d62f43',
                  fillColor: '#d62f43',
                  fillOpacity: 0.12,
                  weight: 1.5,
                }}
              />
              <CircleMarker
                center={[Number(alert.lat), Number(alert.lng)]}
                radius={7}
                pathOptions={{ color: '#ffffff', fillColor: '#d62f43', fillOpacity: 0.95, weight: 2 }}
              >
                <Popup>{alert.locationLabel ?? 'Affected area'}</Popup>
              </CircleMarker>
            </>
          )}
          <CircleMarker
            center={[point.lat, point.lng]}
            radius={8}
            pathOptions={{ color: '#ffffff', fillColor: '#2f6f9f', fillOpacity: 0.95, weight: 2 }}
          >
            <Popup>{point.label}</Popup>
          </CircleMarker>
          {guide.target && (
            <CircleMarker
              center={[guide.target.lat, guide.target.lng]}
              radius={8}
              pathOptions={{ color: '#ffffff', fillColor: '#287a58', fillOpacity: 0.95, weight: 2 }}
            >
              <Popup>{guide.target.label}</Popup>
            </CircleMarker>
          )}
          {homePoint && guide.target?.id !== homePoint.id && (
            <CircleMarker
              center={[homePoint.lat, homePoint.lng]}
              radius={6}
              pathOptions={{ color: '#ffffff', fillColor: '#b87516', fillOpacity: 0.9, weight: 2 }}
            >
              <Popup>{homePoint.label}</Popup>
            </CircleMarker>
          )}
          {guide.routePoints?.length >= 2 && (
            <Polyline
              positions={guide.routePoints}
              pathOptions={{
                color: guide.routeTone === 'warning' ? '#b87516' : '#0c6b67',
                weight: 4,
                opacity: 0.86,
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="resident-route-summary">
        <strong>{guide.summary}</strong>
        <span>{guide.detail}</span>
      </div>

      <ol className="resident-route-steps">
        {guide.steps.map((step) => (
          <li key={step.title}>
            <span aria-hidden="true">{step.icon}</span>
            <div>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function useResidentVisualGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel }) {
  const [guide, setGuide] = useStateForGuide(alert, point, homePoint, transportMode, mobilityNeed, profileLabel);

  useEffect(() => {
    let cancelled = false;

    async function loadRoute() {
      setGuide((current) => ({ ...current, routeStatus: 'loading' }));
      const shelters = await fetchNearbyShelters(point);
      const shelter = pickSafeShelter(shelters, alert);
      const target = shelter ?? homePoint ?? null;
      const route = target
        ? await findRoute({
            start: point,
            target,
            transportMode,
          })
        : null;
      if (cancelled) return;
      setGuide(buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, shelter, route }));
    }

    loadRoute();

    return () => {
      cancelled = true;
    };
  }, [alert, homePoint, mobilityNeed, point, profileLabel, setGuide, transportMode]);

  return [guide, setGuide];
}

function useStateForGuide(alert, point, homePoint, transportMode, mobilityNeed, profileLabel) {
  const [guide, setGuide] = useState(() =>
    buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, shelter: null, route: null })
  );
  return [guide, setGuide];
}

async function fetchNearbyShelters(point) {
  try {
    const nearest = await api.scdfNearest(point.lat, point.lng, 'SHELTER');
    if (!Array.isArray(nearest)) return [];
    return nearest
      .filter((item) => item.latitude != null && item.longitude != null)
      .map((shelter) => ({
        id: shelter.id ?? shelter.name ?? 'nearest-shelter',
        label: shelter.name ?? 'Nearest shelter',
        sublabel: shelter.address ?? 'SCDF shelter lookup',
        lat: Number(shelter.latitude),
        lng: Number(shelter.longitude),
        distanceMeters: shelter.distance_meters,
      }));
  } catch {
    return [];
  }
}

// Prefer the nearest shelter that sits OUTSIDE the active danger radius so the
// evacuation target moves people away from the hazard. Fall back to the closest
// shelter when none are clear (the route preview then flags the crossing).
function pickSafeShelter(shelters, alert) {
  if (!shelters.length) return null;
  if (alert?.lat == null || alert?.lng == null) return shelters[0];
  const alertPoint = { lat: Number(alert.lat), lng: Number(alert.lng) };
  const radius = alert.radiusMeters ?? 500;
  const outside = shelters.find(
    (shelter) => distanceMeters({ lat: shelter.lat, lng: shelter.lng }, alertPoint) > radius
  );
  return outside ?? shelters[0];
}

async function findRoute({ start, target, transportMode }) {
  try {
    const route = await api.oneMapRoute({
      startLat: start.lat,
      startLng: start.lng,
      endLat: target.lat,
      endLng: target.lng,
      mode: routeModeForTransport(transportMode),
    });
    const routePoints = parseRouteGeometry(route?.geometry);
    return {
      distanceMeters: route?.distance_meters,
      durationSeconds: route?.duration_seconds,
      routePoints: routePoints.length >= 2 ? routePoints : [[start.lat, start.lng], [target.lat, target.lng]],
      source: route?.source ?? 'ONEMAP',
    };
  } catch {
    return {
      routePoints: [[start.lat, start.lng], [target.lat, target.lng]],
      source: 'direct-preview',
    };
  }
}

function buildGuide({ alert, point, homePoint, transportMode, mobilityNeed, profileLabel, shelter, route }) {
  const target = shelter ?? homePoint ?? null;
  const routePoints = route?.routePoints ?? (target ? [[point.lat, point.lng], [target.lat, target.lng]] : []);
  const routeCrossesAlert = routeTouchesAlert(routePoints, alert);
  const targetLabel = target?.label ?? 'a staffed safe area';
  const distance = route?.distanceMeters ? `${Math.round(route.distanceMeters)}m` : null;
  const duration = route?.durationSeconds ? `${Math.round(route.durationSeconds / 60)} min` : null;
  const travelMeta = [distance, duration].filter(Boolean).join(' / ');

  const hasAlert = alert?.lat != null && alert?.lng != null;

  return {
    heading: shelter
      ? `Route preview to ${shelter.label}`
      : hasAlert
        ? `Move away from ${alert.locationLabel ?? 'the alert area'}`
        : `Know your route from ${point.label}`,
    routeTone: routeCrossesAlert ? 'warning' : shelter ? 'ready' : 'caution',
    routeLabel: routeCrossesAlert ? 'Check route' : shelter ? 'Shelter lookup' : 'Guidance preview',
    target,
    routePoints,
    summary: routeCrossesAlert
      ? 'This preview may cross the affected radius.'
      : shelter
        ? hasAlert
          ? 'Nearest shelter clear of the alert area found as a possible destination.'
          : 'Nearest shelter found — know this route before an emergency.'
        : 'No confirmed shelter route is available yet.',
    detail: travelMeta
      ? `${travelMeta}. Confirm with MURUS or staff before moving.`
      : 'Confirm with MURUS, staff, or emergency services before moving.',
    steps: buildVisualSteps({
      alert,
      targetLabel,
      transportMode,
      mobilityNeed,
      profileLabel,
      routeCrossesAlert,
      hasShelter: Boolean(shelter),
    }),
  };
}

function buildVisualSteps({ alert, targetLabel, transportMode, mobilityNeed, profileLabel, routeCrossesAlert, hasShelter }) {
  const hasAlert = alert?.lat != null && alert?.lng != null;
  const location = alert?.locationLabel ?? 'the affected area';
  const action = alert?.publicAction ?? 'Follow official MURUS instructions.';
  const mobility = mobilityNeed !== 'none' || profileLabel === 'Elderly' || profileLabel === 'Mobility support';

  return [
    {
      icon: '1',
      title: hasAlert ? 'Leave the hazard edge' : 'No active alert here',
      body: hasAlert
        ? `Move away from ${location}; ${action}`
        : 'This location has no active alert right now. Use this preview to learn your route to the nearest shelter before an emergency.',
    },
    {
      icon: '2',
      title: routeCrossesAlert ? 'Do not trust the preview blindly' : 'Use the shown direction',
      body: routeCrossesAlert
        ? 'The route preview may pass through the alert radius. Wait for staff or MURUS confirmation before moving.'
        : `Head toward ${targetLabel} only if the route remains clear and staff directions match the alert.`,
    },
    {
      icon: '3',
      title: mobility ? 'Choose accessible movement' : `Travel mode: ${labelForTransport(transportMode)}`,
      body: mobility
        ? 'Use lifts, street-level sheltered paths, and ask staff or family for assistance before entering crowds.'
        : 'Stay on street-level routes and avoid basement links, underpasses, or blocked corridors.',
    },
    {
      icon: '4',
      title: hasShelter ? 'Confirm shelter before entering' : 'Check in if stuck',
      body: hasShelter
        ? 'A nearest shelter lookup is not an official activation notice. Confirm it is usable for this incident.'
        : 'If you cannot move safely, use the check-in buttons so command sees that you need help.',
    },
  ];
}

function routeTouchesAlert(routePoints, alert) {
  if (alert?.lat == null || alert?.lng == null || !routePoints.length) return false;
  const alertPoint = { lat: Number(alert.lat), lng: Number(alert.lng) };
  const radius = alert.radiusMeters ?? 500;
  return routePoints.some(([lat, lng]) => distanceMeters({ lat, lng }, alertPoint) <= radius);
}

function parseRouteGeometry(geometry) {
  if (!geometry || typeof geometry !== 'string') return [];
  const trimmed = geometry.trim();
  if (!trimmed) return [];

  const jsonPoints = parseJsonGeometry(trimmed);
  if (jsonPoints.length >= 2) return jsonPoints;

  const textPoints = parseTextCoordinatePairs(trimmed);
  if (textPoints.length >= 2) return textPoints;

  return decodePolyline(trimmed);
}

function parseJsonGeometry(value) {
  try {
    const parsed = JSON.parse(value);
    const coordinates = parsed?.type === 'LineString' ? parsed.coordinates : parsed?.coordinates ?? parsed;
    if (!Array.isArray(coordinates)) return [];
    return coordinates.flatMap((coordinate) => normalizeCoordinatePair(coordinate));
  } catch {
    return [];
  }
}

function parseTextCoordinatePairs(value) {
  return value
    .split(/[;|]/)
    .map((part) => part.trim().split(/,\s*/).map(Number))
    .flatMap((pair) => normalizeCoordinatePair(pair));
}

function normalizeCoordinatePair(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return [];
  const first = Number(pair[0]);
  const second = Number(pair[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return [];
  if (first > 90 && second <= 90) return [[second, first]];
  return [[first, second]];
}

function decodePolyline(value) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < value.length) {
    const latitude = decodePolylineNumber(value, index);
    if (!latitude) break;
    index = latitude.index;
    const longitude = decodePolylineNumber(value, index);
    if (!longitude) break;
    index = longitude.index;
    lat += latitude.value;
    lng += longitude.value;
    points.push([lat / 100000, lng / 100000]);
  }

  return points;
}

function decodePolylineNumber(value, startIndex) {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte;

  do {
    if (index >= value.length) return null;
    byte = value.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    index,
  };
}

function isValidMapPoint(point) {
  return (
    Array.isArray(point) &&
    point.length === 2 &&
    Number.isFinite(point[0]) &&
    Number.isFinite(point[1])
  );
}

function routeModeForTransport(mode) {
  if (mode === 'driving') return 'drive';
  if (mode === 'mrt') return 'pt';
  return 'walk';
}

function labelForTransport(mode) {
  if (mode === 'driving') return 'driving';
  if (mode === 'mrt') return 'MRT / bus';
  if (mode === 'caregiver') return 'with dependants';
  return 'walking';
}
