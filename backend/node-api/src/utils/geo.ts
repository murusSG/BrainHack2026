import { BadRequestError } from "./apiError";

export function parseCoordinatePair(latValue: unknown, lngValue: unknown): { lat: number; lng: number } {
  if (latValue === undefined || lngValue === undefined) {
    throw new BadRequestError("Latitude and longitude are required.");
  }

  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new BadRequestError("Latitude and longitude must be numeric.");
  }
  if (lat < -90 || lat > 90) {
    throw new BadRequestError("Latitude must be between -90 and 90.", { lat });
  }
  if (lng < -180 || lng > 180) {
    throw new BadRequestError("Longitude must be between -180 and 180.", { lng });
  }
  return { lat, lng };
}

export function haversineDistanceMeters(startLat: number, startLng: number, endLat: number, endLng: number): number {
  const earthRadiusMeters = 6371000;
  const deltaLat = toRadians(endLat - startLat);
  const deltaLng = toRadians(endLng - startLng);
  const startLatRad = toRadians(startLat);
  const endLatRad = toRadians(endLat);
  const value =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(startLatRad) * Math.cos(endLatRad) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(value));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
