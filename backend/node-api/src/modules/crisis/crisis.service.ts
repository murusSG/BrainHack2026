import { TtlCache } from "../../utils/cache";
import { haversineDistanceMeters } from "../../utils/geo";
import { environmentalEvents } from "./adapters/environmental.adapter";
import { floodEvents } from "./adapters/flood.adapter";
import { dengueEvents } from "./adapters/dengue.adapter";
import { transportEvents } from "./adapters/transport.adapter";
import {
  severityRank,
  type CrisisEvent,
  type HazardType,
  type Severity,
} from "../../../../shared/types/crisisEvent";

/** Each source adapter, named for logging when one fails. */
const ADAPTERS: Record<string, () => Promise<CrisisEvent[]>> = {
  environmental: environmentalEvents,
  flood: floodEvents,
  dengue: dengueEvents,
  transport: transportEvents,
};

// Short TTL: the feed is "live" but we don't hammer upstreams on every request
// or websocket poll. 30s keeps the demo responsive without rate-limit risk.
const SNAPSHOT_CACHE_KEY = "crisis:events";
const snapshotCache = new TtlCache<CrisisEvent[]>(30_000);

export interface CrisisEventFilter {
  hazardType?: HazardType;
  /** Minimum severity (inclusive), e.g. "warning" returns warning|danger|critical. */
  minSeverity?: Severity;
  /** Proximity filter for resident and responder context. */
  near?: { lat: number; lng: number; radiusMeters: number };
}

/**
 * Fetch every source in parallel, normalise to CrisisEvent, and merge into one
 * feed. A single source failing (e.g. missing LTA key) logs and is skipped so
 * the unified feed degrades gracefully rather than going blank.
 */
async function buildSnapshot(): Promise<CrisisEvent[]> {
  const results = await Promise.allSettled(
    Object.entries(ADAPTERS).map(async ([name, run]) => {
      try {
        return await run();
      } catch (error) {
        console.error(`[crisis] adapter "${name}" failed:`, error instanceof Error ? error.message : error);
        return [] as CrisisEvent[];
      }
    })
  );

  const events: CrisisEvent[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") events.push(...result.value);
  }

  // Most urgent first, then most recently updated.
  events.sort((a, b) => {
    const bySeverity = severityRank(b.severity) - severityRank(a.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.updatedAt.localeCompare(a.updatedAt);
  });

  return events;
}

/** Returns the cached merged snapshot, refreshing it when the TTL has lapsed. */
export async function getSnapshot(): Promise<CrisisEvent[]> {
  const cached = snapshotCache.get(SNAPSHOT_CACHE_KEY);
  if (cached) return cached;
  const fresh = await buildSnapshot();
  return snapshotCache.set(SNAPSHOT_CACHE_KEY, fresh);
}

export async function aggregateEvents(filter: CrisisEventFilter = {}): Promise<CrisisEvent[]> {
  let events = await getSnapshot();

  if (filter.hazardType) {
    events = events.filter((event) => event.hazardType === filter.hazardType);
  }

  if (filter.minSeverity) {
    const floor = severityRank(filter.minSeverity);
    events = events.filter((event) => severityRank(event.severity) >= floor);
  }

  if (filter.near) {
    const { lat, lng, radiusMeters } = filter.near;
    events = events.filter((event) => {
      if (!event.location) return false;
      const distance = haversineDistanceMeters(lat, lng, event.location.lat, event.location.lng);
      // Within the query radius OR the event's own hazard vicinity reaches the user.
      return distance <= radiusMeters + event.vicinityRadiusMeters;
    });
  }

  return events;
}

export async function getEventById(id: string): Promise<CrisisEvent | undefined> {
  const events = await getSnapshot();
  return events.find((event) => event.id === id);
}
