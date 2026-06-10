import axios from "axios";
import { env } from "../config/env";
import { ConfigurationError, UpstreamApiError } from "../utils/apiError";

const STREET_VIEW_BASE_URL = "https://maps.googleapis.com/maps/api/streetview";

interface StreetViewMetadataPayload {
  status?: string;
  date?: string;
  pano_id?: string;
  copyright?: string;
  location?: {
    lat?: number;
    lng?: number;
  };
}

export interface StreetViewPreview {
  available: boolean;
  status: string;
  imageUrl?: string;
  provider: "GOOGLE_STREET_VIEW";
  metadata?: {
    date?: string;
    panoId?: string;
    copyright?: string;
    lat?: number;
    lng?: number;
  };
}

interface StreetViewPreviewParams {
  lat: number;
  lng: number;
  heading?: number;
  pitch?: number;
  fov?: number;
  radius?: number;
}

interface StreetViewImage {
  contentType: string;
  bytes: Buffer;
}

export async function streetViewPreview({
  lat,
  lng,
  heading,
  pitch = 0,
  fov = 80,
  radius = 50,
}: StreetViewPreviewParams): Promise<StreetViewPreview> {
  if (!env.GOOGLE_STREET_VIEW_API_KEY) {
    throw new ConfigurationError("Google Street View is not configured.", {
      provider: "Google Street View",
      requiredEnv: "GOOGLE_STREET_VIEW_API_KEY",
    });
  }

  try {
    const baseParams = {
      location: `${lat},${lng}`,
      heading: normalizedHeading(heading),
      pitch: clamp(pitch, -90, 90),
      fov: clamp(fov, 10, 120),
      radius: clamp(radius, 0, 200),
      source: "outdoor",
      key: env.GOOGLE_STREET_VIEW_API_KEY,
    };
    const metadata = await axios.get<StreetViewMetadataPayload>(`${STREET_VIEW_BASE_URL}/metadata`, {
      params: baseParams,
      timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
    });
    const status = metadata.data.status ?? "UNKNOWN";

    if (status !== "OK") {
      return {
        available: false,
        status,
        provider: "GOOGLE_STREET_VIEW",
      };
    }

    return {
      available: true,
      status,
      provider: "GOOGLE_STREET_VIEW",
      imageUrl: buildStreetViewProxyPath({ lat, lng, heading, pitch, fov, radius }),
      metadata: {
        date: metadata.data.date,
        panoId: metadata.data.pano_id,
        copyright: metadata.data.copyright,
        lat: metadata.data.location?.lat,
        lng: metadata.data.location?.lng,
      },
    };
  } catch (err) {
    if (err instanceof ConfigurationError) throw err;
    throw new UpstreamApiError("Google Street View request failed.", {
      provider: "Google Street View",
      errorType: err instanceof Error ? err.name : typeof err,
    });
  }
}

export async function streetViewImage(params: StreetViewPreviewParams): Promise<StreetViewImage> {
  if (!env.GOOGLE_STREET_VIEW_API_KEY) {
    throw new ConfigurationError("Google Street View is not configured.", {
      provider: "Google Street View",
      requiredEnv: "GOOGLE_STREET_VIEW_API_KEY",
    });
  }

  try {
    const response = await axios.get<ArrayBuffer>(STREET_VIEW_BASE_URL, {
      params: streetViewRequestParams(params),
      responseType: "arraybuffer",
      timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
    });
    return {
      contentType: String(response.headers["content-type"] ?? "image/jpeg"),
      bytes: Buffer.from(response.data),
    };
  } catch (err) {
    throw new UpstreamApiError("Google Street View image request failed.", {
      provider: "Google Street View",
      errorType: err instanceof Error ? err.name : typeof err,
    });
  }
}

function streetViewRequestParams({
  lat,
  lng,
  heading,
  pitch = 0,
  fov = 80,
  radius = 50,
}: StreetViewPreviewParams): Record<string, string | number | undefined> {
  return {
    size: "640x360",
    location: `${lat},${lng}`,
    heading: normalizedHeading(heading),
    pitch: clamp(pitch, -90, 90),
    fov: clamp(fov, 10, 120),
    radius: clamp(radius, 0, 200),
    source: "outdoor",
    key: env.GOOGLE_STREET_VIEW_API_KEY,
  };
}

function buildStreetViewProxyPath(params: StreetViewPreviewParams): string {
  const query = new URLSearchParams();
  Object.entries({
    lat: params.lat,
    lng: params.lng,
    heading: normalizedHeading(params.heading),
    pitch: clamp(params.pitch ?? 0, -90, 90),
    fov: clamp(params.fov ?? 80, 10, 120),
    radius: clamp(params.radius ?? 50, 0, 200),
  }).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  return `/api/v1/street-view/image?${query.toString()}`;
}

function normalizedHeading(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return (((Number(value) % 360) + 360) % 360);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}
