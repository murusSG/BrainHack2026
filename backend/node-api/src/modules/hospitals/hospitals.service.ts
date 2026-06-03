import axios from "axios";
import * as XLSX from "xlsx";
import { env } from "../../config/env";
import { fetchDatasetRecords, type DataGovFetchMode } from "../../services/dataGovSg.client";
import { ApiError } from "../../utils/apiError";
import { firstPresent, toNumber } from "../../utils/records";
import type {
  HospitalApiResponse,
  HospitalMetric,
  HospitalSourceError,
  HospitalSourceMetadata,
} from "./hospitals.types";

const MOH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36";

const HOSPITAL_NAMES: Record<string, string> = {
  AH: "Alexandra Hospital",
  CGH: "Changi General Hospital",
  KTPH: "Khoo Teck Puat Hospital",
  NTFGH: "Ng Teng Fong General Hospital",
  "NUH(A)": "National University Hospital (Adults)",
  SGH: "Singapore General Hospital",
  SKH: "Sengkang General Hospital",
  TTSH: "Tan Tock Seng Hospital",
  WH: "Woodlands Health",
};

interface SourceResult {
  data: HospitalMetric[];
  sources: HospitalSourceMetadata[];
  errors: HospitalSourceError[];
  attempted: boolean;
}

export class PublicHospitalDataService {
  async getOccupancy(): Promise<HospitalApiResponse> {
    return buildResponse([await this.fetchMohWideWorkbook("occupancy")]);
  }

  async getWaitingTimes(): Promise<HospitalApiResponse> {
    const sources = [await this.fetchMohWideWorkbook("admission-waiting-time")];
    if (env.DATA_GOV_ED_WAITING_TIMES_RESOURCE_ID) {
      sources.push(await this.fetchEmergencyDepartmentWaitingTimes());
    }
    return buildResponse(sources);
  }

  async getReference(): Promise<HospitalApiResponse> {
    return buildResponse([await this.fetchFacilityReference()]);
  }

  getSources(): HospitalApiResponse {
    return {
      status: "success",
      data: [],
      sources: [
        mohSource("Beds Occupancy Rate", env.MOH_BEDS_OCCUPANCY_URL, "Beds occupancy rate statistics; parsed from the official MOH workbook download."),
        mohSource(
          "Waiting Time for Admission to Ward",
          env.MOH_WAITING_TIME_ADMISSION_URL,
          "Daily median waiting time from decision to admit to exiting the emergency department for ward admission."
        ),
        dataGovSource(
          "data.gov.sg Emergency Department Waiting Times",
          env.DATA_GOV_ED_WAITING_TIMES_RESOURCE_ID,
          env.DATA_GOV_ED_WAITING_TIMES_FETCH_MODE,
          "Optional source. The previously suggested dataset id returned 404 during validation, so this is only queried when configured."
        ),
        dataGovSource(
          "MOH Health Facilities and Beds",
          env.MOH_HEALTH_CAPACITY_RESOURCE_ID,
          env.MOH_HEALTH_CAPACITY_FETCH_MODE,
          "Static/reference health facilities and beds dataset."
        ),
      ],
      errors: [],
    };
  }

  private async fetchMohWideWorkbook(kind: "occupancy" | "admission-waiting-time"): Promise<SourceResult> {
    const sourceName = kind === "occupancy" ? "MOH Beds Occupancy Rate" : "MOH Waiting Time for Admission to Ward";
    const sourceUrl = kind === "occupancy" ? env.MOH_BEDS_OCCUPANCY_URL : env.MOH_WAITING_TIME_ADMISSION_URL;
    const metricName = kind === "occupancy" ? "Beds Occupancy Rate" : "Waiting Time for Admission to Ward";
    const unit = kind === "occupancy" ? "%" : "hours";

    try {
      const downloadUrl = await findWorkbookDownloadUrl(sourceUrl);
      const rows = await fetchWorkbookRows(downloadUrl);
      const data = normaliseWideHospitalRows(rows, {
        metricName,
        unit,
        sourceName,
        sourceUrl,
        notes:
          kind === "occupancy"
            ? "Public statistical BOR based on MOH midnight bed census; not real-time operational capacity."
            : "Public daily median waiting time statistic; not a real-time queue or transfer feed.",
      });

      if (data.length === 0) {
        return sourceFailure(sourceName, sourceUrl, "UNPARSEABLE_SOURCE", "MOH workbook did not contain parseable hospital metrics.");
      }

      return {
        attempted: true,
        data,
        sources: [mohSource(sourceName, sourceUrl, `Downloaded workbook: ${downloadUrl}`)],
        errors: [],
      };
    } catch (err) {
      return sourceFailure(sourceName, sourceUrl, "SOURCE_UNAVAILABLE", publicErrorMessage(err));
    }
  }

