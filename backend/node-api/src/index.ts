import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { attachWebSocket } from "./realtime/wsServer";
import { startCrisisPoller } from "./realtime/crisis.poller";
import { getSnapshot } from "./modules/crisis/crisis.service";

const app = createApp();
const server = createServer(app);

attachWebSocket(server, getSnapshot);
startCrisisPoller();

server.listen(env.PORT, () => {
  console.log(`[murusSG] Node API running on port ${env.PORT} (${env.NODE_ENV})`);
});
