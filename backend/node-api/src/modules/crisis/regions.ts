import type { GeoPoint } from "../../../../shared/types/crisisEvent";

/**
 * Representative coordinates for NEA's five reporting regions (plus national),
 * used to place regional readings (PSI/PM2.5) on the map. Approximate centroids.
 */
export const NEA_REGION_COORDS: Record<string, GeoPoint> = {
  national: { lat: 1.3521, lng: 103.8198 },
  central: { lat: 1.3500, lng: 103.8200 },
  north: { lat: 1.4250, lng: 103.8200 },
  south: { lat: 1.2750, lng: 103.8200 },
  east: { lat: 1.3550, lng: 103.9400 },
  west: { lat: 1.3500, lng: 103.7000 },
};

export function regionCoords(region: string): GeoPoint | null {
  return NEA_REGION_COORDS[region.toLowerCase()] ?? null;
}

/** Average of a flat list of [lng, lat] positions to a GeoPoint. */
export function centroidOfPositions(positions: number[][]): GeoPoint | null {
  if (positions.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  for (const [lng, lat] of positions) {
    sumLng += lng;
    sumLat += lat;
  }
  return { lat: sumLat / positions.length, lng: sumLng / positions.length };
}
