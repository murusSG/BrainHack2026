import axios from "axios";
import * as XLSX from "xlsx";
import { env } from "../config/env";
import { UpstreamApiError } from "../utils/apiError";

const V1_BASE = env.DATA_GOV_LEGACY_BASE_URL;
const OPEN_BASE = env.DATA_GOV_BASE_URL;

/** Legacy v1 environment API (PSI, PM2.5, rainfall, weather forecasts). */
export const dataGovSgClient = axios.create({
  baseURL: V1_BASE,
  timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
});

const openClient = axios.create({
  baseURL: OPEN_BASE,
  timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
});

const legacyRootClient = axios.create({
  baseURL: OPEN_BASE.replace("api-open.", "").replace(/\/$/, ""),
  timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
});

const RETRY_DELAYS_MS = [0, 500, 1500];

export type DataGovFetchMode = "datastore" | "download";

interface PollDownloadResponse {
  code: number;
  data: { url: string };
  errorMsg: string;
}

interface RealtimeV2Response<T> {
  code: number;
  data: T;
  errorMsg: string;
}

/**
 * Download a geospatial / file-based dataset via the two-step poll-download
 * flow: ask the open-data API for a presigned URL, then fetch that file.
 * Returns the parsed JSON body (e.g. a GeoJSON FeatureCollection).
 */
export async function downloadDatasetJson<T = unknown>(datasetId: string): Promise<T> {
  try {
    const poll = await openClient.get<PollDownloadResponse>(
      `/v1/public/api/datasets/${datasetId}/poll-download`
    );
    if (poll.data.code !== 0 || !poll.data.data?.url) {
      throw new UpstreamApiError(
        `data.gov.sg poll-download failed: ${poll.data.errorMsg || "no url returned"}`,
        {
          provider: "data.gov.sg",
          datasetId,
          fetchMode: "download",
          upstreamCode: poll.data.code,
        }
      );
    }
    const file = await axios.get<T>(poll.data.data.url, { timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000 });
    return file.data;
  } catch (err) {
    if (err instanceof UpstreamApiError) throw err;
    throw new UpstreamApiError("data.gov.sg poll-download failed.", {
      provider: "data.gov.sg",
      datasetId,
      fetchMode: "download",
      ...axiosErrorDetails(err),
    });
  }
}

/**
 * Call a v2 real-time open-data endpoint that wraps its payload in
 * `{ code, data, errorMsg }` and return the unwrapped `data`.
 */
export async function getRealtimeV2<T = unknown>(
  path: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const res = await openClient.get<RealtimeV2Response<T>>(`/v2/real-time/api/${path}`, { params });
  if (res.data.code !== 0) {
    throw new Error(`v2 real-time ${path} failed: ${res.data.errorMsg}`);
  }
  return res.data.data;
}

interface DatastoreSearchResponse {
  success?: boolean;
  result?: {
    records?: Record<string, unknown>[];
  };
}

interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features?: Array<{
    type?: string;
    geometry?: {
      type?: string;
      coordinates?: unknown;
    };
    properties?: Record<string, unknown>;
  }>;
}

export async function datastoreSearch(
  resourceId: string,
  limit = 100,
  offset = 0
): Promise<Record<string, unknown>[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    if (RETRY_DELAYS_MS[attempt] > 0) await wait(RETRY_DELAYS_MS[attempt]);
    try {
      const res = await legacyRootClient.get<DatastoreSearchResponse>("/api/action/datastore_search", {
        params: { resource_id: resourceId, limit, offset },
      });
      if (res.data.success === false) {
        throw new Error("data.gov.sg datastore_search returned success=false");
      }
      const records = res.data.result?.records;
      if (!Array.isArray(records)) {
        throw new Error("data.gov.sg datastore_search returned malformed records");
      }
      return records;
    } catch (err) {
      lastError = err;
    }
  }
  throw new UpstreamApiError("data.gov.sg datastore_search failed.", {
    provider: "data.gov.sg",
    datasetId: resourceId,
    fetchMode: "datastore",
    ...axiosErrorDetails(lastError),
  });
}

export async function datastoreRecords(resourceId: string, pageSize = 100, maxPages = 20): Promise<Record<string, unknown>[]> {
  const records: Record<string, unknown>[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    const offset = page * pageSize;
    const pageRecords = await datastoreSearch(resourceId, pageSize, offset);
    records.push(...pageRecords);
    if (pageRecords.length < pageSize) break;
  }
  return records;
}

export async function downloadDatasetRecords(resourceId: string): Promise<Record<string, unknown>[]> {
  const dataset = await downloadDatasetJson<unknown>(resourceId);
  return recordsFromDownloadedDataset(dataset);
}

export async function fetchDatasetRecords(
  resourceId: string,
  fetchMode: DataGovFetchMode,
  pageSize = 100,
  maxPages = 20
): Promise<Record<string, unknown>[]> {
  return fetchMode === "download"
    ? downloadDatasetRecords(resourceId)
    : datastoreRecords(resourceId, pageSize, maxPages);
}

export function recordsFromDownloadedDataset(dataset: unknown): Record<string, unknown>[] {
  if (typeof dataset === "string") {
    return recordsFromCsv(dataset);
  }

  if (Array.isArray(dataset)) {
    return dataset.filter(isRecord);
  }

  if (isFeatureCollection(dataset)) {
    return (dataset.features ?? []).map((feature, index) => {
      const properties = feature.properties ?? {};
      const coordinates = feature.geometry?.type === "Point" ? feature.geometry.coordinates : undefined;
      const point = Array.isArray(coordinates) ? coordinates : undefined;
      return {
        ...properties,
        _download_index: index,
        _geometry_type: feature.geometry?.type,
        longitude: typeof point?.[0] === "number" ? point[0] : undefined,
        latitude: typeof point?.[1] === "number" ? point[1] : undefined,
        geometry: feature.geometry,
      };
    });
  }

  if (isRecord(dataset) && Array.isArray(dataset.records)) {
    return dataset.records.filter(isRecord);
  }

  throw new UpstreamApiError("Downloaded data.gov.sg dataset format is not supported.", {
    provider: "data.gov.sg",
  });
}

function recordsFromCsv(value: string): Record<string, unknown>[] {
  const workbook = XLSX.read(value, { type: "string" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return isRecord(value) && value.type === "FeatureCollection";
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function axiosErrorDetails(err: unknown): Record<string, unknown> {
  if (axios.isAxiosError(err)) {
    return {
      errorType: err.name,
      status: err.response?.status,
      statusText: err.response?.statusText,
      url: err.config?.url,
      method: err.config?.method,
    };
  }
  return {
    errorType: err instanceof Error ? err.name : typeof err,
    message: err instanceof Error ? err.message : String(err),
  };
}
