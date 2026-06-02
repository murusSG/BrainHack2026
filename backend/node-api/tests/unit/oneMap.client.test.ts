import fs from "fs";

describe("OneMap client", () => {
  const originalEnv = process.env;
  const cachePath = ".cache/test-onemap-token.json";

  beforeEach(() => {
    jest.resetModules();
    fs.rmSync(cachePath, { force: true });
    process.env = {
      ...originalEnv,
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ONEMAP_EMAIL: "test@example.com",
      ONEMAP_PASSWORD: "secret",
      ONEMAP_TOKEN_CACHE_PATH: cachePath,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    fs.rmSync(cachePath, { force: true });
  });

  it("caches token until expiry", async () => {
    const post = jest.fn().mockResolvedValue({
      data: {
        access_token: "cached-token",
        expiry_timestamp: Math.floor(Date.now() / 1000) + 3600,
      },
    });
    const get = jest.fn();
    const { OneMapClient } = await import("../../src/services/oneMap.client");
    const client = new OneMapClient({ post, get } as never);

    await expect(client.getToken()).resolves.toBe("cached-token");
    await expect(client.getToken()).resolves.toBe("cached-token");
    expect(post).toHaveBeenCalledTimes(1);
  });
});
