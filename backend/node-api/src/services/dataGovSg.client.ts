import axios from "axios";

const V1_BASE = "https://api.data.gov.sg/v1";
const OPEN_BASE = "https://api-open.data.gov.sg";

/** Legacy v1 environment API (PSI, PM2.5, rainfall, weather forecasts). */
export const dataGovSgClient = axios.create({
  baseURL: V1_BASE,
  timeout: 10_000,
});

const openClient = axios.create({
  baseURL: OPEN_BASE,
  timeout: 15_000,
});

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
  const poll = await openClient.get<PollDownloadResponse>(
    `/v1/public/api/datasets/${datasetId}/poll-download`
  );
  if (poll.data.code !== 0 || !poll.data.data?.url) {
    throw new Error(
      `poll-download failed for ${datasetId}: ${poll.data.errorMsg || "no url returned"}`
    );
  }
  const file = await axios.get<T>(poll.data.data.url, { timeout: 15_000 });
  return file.data;
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
