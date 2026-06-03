import { env } from "../../config/env";
import { fetchDatasetRecords, type DataGovFetchMode } from "../../services/dataGovSg.client";
import { UpstreamApiError } from "../../utils/apiError";
import { TtlCache } from "../../utils/cache";
import { firstPresent, slug, toNumber } from "../../utils/records";
import type { HealthSignal, HealthSignalType, SignalSeverity } from "../../../../shared/types/healthSignal";

const cache = new TtlCache<HealthSignal[]>(env.CACHE_TTL_SECONDS * 1000);

export async function getInfectiousDiseases(disease?: string): Promise<HealthSignal[]> {
  const records = await cachedSignals(
    "moh:infectious",
    env.MOH_INFECTIOUS_DISEASES_RESOURCE_ID,
    env.MOH_INFECTIOUS_DISEASES_FETCH_MODE,
    "INFECTIOUS_DISEASE"
  );
  if (!disease) return records;
  const normalized = disease.toLowerCase();
  return records.filter((record) => record.disease?.toLowerCase().includes(normalized));
}

export async function getHealthCapacity(): Promise<HealthSignal[]> {
  return cachedSignals("moh:capacity", env.MOH_HEALTH_CAPACITY_RESOURCE_ID, env.MOH_HEALTH_CAPACITY_FETCH_MODE, "HEALTH_CAPACITY");
}

export async function getCovidWeekly(): Promise<HealthSignal[]> {
  return cachedSignals("moh:covid-weekly", env.MOH_COVID_WEEKLY_RESOURCE_ID, env.MOH_COVID_WEEKLY_FETCH_MODE, "COVID");
}

export async function getSignalsSummary() {
  const infectious = await getInfectiousDiseases();
  const covid = await getCovidWeekly();
  const capacity = await getHealthCapacity();
  const highest = infectious.reduce<HealthSignal | undefined>(
    (current, signal) => (!current || signal.value > current.value ? signal : current),
    undefined
  );
  return {
    infectiousDiseaseSignals: infectious.length,
    covidSignals: covid.length,
    healthCapacitySignals: capacity.length,
    highestCaseSignal: highest,
    dorscon: env.ENABLE_MOCK_DORSCON ? "CONFIGURED_MOCK" : "NOT_CONFIGURED",
    requiresHumanReview: true,
  };
}

async function cachedSignals(
  cacheKey: string,
  resourceId: string | undefined,
  fetchMode: DataGovFetchMode,
  type: HealthSignalType
): Promise<HealthSignal[]> {
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  if (!resourceId) throw new UpstreamApiError("MOH dataset id is not configured.", { type });
  const rawRecords = await fetchDatasetRecords(resourceId, fetchMode);
  return cache.set(cacheKey, rawRecords.map((record) => normaliseHealthSignal(record, type)));
}

function normaliseHealthSignal(record: Record<string, unknown>, type: HealthSignalType): HealthSignal {
  const disease = String(
    firstPresent(record, ["disease", "Disease", "disease_name", "condition", "name", "indicator", "facility_type_a"]) ??
      (type === "COVID" ? "COVID-19" : "Unknown")
  );
  const epiWeek = firstPresent(record, ["epi_week", "epi week", "week", "epiweek"]);
  const year = toNumber(firstPresent(record, ["year", "Year", "epi_year"]));
  const value =
    toNumber(firstPresent(record, ["value", "cases", "count", "no_of_cases", "no._of_cases", "est_count", "no_beds", "beds", "capacity"])) ??
    0;
  return {
    id: `moh-${type.toLowerCase()}-${slug(disease)}-${slug(String(epiWeek ?? year ?? "latest"))}`,
    source: "MOH",
    health_signal_type: type,
    disease,
    epi_week: epiWeek ? String(epiWeek) : undefined,
    year,
    value,
    unit: String(firstPresent(record, ["unit", "Unit"]) ?? (type === "HEALTH_CAPACITY" ? "beds" : "cases")),
    trend_direction: "UNKNOWN",
    severity: severityFor(value, type),
    updated_at: asString(firstPresent(record, ["updated_at", "last_updated"])),
  };
}

function severityFor(value: number, type: HealthSignalType): SignalSeverity {
  if (type === "HEALTH_CAPACITY") return "INFO";
  if (value >= 500) return "HIGH";
  if (value >= 100) return "MODERATE";
  return "LOW";
}

function asString(value: unknown): string | undefined {
  return value === undefined || value === null || value === "" ? undefined : String(value);
}
