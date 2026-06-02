import fs from "fs";
import path from "path";
import type { AxiosInstance } from "axios";
import { env } from "../config/env";
import { ConfigurationError, UpstreamApiError } from "../utils/apiError";

export interface OneMapTokenCache {
  accessToken: string;
  expiryTimestamp: number;
  fetchedAt: string;
}

interface OneMapTokenResponse {
  access_token?: string;
  expiry_timestamp?: number | string;
}

const REFRESH_SKEW_MS = 60_000;

export class OneMapTokenManager {
  private memoryToken?: OneMapTokenCache;

  constructor(
    private readonly client: AxiosInstance,
    private readonly cachePath = env.ONEMAP_TOKEN_CACHE_PATH
  ) {}

  async getAccessToken(): Promise<OneMapTokenCache> {
    const memoryToken = this.validToken(this.memoryToken);
    if (memoryToken) return memoryToken;

    const fileToken = this.validToken(this.readCache());
    if (fileToken) {
      this.memoryToken = fileToken;
      return fileToken;
    }

    return this.refreshAccessToken();
  }

  async refreshAccessToken(): Promise<OneMapTokenCache> {
    if (!env.ONEMAP_EMAIL || !env.ONEMAP_PASSWORD) {
      throw new ConfigurationError("OneMap credentials are not configured.", {
        requiredEnv: ["ONEMAP_EMAIL", "ONEMAP_PASSWORD"],
      });
    }

    try {
      const response = await this.client.post<OneMapTokenResponse>("/api/auth/post/getToken", {
        email: env.ONEMAP_EMAIL,
        password: env.ONEMAP_PASSWORD,
      });

      const accessToken = response.data.access_token;
      const expiryTimestamp = normalizeExpiryTimestamp(response.data.expiry_timestamp);
      if (!accessToken || !expiryTimestamp) {
        throw new Error("OneMap token response did not include access_token and expiry_timestamp.");
      }

      const tokenCache: OneMapTokenCache = {
        accessToken,
        expiryTimestamp,
        fetchedAt: new Date().toISOString(),
      };
      this.memoryToken = tokenCache;
      this.writeCache(tokenCache);
      return tokenCache;
    } catch (err) {
      if (err instanceof ConfigurationError) throw err;
      throw new UpstreamApiError("OneMap token request failed.", {
        provider: "OneMap",
        errorType: err instanceof Error ? err.name : typeof err,
      });
    }
  }

  private validToken(token: OneMapTokenCache | undefined): OneMapTokenCache | undefined {
    if (!token) return undefined;
    if (!token.accessToken) return undefined;
    return token.expiryTimestamp > Date.now() + REFRESH_SKEW_MS ? token : undefined;
  }

  private readCache(): OneMapTokenCache | undefined {
    try {
      if (!fs.existsSync(this.cachePath)) return undefined;
      const parsed = JSON.parse(fs.readFileSync(this.cachePath, "utf8")) as Partial<OneMapTokenCache>;
      if (!parsed.accessToken || !parsed.expiryTimestamp || !parsed.fetchedAt) return undefined;
      return {
        accessToken: parsed.accessToken,
        expiryTimestamp: parsed.expiryTimestamp,
        fetchedAt: parsed.fetchedAt,
      };
    } catch {
      return undefined;
    }
  }

  private writeCache(token: OneMapTokenCache): void {
    const directory = path.dirname(this.cachePath);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(this.cachePath, JSON.stringify(token, null, 2));
  }
}

export function normalizeExpiryTimestamp(value: number | string | undefined): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed < 10_000_000_000 ? parsed * 1000 : parsed;
}
