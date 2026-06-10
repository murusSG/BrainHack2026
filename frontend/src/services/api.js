// frontend/src/services/api.js
// Bridge between the React frontend and the Node API backend.
// Every backend endpoint wraps its payload as { data, source, fetchedAt }.

const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
const configuredApiBase = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  runtimeOrigin ||
  'http://localhost:3000'
).replace(/\/+$/, '');
const API_BASE = configuredApiBase.endsWith('/api/v1')
  ? configuredApiBase
  : `${configuredApiBase}/api/v1`;

async function request(path, { unwrap = true, method = 'GET', body, headers: extraHeaders } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network request failed.';
    console.error('[api] request failed before response', { apiBase: API_BASE, path, method, message });
    throw new Error(`Could not reach the Node API at ${API_BASE}. ${message}`);
  }

  if (!res.ok) {
    let errorMessage = `API ${path} failed: ${res.status} ${res.statusText}`;
    try {
      const failure = await res.json();
      errorMessage = failure?.error?.message || failure?.message || errorMessage;
    } catch {
      // Ignore non-JSON error bodies and keep the fallback message.
    }
    throw new Error(errorMessage);
  }
  const json = await res.json();
  // Unwrap the { data, source, fetchedAt } envelope; return the inner data.
  return unwrap ? json.data ?? json : json;
}

async function get(path) {
  return request(path);
}

