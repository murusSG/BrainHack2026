// frontend/src/services/eventAdapter.js
// Converts the backend's many shapes into ONE unified CrisisEvent shape
// that the UI components consume.

// Approximate centroid coords per region, so region-only data (PSI, PM2.5)
// can still be placed on a map.
const REGION_COORDS = {
  national: { lat: 1.3521, lng: 103.8198 },
  north:    { lat: 1.4304, lng: 103.8354 },
  south:    { lat: 1.2700, lng: 103.8200 },
  east:     { lat: 1.3530, lng: 103.9440 },
  west:     { lat: 1.3400, lng: 103.7050 },
  central:  { lat: 1.3521, lng: 103.8198 },
};

function severityFromPsi(psi) {
  if (psi >= 300) return 'critical';
  if (psi >= 200) return 'high';
  if (psi >= 100) return 'medium';
  if (psi >= 51) return 'low';
  return 'info';
}

function severityFromPm25(pm25) {
  if (pm25 >= 250) return 'critical';
  if (pm25 >= 150) return 'high';
  if (pm25 >= 55) return 'medium';
  return 'low';
}

// --- PSI (region-level haze) ---
export function normalisePsi(psiReadings = []) {
  return psiReadings
    .filter((r) => r.region !== 'national')
    .map((r) => {
      const coords = REGION_COORDS[r.region] ?? REGION_COORDS.central;
      return {
        id: `psi-${r.region}-${r.timestamp}`,
        source: 'NEA',
        hazardType: 'haze',
        severity: severityFromPsi(r.psi),
        title: `PSI ${r.psi} — ${capitalise(r.region)} region`,
        location: `${capitalise(r.region)} region`,
        lat: coords.lat,
        lng: coords.lng,
        vicinityRadiusMeters: 8000, // regional
        timestamp: r.timestamp,
        publicAction:
          r.psi >= 100
            ? 'Limit outdoor activity. Vulnerable groups stay indoors.'
            : 'Air quality is in the moderate range.',
        raw: r,
      };
    });
}

// --- PM2.5 (region-level) ---
export function normalisePm25(pm25Readings = []) {
  return pm25Readings.map((r) => {
    const coords = REGION_COORDS[r.region] ?? REGION_COORDS.central;
    return {
      id: `pm25-${r.region}-${r.timestamp}`,
      source: 'NEA',
      hazardType: 'haze',
      severity: severityFromPm25(r.pm25),
      title: `PM2.5 ${r.pm25} µg/m³ — ${capitalise(r.region)}`,
      location: `${capitalise(r.region)} region`,
      lat: coords.lat,
      lng: coords.lng,
      vicinityRadiusMeters: 8000,
      timestamp: r.timestamp,
      publicAction: 'Fine particle levels — monitor if sensitive to air quality.',
      raw: r,
    };
  });
}

// --- Flood alerts (PUB) ---
export function normaliseFloods(floodAlerts = []) {
  return floodAlerts.map((f, i) => ({
    id: f.id ?? `flood-${i}`,
    source: 'PUB',
    hazardType: 'flood',
    severity: mapFloodSeverity(f.severity),
    title: `Flood alert — ${f.location}`,
    location: f.location,
    lat: f.raw?.latitude ?? f.raw?.lat ?? null,
    lng: f.raw?.longitude ?? f.raw?.lng ?? null,
    vicinityRadiusMeters: 900, // hyperlocal
    timestamp: f.timestamp,
    publicAction: 'Avoid the area. Do not walk or drive through flood water.',
    raw: f,
  }));
}

// --- Dengue clusters (NEA) ---
export function normaliseDengue(clusters = []) {
  return clusters.map((c, i) => {
    const centroid = polygonCentroid(c.geometry);
    return {
      id: `dengue-${i}-${c.locality}`,
      source: 'NEA',
      hazardType: 'dengue',
      severity: c.caseSize >= 10 ? 'high' : c.caseSize >= 5 ? 'medium' : 'low',
      title: `Dengue cluster — ${c.locality} (${c.caseSize} cases)`,
      location: c.locality,
      lat: centroid?.lat ?? null,
      lng: centroid?.lng ?? null,
      vicinityRadiusMeters: 320, // street-level
      timestamp: new Date().toISOString(),
      publicAction: 'Remove stagnant water. Apply repellent. Check for breeding spots.',
      raw: c,
    };
  });
}

// --- Traffic incidents (LTA) ---
export function normaliseTraffic(incidents = []) {
  return incidents.map((t, i) => ({
    id: `traffic-${i}`,
    source: 'LTA',
    hazardType: 'traffic',
    severity: 'medium',
    title: `${t.type} — traffic incident`,
    location: t.message,
    lat: t.latitude,
    lng: t.longitude,
    vicinityRadiusMeters: 500,
    timestamp: new Date().toISOString(),
    publicAction: 'Expect delays. Consider an alternate route.',
    raw: t,
  }));
}

// --- The unifier ---
export function unifyAllEvents({ psi, pm25, floods, dengue, traffic } = {}) {
  return [
    ...normalisePsi(psi),
    ...normalisePm25(pm25),
    ...normaliseFloods(floods),
    ...normaliseDengue(dengue),
    ...normaliseTraffic(traffic),
  ].filter((e) => e.lat != null && e.lng != null); // drop events with no coords
}

// --- helpers ---
function capitalise(s = '') {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function mapFloodSeverity(s = '') {
  const v = String(s).toLowerCase();
  if (v.includes('high') || v.includes('critical')) return 'critical';
  if (v.includes('moderate') || v.includes('alert')) return 'high';
  return 'medium';
}

// Rough centroid of a GeoJSON polygon/multipolygon, for placing dengue clusters.
function polygonCentroid(geometry) {
  if (!geometry?.coordinates) return null;
  let ring = geometry.coordinates;
  // Drill down to a flat array of [lng, lat] pairs
  while (Array.isArray(ring[0]) && Array.isArray(ring[0][0])) {
    ring = ring[0];
  }
  if (!Array.isArray(ring) || !ring.length) return null;
  let sumLat = 0, sumLng = 0;
  for (const point of ring) {
    sumLng += point[0];
    sumLat += point[1];
  }
  return { lat: sumLat / ring.length, lng: sumLng / ring.length };
}