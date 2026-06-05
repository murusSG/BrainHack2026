import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";
import { UpstreamApiError } from "../utils/apiError";
import { OneMapTokenManager } from "./oneMapToken";

export type RouteMode = "drive" | "walk" | "cycle" | "pt";

export class OneMapClient {
  private readonly tokenManager: OneMapTokenManager;

  constructor(private readonly client: AxiosInstance = axios.create({
    baseURL: env.ONEMAP_API_BASE_URL,
    timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
  })) {
    this.tokenManager = new OneMapTokenManager(client);
  }

  async getToken(): Promise<string> {
    return (await this.tokenManager.getAccessToken()).accessToken;
  }

  async search(query: string): Promise<unknown> {
    return this.getPublic("/api/common/elastic/search", {
      searchVal: query,
      returnGeom: "Y",
      getAddrDetails: "Y",
      pageNum: 1,
    });
  }

  async reverseGeocode(lat: number, lng: number): Promise<unknown> {
    return this.get("/api/public/revgeocode", {
      location: `${lat},${lng}`,
      buffer: 40,
      addressType: "All",
    });
  }

  async route(startLat: number, startLng: number, endLat: number, endLng: number, mode: RouteMode): Promise<unknown> {
    return this.get("/api/public/routingsvc/route", {
      start: `${startLat},${startLng}`,
      end: `${endLat},${endLng}`,
      routeType: mode,
    });
  }

  private async get(path: string, params: Record<string, string | number>): Promise<unknown> {
    const token = await this.getToken();
    try {
      const res = await this.client.get(path, {
        params,
        headers: { Authorization: token },
      });
      return res.data;
    } catch (err) {
      throw new UpstreamApiError("OneMap request failed.", {
        provider: "OneMap",
        path,
        errorType: err instanceof Error ? err.name : typeof err,
      });
    }
  }

  private async getPublic(path: string, params: Record<string, string | number>): Promise<unknown> {
    try {
      const res = await this.client.get(path, { params });
      return res.data;
    } catch (err) {
      throw new UpstreamApiError("OneMap request failed.", {
        provider: "OneMap",
        path,
        errorType: err instanceof Error ? err.name : typeof err,
      });
    }
  }
}

export const oneMapClient = new OneMapClient();