async function post(path, body, token) {
  return request(path, {
    method: 'POST',
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
}

async function patch(path, body) {
  return request(path, { method: 'PATCH', body });
}

async function getRaw(path) {
  return request(path, { unwrap: false });
}

async function authedGet(path, token) {
  return request(path, { headers: { Authorization: `Bearer ${token}` } });
}

async function authedPost(path, token, body) {
  return request(path, {
    method: 'POST',
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function authedPatch(path, token, body) {
  return request(path, {
    method: 'PATCH',
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
}

function withQuery(path, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export const api = {
  authedGet,
  authedPost,
  authedPatch,

  // NEA environmental
  psi: () => get('/environmental/psi'),
  pm25: () => get('/environmental/pm25'),
  rainfall: () => get('/environmental/rainfall'),
  weather: () => get('/environmental/weather'),

  // NEA dengue
  dengueClusters: () => get('/dengue/clusters'),

  // PUB flood
  floodAlerts: () => get('/flood/alerts'),
  waterSensors: () => get('/flood/sensors'),

  // LTA transport (needs LTA_API_KEY in backend .env, may fail without it)
  trafficIncidents: () => get('/transport/incidents'),
  trainAlerts: () => get('/transport/train-alerts'),
  ltaFloodAlerts: () => get('/transport/flood-alerts'),

  // Crisis aggregator
  crisisEvents: (params = {}) => get(withQuery('/crisis/events', params)),
  crisisEvent: (id) => get(`/crisis/events/${encodeURIComponent(id)}`),

  // Resident-facing citizen alert channel
  residentAlerts: (params = {}) => get(withQuery('/resident-alerts', params)),
  askMurus: (payload) => post('/resident-alerts/ask-murus', payload),
  publishResidentAlert: (payload, token) => post('/resident-alerts', payload, token),
  updateResidentAlert: (id, payload, token) =>
    authedPatch(`/resident-alerts/${encodeURIComponent(id)}`, token, payload),

  // Deterministic foresight engine with optional LLM narrative layer
  foresightPredictions: (params = {}) => get(withQuery('/foresight/predictions', params)),

  // Command state: persisted demo recommendations and timeline decisions
  commandAllocations: () => get('/command/allocations'),
  commandTimeline: () => get('/command/timeline'),
  createCommandAllocation: (payload) => post('/command/allocations', payload),
  updateCommandAllocationAgencies: (id, payload) =>
    patch(`/command/allocations/${encodeURIComponent(id)}/agencies`, payload),

  // AI-assisted incident grouping and dispatcher approval
  reportIncident: (payload) => post('/incidents/report', payload),
  publicIncidentReports: async () => {
    const response = await get('/incidents/public-reports');
    return response.reports ?? [];
  },
  incidents: async (params = {}) => {
    const response = await get(withQuery('/incidents', params));
    return response.incidents ?? [];
  },
  incidentClusters: async () => {
    const response = await get('/incidents/clusters');
    return response.clusters ?? [];
  },
  incidentPriorityQueue: async () => {
    const response = await get('/incidents/priority-queue');
    return response.items ?? [];
  },
  responderIncidents: async () => {
    const response = await get('/incidents/responder');
    return response.incidents ?? [];
  },
  responderLogs: async (incidentId) => {
    const response = await get(`/incidents/${encodeURIComponent(incidentId)}/logs`);
    return response.logs ?? [];
  },
  createResponderLog: (incidentId, payload) =>
    post(`/incidents/${encodeURIComponent(incidentId)}/logs`, payload),
  incident: async (incidentId) => {
    const response = await get(`/incidents/${encodeURIComponent(incidentId)}`);
    return response.incident ?? response;
  },
  updateIncidentStatus: async (incidentId, payload) => {
    const response = await patch(`/incidents/${encodeURIComponent(incidentId)}/status`, payload);
    return response.incident ?? response;
  },
  incidentCluster: (incidentId) => get(`/incidents/clusters/${encodeURIComponent(incidentId)}`),
  approveResourceAllocation: (payload) => post('/resource-allocation/approve', payload),
  decideResourceAllocation: (payload) => post('/resource-allocation/decision', payload),
  incidentReports: async (incidentId, token) => {
    const response = await authedGet(
      `/incidents/${encodeURIComponent(incidentId)}/reports`,
      token
    );
    return response.reports ?? [];
  },
  createIncidentReport: (incidentId, token, payload) =>
    authedPost(
      `/incidents/${encodeURIComponent(incidentId)}/reports`,
      token,
      payload
    ),
  updateIncidentReport: (incidentId, reportId, token, payload) =>
    authedPatch(
      `/incidents/${encodeURIComponent(incidentId)}/reports/${encodeURIComponent(reportId)}`,
      token,
      payload
    ),

  // SCDF public resources
  scdfResources: (type) => get(withQuery('/scdf/resources', { type })),
  scdfNearest: (lat, lng, type) => get(withQuery('/scdf/nearest', { lat, lng, type })),

  // MOH public health signals and hospital/public facility datasets
  mohSignalsSummary: () => get('/moh/signals/summary'),
  hospitalOccupancy: () => getRaw('/hospitals/occupancy'),
  hospitalReference: () => getRaw('/hospitals/reference'),
  hospitalSources: () => getRaw('/hospitals/sources'),

  // OneMap and HDB/population context
  oneMapSearch: (query) => get(withQuery('/onemap/search', { query })),
  oneMapReverseGeocode: (lat, lng) => get(withQuery('/onemap/reverse-geocode', { lat, lng })),
  oneMapRoute: ({ startLat, startLng, endLat, endLng, mode = 'drive' }) =>
    get(withQuery('/onemap/route', { startLat, startLng, endLat, endLng, mode })),
  hdbBuildings: () => get('/hdb/buildings'),
  populationNearbyContext: (lat, lng) => get(withQuery('/population/nearby-context', { lat, lng })),

  // Convenience: fetch everything in parallel, tolerate individual failures
  async fetchAll() {
    const results = await Promise.allSettled([
      this.psi(),
      this.pm25(),
      this.floodAlerts(),
      this.dengueClusters(),
      this.trafficIncidents(),
    ]);
    const [psi, pm25, floods, dengue, traffic] = results.map((r) =>
      r.status === 'fulfilled' ? r.value : []
    );
    return { psi, pm25, floods, dengue, traffic };
  },
};