  private async fetchEmergencyDepartmentWaitingTimes(): Promise<SourceResult> {
    const sourceName = "data.gov.sg Emergency Department Waiting Times";
    const datasetId = env.DATA_GOV_ED_WAITING_TIMES_RESOURCE_ID;
    const fetchMode = env.DATA_GOV_ED_WAITING_TIMES_FETCH_MODE;

    if (!datasetId) {
      return sourceFailure(sourceName, dataGovDatasetUrl(undefined), "SOURCE_NOT_CONFIGURED", "Emergency department waiting-time dataset is not configured.");
    }

    try {
      const records = await fetchDatasetRecords(datasetId, fetchMode, 100, 20);
      const data = records.map((record) => normaliseEdWaitingTime(record, datasetId)).filter(isHospitalMetric);
      if (data.length === 0) {
        return sourceFailure(sourceName, dataGovDatasetUrl(datasetId), "UNPARSEABLE_SOURCE", "Dataset returned no parseable waiting-time metrics.", datasetId);
      }

      return {
        attempted: true,
        data,
        sources: [dataGovSource(sourceName, datasetId, fetchMode, "Public ED waiting-time dataset configured through data.gov.sg.")],
        errors: [],
      };
    } catch (err) {
      return sourceFailure(sourceName, dataGovDatasetUrl(datasetId), "SOURCE_UNAVAILABLE", publicErrorMessage(err), datasetId);
    }
  }

  private async fetchFacilityReference(): Promise<SourceResult> {
    const sourceName = "MOH Health Facilities and Beds";
    const datasetId = env.MOH_HEALTH_CAPACITY_RESOURCE_ID;
    const fetchMode = env.MOH_HEALTH_CAPACITY_FETCH_MODE;

    if (!datasetId) {
      return sourceFailure(sourceName, dataGovDatasetUrl(undefined), "SOURCE_NOT_CONFIGURED", "MOH health facilities and beds dataset id is not configured.");
    }

    try {
      const records = await fetchDatasetRecords(datasetId, fetchMode, 100, 20);
      const data = records.map((record) => normaliseFacilityReference(record, datasetId)).filter(isHospitalMetric);
      if (data.length === 0) {
        return sourceFailure(sourceName, dataGovDatasetUrl(datasetId), "UNPARSEABLE_SOURCE", "Dataset returned no parseable facility reference metrics.", datasetId);
      }

      return {
        attempted: true,
        data,
        sources: [dataGovSource(sourceName, datasetId, fetchMode, "Static/reference public facility and bed capacity data.")],
        errors: [],
      };
    } catch (err) {
      return sourceFailure(sourceName, dataGovDatasetUrl(datasetId), "SOURCE_UNAVAILABLE", publicErrorMessage(err), datasetId);
    }
  }
}

export const publicHospitalDataService = new PublicHospitalDataService();

export function normaliseWideHospitalRows(
  rows: unknown[][],
  options: {
    metricName: string;
    unit: string;
    sourceName: string;
    sourceUrl: string;
    notes: string;
  }
): HospitalMetric[] {
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell ?? "").trim().toLowerCase() === "date"));
  if (headerIndex < 0) return [];

  const headers = rows[headerIndex].map((cell) => String(cell ?? "").trim());
  const dateIndex = headers.findIndex((header) => header.toLowerCase() === "date");
  if (dateIndex < 0) return [];

  return rows
    .slice(headerIndex + 1)
    .flatMap((row) => {
      const lastUpdated = asString(row[dateIndex]);
      if (!lastUpdated) return [];

      return headers.flatMap((header, index) => {
        if (index === dateIndex || !HOSPITAL_NAMES[header]) return [];
        const value = cleanMetricValue(row[index], options.unit);
        if (value === undefined) return [];
        return [
          {
            metric_name: options.metricName,
            facility_name: HOSPITAL_NAMES[header],
            value,
            unit: options.unit,
            source_name: options.sourceName,
            source_url: options.sourceUrl,
            last_updated: lastUpdated,
            notes: options.notes,
          },
        ];
      });
    })
    .slice(-500);
}

export function normaliseFacilityReference(record: Record<string, unknown>, datasetId: string): HospitalMetric | undefined {
  const facilityType = asString(firstPresent(record, ["facility_type_a", "facility_type", "level_1"]));
  const institutionType = asString(firstPresent(record, ["institution_type", "institution", "level_2"]));
  const year = asString(firstPresent(record, ["year", "Year"]));
  const beds = toNumber(firstPresent(record, ["no_beds", "beds", "bed_capacity"]));
  const facilities = toNumber(firstPresent(record, ["no_of_facilities", "facilities"]));

  const value = beds ?? facilities;
  if (value === undefined || (!facilityType && !institutionType)) return undefined;

  return {
    metric_name: beds !== undefined ? "Reference Bed Capacity" : "Reference Facility Count",
    facility_name: [institutionType, facilityType].filter(Boolean).join(" - "),
    value: String(value),
    unit: beds !== undefined ? "beds" : "facilities",
    source_name: "MOH Health Facilities and Beds",
    source_url: dataGovDatasetUrl(datasetId),
    dataset_id: datasetId,
    last_updated: year,
    notes: "Static/reference public dataset; not real-time bed availability.",
  };
}

