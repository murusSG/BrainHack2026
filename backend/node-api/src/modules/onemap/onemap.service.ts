import { oneMapClient, type RouteMode } from "../../services/oneMap.client";
import { toNumber } from "../../utils/records";
import type { OneMapLocation, OneMapRoute } from "../../../../shared/types/geoLocation";

interface SearchPayload {
  results?: Record<string, unknown>[];
}

interface ReversePayload {
  GeocodeInfo?: Record<string, unknown>[];
  results?: Record<string, unknown>[];
}

export async function search(query: string): Promise<OneMapLocation[]> {
  const payload = (await oneMapClient.search(query)) as SearchPayload;
  return (payload.results ?? []).flatMap((item) => {
    const latitude = toNumber(item.LATITUDE);
    const longitude = toNumber(item.LONGITUDE);
    if (latitude === undefined || longitude === undefined) return [];
    return [
      {
        query,
        address: [item.BLK_NO, item.ROAD_NAME, item.POSTAL].filter(Boolean).join(" "),
        postal_code: asString(item.POSTAL),
        building: asString(item.BUILDING),
        road_name: asString(item.ROAD_NAME),
        latitude,
        longitude,
        source: "ONEMAP" as const,
      },
    ];
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<OneMapLocation[]> {
  const payload = (await oneMapClient.reverseGeocode(lat, lng)) as ReversePayload;
  return (payload.GeocodeInfo ?? payload.results ?? []).map((item) => ({
    address: asString(item.BUILDINGNAME) ?? asString(item.ROAD) ?? asString(item.ADDRESS) ?? "Unknown address",
    postal_code: asString(item.POSTALCODE) ?? asString(item.POSTAL),
    building: asString(item.BUILDINGNAME),
    road_name: asString(item.ROAD),
    latitude: lat,
    longitude: lng,
    source: "ONEMAP" as const,
  }));
}

export async function route(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  mode: RouteMode
): Promise<OneMapRoute> {
  const payload = (await oneMapClient.route(startLat, startLng, endLat, endLng, mode)) as Record<string, unknown>;
  const summary = (payload.route_summary ?? {}) as Record<string, unknown>;
  return {
    source: "ONEMAP",
    mode,
    distance_meters: toNumber(summary.total_distance ?? payload.distance),
    duration_seconds: toNumber(summary.total_time ?? payload.duration),
    geometry: asString(payload.route_geometry),
  };
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}
