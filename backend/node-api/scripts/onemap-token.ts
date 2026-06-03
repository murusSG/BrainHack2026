import axios from "axios";
import { env } from "../src/config/env";
import { OneMapTokenManager } from "../src/services/oneMapToken";

async function main() {
  const manager = new OneMapTokenManager(
    axios.create({
      baseURL: env.ONEMAP_API_BASE_URL,
      timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
    })
  );

  const token = await manager.getAccessToken();
  console.log(
    JSON.stringify(
      {
        provider: "ONEMAP",
        status: "ok",
        tokenPreview: `${token.accessToken.slice(0, 8)}...${token.accessToken.slice(-6)}`,
        expiresAt: new Date(token.expiryTimestamp).toISOString(),
        fetchedAt: token.fetchedAt,
        cachePath: env.ONEMAP_TOKEN_CACHE_PATH,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
