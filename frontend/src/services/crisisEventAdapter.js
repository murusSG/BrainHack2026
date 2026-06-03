const SEVERITY_MAP = {
  critical: 'critical',
  danger: 'critical',
  warning: 'high',
  advisory: 'medium',
  info: 'low',
};

const HAZARD_MAP = {
  environmental: {
    default: 'weather',
    'flood-alert': 'flood',
    psi: 'haze',
    pm25: 'haze',
  },
  biological: {
    default: 'medical',
    'dengue-cluster': 'dengue',
  },
  security: {
    default: 'security',
  },
  infrastructure: {
    default: 'traffic',
    'traffic-incident': 'traffic',
    'flood-alert': 'flood',
  },
};

const ACTION_BY_CATEGORY = {
  'flood-alert': 'Avoid the affected area and do not enter flood water.',
  'dengue-cluster': 'Remove stagnant water and use repellent near the affected area.',
  psi: 'Limit outdoor activity if air quality worsens.',
  pm25: 'Monitor fine-particle levels if sensitive to air quality.',
  'traffic-incident': 'Expect delays and consider alternate routing.',
};

export function normaliseCrisisEvents(events = []) {
  return events
    .map((event) => {
      const hazardType =
        HAZARD_MAP[event.hazardType]?.[event.category] ??
        HAZARD_MAP[event.hazardType]?.default ??
        'hazard';
      return {
        id: event.id,
        source: event.source,
        hazardType,
        severity: SEVERITY_MAP[event.severity] ?? 'low',
        title: event.title,
        location: event.area ?? event.title,
        lat: event.location?.lat ?? null,
        lng: event.location?.lng ?? null,
        vicinityRadiusMeters: event.vicinityRadiusMeters ?? 500,
        timestamp: event.updatedAt ?? event.startedAt ?? new Date().toISOString(),
        publicAction: ACTION_BY_CATEGORY[event.category] ?? 'Follow official advisories for this incident.',
        raw: event,
      };
    })
    .filter((event) => event.lat != null && event.lng != null);
}
