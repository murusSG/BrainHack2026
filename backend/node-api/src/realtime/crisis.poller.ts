import { getSnapshot } from "../modules/crisis/crisis.service";
import { broadcast } from "./wsServer";
import type { CrisisEvent } from "../../../shared/types/crisisEvent";

const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Content signature used to detect *meaningful* change. Several upstream feeds
 * lack real timestamps (we synthesise `updatedAt` per fetch), so diffing on
 * timestamps would mark everything as changed every tick. Hashing the fields
 * that actually matter for the map avoids spamming clients.
 */
function signature(event: CrisisEvent): string {
  const loc = event.location ? `${event.location.lat.toFixed(5)},${event.location.lng.toFixed(5)}` : "none";
  return `${event.severity}|${event.title}|${loc}`;
}

/**
 * Periodically re-aggregates and broadcasts only the events that are new or
 * whose signature changed since the last tick. Returns a stop function.
 */
export function startCrisisPoller(intervalMs = DEFAULT_INTERVAL_MS): () => void {
  let lastSignatures = new Map<string, string>();

  const tick = async (): Promise<void> => {
    try {
      const events = await getSnapshot();
      const nextSignatures = new Map<string, string>();
      const changed: CrisisEvent[] = [];

      for (const event of events) {
        const sig = signature(event);
        nextSignatures.set(event.id, sig);
        if (lastSignatures.get(event.id) !== sig) changed.push(event);
      }

      lastSignatures = nextSignatures;
      if (changed.length > 0) broadcast({ type: "event.upsert", events: changed });
    } catch (error) {
      console.error("[crisis.poller] tick failed:", error instanceof Error ? error.message : error);
    }
  };

  const timer = setInterval(tick, intervalMs);
  void tick(); // prime immediately so the first interval isn't a cold wait
  return () => clearInterval(timer);
}
