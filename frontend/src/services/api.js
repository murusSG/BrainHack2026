import { supabase } from './supabaseClient';

// VITE_API_BASE is the Node API origin; the /api/v1 prefix is added here so the
// whole frontend uses one convention regardless of which helper it calls.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

/** Build request headers, attaching the Supabase access token when signed in. */
async function authHeaders() {
  const headers = {};
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** GET /api/v1<path>, returning the raw JSON envelope ({ data, source, fetchedAt }). */
export async function apiGet(path) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE}/api/v1${path}`, { headers });
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return response.json();
}

// --- Typed API surface used by the resident/responder/hospital hooks. ---
// Every backend endpoint wraps its payload as { data, source, fetchedAt }.

async function request(path, { unwrap = true } = {}) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/api/v1${path}`, { headers });
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
