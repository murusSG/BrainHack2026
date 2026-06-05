const HAZARD_BY_CANONICAL = {
  FIRE: 'fire',
  FLOOD: 'flood',
  ROAD_INCIDENT: 'traffic',
  INFECTIOUS_DISEASE: 'medical',
  MEDICAL_EMERGENCY: 'medical',
};

const ADDRESS_COORDINATES = [
  {
    pattern: /\bdepot\s+road\b/i,
    lat: 1.2805,
    lng: 103.8107,
  },
];

export async function normaliseIncidentClusters(clusters = [], api) {
  const mapped = await Promise.all(clusters.map((cluster) => clusterToMapEvent(cluster, api)));
  return mapped.filter(Boolean);
}

export function isClusterPendingReview(cluster) {
  return cluster.resource_allocation_status === 'pending_dispatcher_approval';
}

export function clusterToRecommendation(cluster) {
  if (!cluster?.recommendations) return null;
  const recommendation = cluster.recommendations;
  const agencies = [
    ...(recommendation.mandatory_agencies ?? []).map((agency) => ({
      ...agency,
      channel: 'Mandatory agency',
    })),
    ...(recommendation.suggested_agencies ?? []).map((agency) => ({
      ...agency,
      channel: 'Suggested agency',
    })),
  ];

  if (!agencies.length) return null;

  const approved = new Set(cluster.approved_agencies ?? []);
  const extracted = cluster.extracted_incident ?? {};
  const location = extracted.location_text || 'Location pending';
  const riskNotes = recommendation.risk_notes ?? [];

  return {
    id: `incident-cluster-${cluster.incident_id}`,
    sourceType: 'incident_cluster',
    incidentId: cluster.incident_id,
    incidentTitle: `${titleCase(extracted.incident_type || 'Incident')} - ${location}`,
    severity: severityForAllocation(extracted.severity),
    confidence: Math.round((Number(extracted.confidence) || 0.72) * 100),
    generatedAt: formatGeneratedAt(cluster.created_at),
    generatedFrom: 'Generated from public incident report grouping',
    linkedPrediction: location,
    modelVersion: 'MURUS-INCIDENT-GROUPING-1.0',
    triggerSignals: [
      `${cluster.reports?.length ?? 0} report${cluster.reports?.length === 1 ? '' : 's'} in cluster`,
      `Status: ${cluster.resource_allocation_status?.replaceAll('_', ' ') ?? 'pending review'}`,
      riskNotes[0] ?? 'Dispatcher approval required before agency notification',
    ],
    draftMessage:
      `Review ${cluster.incident_id} before any agency notification. ` +
      `${extracted.description || 'Public report details require responder validation.'}`,
    agencies: agencies.map((agency, index) => ({
      id: `${slug(agency.agency)}-${index}`,
      agency: agency.agency,
      channel: agency.channel,
      confidence: confidenceToPercent(agency.confidence, index),
      reason: agency.reason || 'Responder review required.',
      suggestedAction: 'Approve recommendation only after validating incident details.',
      status: approved.has(agency.agency) ? 'approved' : 'pending_approval',
    })),
  };
}

async function clusterToMapEvent(cluster, api) {
  const coordinates = await coordinatesForCluster(cluster, api);
  if (!coordinates) return null;

  const extracted = cluster.extracted_incident ?? {};
  const approvedAgencies = cluster.approved_agencies ?? [];
  const approvalStatus = cluster.resource_allocation_status === 'approved' ? 'approved' : 'pending';
  const dispatchLog = approvedAgencies.length
    ? `Approved agencies: ${approvedAgencies.join(', ')}.`
    : 'Awaiting selected agency approval.';
  const location = extracted.location_text || cluster.canonical_event?.location?.addressText || 'Location pending';

  return {
    id: `cluster-${cluster.incident_id}`,
    source: 'MURUS',
    hazardType: hazardFromCluster(cluster),
    severity: severityFromCluster(cluster),
    title: `${titleCase(extracted.incident_type || 'Incident')} - ${cluster.incident_id}`,
    location,
    lat: coordinates.lat,
    lng: coordinates.lng,
    vicinityRadiusMeters: cluster.canonical_event?.vicinityRadiusMeters ?? 500,
    timestamp: cluster.updated_at ?? cluster.created_at,
    publicAction: dispatchLog,
    approvalStatus,
    dispatchLog,
    raw: cluster,
  };
}

async function coordinatesForCluster(cluster, api) {
  const canonicalLocation = cluster.canonical_event?.location;
  const canonicalLat = Number(canonicalLocation?.latitude);
  const canonicalLng = Number(canonicalLocation?.longitude);
  if (Number.isFinite(canonicalLat) && Number.isFinite(canonicalLng)) {
    return { lat: canonicalLat, lng: canonicalLng };
  }

  const reportLocation = cluster.reports?.find((report) => report.reporter_location)?.reporter_location;
  const reportLat = Number(reportLocation?.lat);
  const reportLng = Number(reportLocation?.lng);
  if (Number.isFinite(reportLat) && Number.isFinite(reportLng)) {
    return { lat: reportLat, lng: reportLng };
  }

  const locationText =
    cluster.extracted_incident?.location_text || cluster.canonical_event?.location?.addressText;
  if (!locationText) return null;

  for (const query of geocodeQueries(locationText)) {
    try {
      const results = await api.oneMapSearch(query);
      const first = Array.isArray(results) ? results[0] : results?.results?.[0];
      const lat = Number(first?.latitude ?? first?.LATITUDE);
      const lng = Number(first?.longitude ?? first?.LONGITUDE);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    } catch {
      continue;
    }
  }

  const knownAddress = ADDRESS_COORDINATES.find((item) => item.pattern.test(locationText));
  if (knownAddress) return { lat: knownAddress.lat, lng: knownAddress.lng };

  return null;
}

function geocodeQueries(locationText) {
  const normalized = locationText.replace(/\s+/g, ' ').trim();
  const withoutCountry = normalized.replace(/,\s*Singapore\s*$/i, '').trim();
  return Array.from(
    new Set([
      normalized,
      withoutCountry,
      `${withoutCountry}, Singapore`,
      normalized.toUpperCase(),
    ].filter(Boolean))
  );
}

function hazardFromCluster(cluster) {
  const hazard = String(cluster.canonical_event?.hazardType ?? '').toUpperCase();
  return HAZARD_BY_CANONICAL[hazard] ?? 'incident';
}

function severityFromCluster(cluster) {
  const severity = String(cluster.extracted_incident?.severity ?? cluster.canonical_event?.severity ?? '').toLowerCase();
  if (severity === 'critical') return 'critical';
  if (severity === 'high') return 'high';
  if (severity === 'moderate' || severity === 'medium') return 'medium';
  return 'low';
}

function severityForAllocation(severity) {
  if (severity === 'critical' || severity === 'danger') return 'critical';
  if (severity === 'warning' || severity === 'high') return 'high';
  return 'medium';
}

function confidenceToPercent(value, index) {
  if (typeof value === 'number') return Math.max(45, Math.min(99, Math.round(value)));
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'high') return Math.max(78, 88 - index * 4);
  if (normalized === 'medium') return Math.max(62, 74 - index * 4);
  if (normalized === 'low') return 55;
  return Math.max(62, 78 - index * 5);
}

function formatGeneratedAt(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'just now';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} hrs ago`;
}

function slug(value = '') {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'agency'
  );
}

function titleCase(value = '') {
  return (
    value
      .split(' ')
      .filter(Boolean)
      .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
      .join(' ') || 'Incident'
  );
}
