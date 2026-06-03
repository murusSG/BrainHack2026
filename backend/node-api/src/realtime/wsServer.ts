import type { Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { CrisisEvent } from "../../../shared/types/crisisEvent";

/** Messages the server pushes to connected clients. */
export type OutboundMessage =
  | { type: "snapshot"; events: CrisisEvent[] }
  | { type: "event.upsert"; events: CrisisEvent[] };

let wss: WebSocketServer | null = null;

/**
 * Attaches a WebSocket server at `/ws` to the shared HTTP server. Each new
 * client immediately receives a full snapshot so its map is populated before
 * any incremental upserts arrive.
 */
export function attachWebSocket(server: Server, loadSnapshot: () => Promise<CrisisEvent[]>): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    loadSnapshot()
      .then((events) => send(socket, { type: "snapshot", events }))
      .catch((error) => console.error("[ws] failed to send initial snapshot:", error));
  });

  console.log("[murusSG] WebSocket live feed attached at /ws");
}

/** Pushes a message to every open client. No-op until the server is attached. */
export function broadcast(message: OutboundMessage): void {
  if (!wss) return;
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function send(socket: WebSocket, message: OutboundMessage): void {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}
