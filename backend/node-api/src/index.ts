import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { getSnapshot } from "./modules/crisis/crisis.service";
import { warmShelterGeocache } from "./modules/scdf/scdf.service";
import { startCrisisPoller } from "./realtime/crisis.poller";
import { attachWebSocket } from "./realtime/wsServer";

const app = createApp();
const server = createServer(app);

attachWebSocket(server, getSnapshot);
startCrisisPoller();

server.listen(env.PORT, () => {
  console.log(`[murusSG] Node API running on port ${env.PORT} (${env.NODE_ENV})`);
  // Pre-geocode SCDF shelter addresses in the background so the nearest-shelter
  // route works on first use. Cached to disk; subsequent boots are instant.
  void warmShelterGeocache();
});
