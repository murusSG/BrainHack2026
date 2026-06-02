import { env } from "../../config/env";
import { fetchDatasetRecords, type DataGovFetchMode } from "../../services/dataGovSg.client";
import { UpstreamApiError } from "../../utils/apiError";
import { TtlCache } from "../../utils/cache";
import { haversineDistanceMeters } from "../../utils/geo";
import { firstPresent, slug, toNumber } from "../../utils/records";
import type { NearbyPopulationContext, PopulationContext } from "../../../../shared/types/populationContext";

const cache = new TtlCache<PopulationContext[]>(env.CACHE_TTL_SECONDS * 1000);

export async function getHdbBuildings(): Promise<PopulationContext[]> {
  return cachedContext("hdb:buildings", env.HDB_BUILDINGS_RESOURCE_ID, env.HDB_BUILDINGS_FETCH_MODE, "HDB");
}

export async function getPlanningAreas(): Promise<PopulationContext[]> {
  return cachedContext("population:planning-areas", env.POPULATION_PLANNING_AREAS_RESOURCE_ID, env.POPULATION_PLANNING_AREAS_FETCH_MODE, "DOS");
}

export async function getImpactContext(area: string): Promise<PopulationContext[]> {
  const records = await getPlanningAreas();
  const normalized = area.trim().toUpperCase();
  return records.filter((record) => record.area_name === normalized);
}

export async function getNearbyContext(lat: number, lng: number): Promise<NearbyPopulationContext[]> {
  const records = await getPlanningAreas();
  return records
    .map((record) => ({
      ...record,
      distance_meters:
        record.latitude !== undefined && record.longitude !== undefined
          ? Math.round(haversineDistanceMeters(lat, lng, record.latitude, record.longitude) * 100) / 100
          : undefined,
    }))
    .sort((left, right) => (left.distance_meters ?? Number.POSITIVE_INFINITY) - (right.distance_meters ?? Number.POSITIVE_INFINITY));
}

async function cachedContext(
  cacheKey: string,
  resourceId: string | undefined,
  fetchMode: DataGovFetchMode,
  source: PopulationContext["source"]
): Promise<PopulationContext[]> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  if (!resourceId) throw new UpstreamApiError("Population dataset id is not configured.", { source });
  const rawRecords = await fetchDatasetRecords(resourceId, fetchMode);
  return cache.set(cacheKey, rawRecords.map((record) => normaliseContext(record, source)));
}

function normaliseContext(record: Record<string, unknown>, source: PopulationContext["source"]): PopulationContext {
  const areaLabel = asString(firstPresent(record, ["area_name", "planning_area", "Planning Area", "town", "Number", "Thousands"]));
  const parsedArea = parsePlanningLabel(areaLabel);
  const areaName = String(parsedArea.areaName ?? firstPresent(record, ["bldg_contract_town"]) ?? "UNKNOWN").toUpperCase();
  const subzone = parsedArea.subzone ?? asString(firstPresent(record, ["subzone", "Subzone"]));
  const block = asString(firstPresent(record, ["block", "blk_no"]));
  const street = asString(firstPresent(record, ["street", "street_name"]));
  const householdCount = householdCountFor(record, source);
  const address = asString(firstPresent(record, ["address"])) ?? ([block, street].filter(Boolean).join(" ") || undefined);
  return {
    id: `${source.toLowerCase()}-${slug(areaName)}-${slug(subzone ?? block ?? "context")}`,
    source,
    area_name: areaName,
    subzone,
    dwelling_type: asString(firstPresent(record, ["dwelling_type", "type_of_dwelling"])) ?? (source === "HDB" ? "HDB" : undefined),
    population: toNumber(firstPresent(record, ["population", "resident_population", "Total_Total"])),
    household_count: householdCount,
    block,
    address,
    latitude: toNumber(firstPresent(record, ["latitude", "lat", "Y_ADDR"])),
    longitude: toNumber(firstPresent(record, ["longitude", "lng", "X_ADDR"])),
    updated_at: asString(firstPresent(record, ["updated_at", "last_updated"])),
  };
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}

function parsePlanningLabel(label: string | undefined): { areaName?: string; subzone?: string } {
  if (!label) return {};
  if (label.toLowerCase() === "total") return { areaName: "TOTAL" };
  if (label.endsWith(" - Total")) return { areaName: label.replace(" - Total", "") };
  return { areaName: label, subzone: label };
}

function householdCountFor(record: Record<string, unknown>, source: PopulationContext["source"]): number | undefined {
  const direct = toNumber(firstPresent(record, ["household_count", "households", "resident_households", "total_dwelling_units"]));
  if (direct !== undefined) return direct;
  const thousands = toNumber(firstPresent(record, ["Total"]));
  if (source === "DOS" && thousands !== undefined) return Math.round(thousands * 1000);
  return undefined;
}
