// frontend/src/services/api.js
// Bridge between the React frontend and the Node API backend.
// Every backend endpoint wraps its payload as { data, source, fetchedAt }.

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  // Unwrap the { data, source, fetchedAt } envelope; return the inner data.
  return json.data ?? json;
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