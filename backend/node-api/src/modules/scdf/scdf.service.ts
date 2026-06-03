import { env } from "../../config/env";
import { fetchDatasetRecords, type DataGovFetchMode } from "../../services/dataGovSg.client";
import { UpstreamApiError, BadRequestError } from "../../utils/apiError";
import { TtlCache } from "../../utils/cache";
import { haversineDistanceMeters } from "../../utils/geo";
import { firstPresent, slug, toNumber } from "../../utils/records";
import type { NearestResourceLocation, ResourceLocation, ScdfResourceType } from "../../../../shared/types/resourceLocation";

const cache = new TtlCache<ResourceLocation[]>(env.CACHE_TTL_SECONDS * 1000);

const typeAliases: Record<string, ScdfResourceType> = {
  fire_station: "FIRE_STATION",
  "fire-station": "FIRE_STATION",
  shelter: "SHELTER",
  aed: "AED",
};

export function parseScdfResourceType(value: unknown): ScdfResourceType | undefined {
  if (value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  const resourceType = typeAliases[normalized];
  if (!resourceType) throw new BadRequestError("Unsupported SCDF resource type.", { type: value });
  return resourceType;
}

export async function getResources(resourceType?: ScdfResourceType): Promise<ResourceLocation[]> {
  const cacheKey = `scdf:${resourceType ?? "all"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const types = resourceType ? [resourceType] : (["FIRE_STATION", "SHELTER", "AED"] as ScdfResourceType[]);
  const records: ResourceLocation[] = [];

  for (const type of types) {
    const resourceId = resourceIdFor(type);
    if (!resourceId) throw new UpstreamApiError("SCDF dataset id is not configured.", { resourceType: type });
    const rawRecords = await fetchDatasetRecords(resourceId, fetchModeFor(type));
    records.push(...rawRecords.map((record) => normaliseScdfRecord(record, type)));
  }

  return cache.set(cacheKey, records);
}

export async function getNearestResources(lat: number, lng: number, resourceType?: ScdfResourceType): Promise<NearestResourceLocation[]> {
  const resources = await getResources(resourceType);
  return resources
    .filter((resource) => resource.latitude !== undefined && resource.longitude !== undefined)
    .map((resource) => ({
      ...resource,
      distance_meters: Math.round(haversineDistanceMeters(lat, lng, resource.latitude as number, resource.longitude as number) * 100) / 100,
    }))
    .sort((left, right) => left.distance_meters - right.distance_meters);
}

function resourceIdFor(resourceType: ScdfResourceType): string | undefined {
  return {
    FIRE_STATION: env.SCDF_FIRE_STATIONS_RESOURCE_ID,
    SHELTER: env.SCDF_SHELTERS_RESOURCE_ID,
    AED: env.SCDF_AEDS_RESOURCE_ID,
  }[resourceType];
}

function fetchModeFor(resourceType: ScdfResourceType): DataGovFetchMode {
  return {
    FIRE_STATION: env.SCDF_FIRE_STATIONS_FETCH_MODE,
    SHELTER: env.SCDF_SHELTERS_FETCH_MODE,
    AED: env.SCDF_AEDS_FETCH_MODE,
  }[resourceType];
}

function normaliseScdfRecord(record: Record<string, unknown>, resourceType: ScdfResourceType): ResourceLocation {
  const rawId = firstPresent(record, ["_id", "id", "serial_no", "name", "NAME"]);
  const name = String(firstPresent(record, ["name", "NAME", "description", "DESCRIPTION"]) ?? `SCDF ${resourceType}`);
  const capacity = toNumber(firstPresent(record, ["capacity", "CAPACITY"]));
  return {
    id: `scdf-${resourceType.toLowerCase()}-${slug(String(rawId ?? name))}`,
    source: "SCDF",
    resource_type: resourceType,
    name,
    address: asString(firstPresent(record, ["address", "ADDRESS", "location", "LOCATION"])),
    latitude: toNumber(firstPresent(record, ["latitude", "LATITUDE", "lat", "Y_ADDR", "y"])),
    longitude: toNumber(firstPresent(record, ["longitude", "LONGITUDE", "lng", "lon", "X_ADDR", "x"])),
    operating_hours: asString(firstPresent(record, ["operating_hours", "OPERATING_HOURS"])),
    capacity,
    contact: asString(firstPresent(record, ["contact", "CONTACT", "telephone", "TEL"])),
    raw_source_id: rawId ? String(rawId) : undefined,
    updated_at: asString(firstPresent(record, ["updated_at", "last_updated", "LAST_UPDATED"])),
  };
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}