export function normaliseEdWaitingTime(record: Record<string, unknown>, datasetId: string): HospitalMetric | undefined {
  const facilityName = asString(firstPresent(record, ["hospital", "hospital_name", "facility_name", "institution", "ed", "department"]));
  const rawValue = firstPresent(record, [
    "waiting_time",
    "wait_time",
    "median_waiting_time",
    "median_waiting_time_minutes",
    "median_waiting_time_hours",
    "average_waiting_time",
    "average_waiting_time_minutes",
    "average_waiting_time_hours",
    "ed_waiting_time",
    "ed_waiting_time_minutes",
    "ed_waiting_time_hours",
    "value",
  ]);
  const value = asString(rawValue);
  if (!facilityName || !value) return undefined;

  return {
    metric_name: "Emergency Department Waiting Time",
    facility_name: facilityName,
    value,
    unit: inferUnit(record, rawValue),
    source_name: "data.gov.sg Emergency Department Waiting Times",
    source_url: dataGovDatasetUrl(datasetId),
    dataset_id: datasetId,
    last_updated: asString(firstPresent(record, ["date", "Date", "updated_at", "last_updated", "timestamp"])),
    notes: "Public data.gov.sg waiting-time statistic where available; not a live operational feed.",
  };
}

async function findWorkbookDownloadUrl(pageUrl: string): Promise<string> {
  const page = await axios.get<string>(pageUrl, {
    timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
    headers: { "User-Agent": MOH_USER_AGENT, Accept: "text/html,application/xhtml+xml" },
  });
  const links = [...page.data.matchAll(/href=["']([^"']+\.xlsx[^"']*)["']/gi)].map((match) => decodeHtml(match[1]));
  const workbookUrl = links.find(Boolean);
  if (!workbookUrl) throw new Error("No workbook download link found on MOH page.");
  return new URL(workbookUrl, pageUrl).toString();
}

async function fetchWorkbookRows(downloadUrl: string): Promise<unknown[][]> {
  const res = await axios.get<ArrayBuffer>(downloadUrl, {
    responseType: "arraybuffer",
    timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
    headers: { "User-Agent": MOH_USER_AGENT },
  });
  const workbook = XLSX.read(res.data, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("MOH workbook contains no worksheets.");
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: null, raw: false }) as unknown[][];
}

function buildResponse(results: SourceResult[]): HospitalApiResponse {
  const attemptedResults = results.filter((result) => result.attempted);
  const data = results.flatMap((result) => result.data);
  const sources = results.flatMap((result) => result.sources);
  const errors = results.flatMap((result) => result.errors);

  let status: HospitalApiResponse["status"];
  if (data.length > 0 && errors.length === 0) status = "success";
  else if (data.length > 0) status = "partial";
  else if (attemptedResults.length > 0) status = "unavailable";
  else status = "error";

  return { status, data, sources, errors };
}

function sourceFailure(
  sourceName: string,
  sourceUrl: string,
  code: string,
  message: string,
  datasetId?: string
): SourceResult {
  return {
    attempted: true,
    data: [],
    sources: [{ source_name: sourceName, source_url: sourceUrl, dataset_id: datasetId, last_checked: new Date().toISOString() }],
    errors: [{ source_name: sourceName, code, message, dataset_id: datasetId }],
  };
}

function mohSource(sourceName: string, sourceUrl: string, notes: string): HospitalSourceMetadata {
  return {
    source_name: sourceName,
    source_url: sourceUrl,
    fetch_mode: "web-page-download",
    last_checked: new Date().toISOString(),
    notes,
  };
}

function dataGovSource(sourceName: string, datasetId: string | undefined, fetchMode: DataGovFetchMode, notes: string): HospitalSourceMetadata {
  return {
    source_name: sourceName,
    source_url: dataGovDatasetUrl(datasetId),
    dataset_id: datasetId,
    fetch_mode: fetchMode,
    last_checked: new Date().toISOString(),
    notes,
  };
}

function dataGovDatasetUrl(datasetId: string | undefined): string {
  return datasetId ? `https://data.gov.sg/datasets/${datasetId}/view` : "https://data.gov.sg";
}

function cleanMetricValue(value: unknown, unit: string): string | undefined {
  const text = asString(value);
  if (!text) return undefined;
  return unit === "%" ? text.replace(/%$/, "").trim() : text.trim();
}

function inferUnit(record: Record<string, unknown>, rawValue: unknown): string | undefined {
  const explicit = asString(firstPresent(record, ["unit", "Unit", "uom"]));
  if (explicit) return explicit;
  const key = Object.entries(record).find(([, value]) => value === rawValue)?.[0]?.toLowerCase() ?? "";
  if (key.includes("hour") || key.includes("_hr") || key.includes("hrs")) return "hours";
  if (key.includes("min")) return "minutes";
  return undefined;
}

function publicErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    return status ? `Public source request failed with HTTP ${status}.` : "Public source request failed.";
  }
  return err instanceof Error ? err.message : "Public source could not be parsed.";
}

function asString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
}

function isHospitalMetric(value: HospitalMetric | undefined): value is HospitalMetric {
  return Boolean(value);
}

function decodeHtml(value: string): string {
  return value.replace(/&amp;/g, "&").replace(/&#x2F;/g, "/");
}
