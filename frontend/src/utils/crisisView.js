// Maps the backend CrisisEvent schema onto the shapes the existing dashboard
// components expect (map markers + incident list cards).

const SEVERITY_TONE = {
  critical: 'critical',
  danger: 'high',
  warning: 'medium',
  advisory: 'medium',
  info: 'support',
};

const HAZARD_ICON = {
  environmental: 'flood',
  biological: 'outbreak',
  security: 'fire',
  infrastructure: 'medical',
};

const HAZARD_VICINITY_LABEL = {
  environmental: 'regional',
  biological: 'street-level',
  security: 'localised',
  infrastructure: 'hyperlocal',
};

// CrisisEvent severity → the timeline dot classes (critical | warning | normal).
const TIMELINE_SEVERITY = {
  critical: 'critical',
  danger: 'critical',
  warning: 'warning',
  advisory: 'warning',
  info: 'normal',
};

// Rough lng/lat bounds for Singapore, used to place events on the stylised map.
const LNG_MIN = 103.6;
const LNG_MAX = 104.05;
const LAT_MIN = 1.2;
const LAT_MAX = 1.48;

function clampPercent(value) {
  return Math.max(2, Math.min(98, value));
}

export function projectToMap(lat, lng) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * 100;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 100;
  return { x: clampPercent(x), y: clampPercent(y) };
}

function radiusSize(meters) {
  if (meters <= 200) return 6;
  if (meters <= 500) return 8;
  if (meters <= 1500) return 10;
  return 13;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** CrisisEvent → marker/list-card shape consumed by IncidentMapCanvas + the list. */
export function toMapMarker(event) {
  return {
    id: event.id,
    title: event.title,
    severity: capitalize(event.severity),
    hazardType: capitalize(event.hazardType),
    location: event.area ?? 'Singapore',
    coordinates: event.location ? projectToMap(event.location.lat, event.location.lng) : null,
    radiusSize: radiusSize(event.vicinityRadiusMeters),
    colorTone: SEVERITY_TONE[event.severity] ?? 'support',
    icon: HAZARD_ICON[event.hazardType] ?? 'flood',
    vicinityRadius: `${event.vicinityRadiusMeters} m ${HAZARD_VICINITY_LABEL[event.hazardType] ?? ''}`.trim(),
    advisory: event.title,
    personaImpact: `${event.source} · ${capitalize(event.hazardType)}`,
  };
}

function formatSgtTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Singapore',
  });
  return `${time} SGT`;
}

/** CrisisEvent → timeline item shape consumed by TimelinePanel. */
export function toTimelineItem(event) {
  return {
    time: formatSgtTime(event.updatedAt),
    title: event.title,
    detail: `${capitalize(event.hazardType)} hazard from ${event.source}.`,
    location: event.area ?? 'Singapore',
    severity: TIMELINE_SEVERITY[event.severity] ?? 'normal',
  };
}
