// frontend/src/services/api.js
// Bridge between the React frontend and the Node API backend.
// Every backend endpoint wraps its payload as { data, source, fetchedAt }.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

async function request(path, { unwrap = true } = {}) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  // Unwrap the { data, source, fetchedAt } envelope; return the inner data.
  return unwrap ? json.data ?? json : json;
}

async function get(path) {
  return request(path);
}

async function getRaw(path) {
  return request(path, { unwrap: false });
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
