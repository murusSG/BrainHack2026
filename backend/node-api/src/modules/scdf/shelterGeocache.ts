import fs from "fs";
import path from "path";
import { env } from "../../config/env";
import { searchForGeocode } from "../onemap/onemap.service";

// The SCDF shelter dataset ships addresses but no coordinates, so the nearest-shelter
// lookup has nothing to sort by. This module geocodes those addresses via OneMap's
// public search and persists the results to disk so the work happens once and survives
// restarts. Geocoding runs in the background (fire-and-forget) and never blocks a request.

export interface ShelterCoord {
  lat: number;
  lng: number;
}

type CoordMap = Record<string, ShelterCoord>;

const GEOCODE_CONCURRENCY = 3;
const GEOCODE_MAX_ATTEMPTS = 3;
const REQUEST_SPACING_MS = 200;
const ROUND_COOLDOWN_MS = 3000;
const MAX_ROUNDS = 15;
const SAVE_DEBOUNCE_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let memoryCache: CoordMap | null = null;
let warming: Promise<void> | null = null;
let saveTimer: NodeJS.Timeout | null = null;

function cachePath(): string {
  return env.SCDF_SHELTER_GEOCACHE_PATH;
}

function normalizeKey(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function load(): CoordMap {
  if (memoryCache) return memoryCache;
  try {
    memoryCache = fs.existsSync(cachePath())
      ? (JSON.parse(fs.readFileSync(cachePath(), "utf8")) as CoordMap)
      : {};
  } catch {
    memoryCache = {};
  }
  return memoryCache;
}

function persist(): void {
  if (!memoryCache) return;
  try {
    fs.mkdirSync(path.dirname(cachePath()), { recursive: true });
    fs.writeFileSync(cachePath(), JSON.stringify(memoryCache, null, 2));
  } catch (err) {
    console.warn(
      "[scdf.shelterGeocache] failed to persist cache:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    persist();
  }, SAVE_DEBOUNCE_MS);
  saveTimer.unref?.();
}

export function getCachedCoord(address: string | undefined): ShelterCoord | undefined {
  if (!address) return undefined;
  return load()[normalizeKey(address)];
}

// Many shelter addresses are HDB void-deck format ("Blk 21 Queen's Close #01-141"),
// which OneMap's address search cannot match. Strip the "Blk" prefix and "#xx-xxx" unit
// so the remaining block-and-street resolves.
function cleanAddress(address: string): string {
  return address
    .replace(/#\d+[-\s]?\d*[a-z]?/gi, " ") // unit numbers e.g. "#01-141"
    .replace(/\bblk\b\.?/gi, " ") // "Blk" / "Blk."
    .replace(/\bblock\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function geocode(address: string): Promise<ShelterCoord | undefined> {
  const queries = Array.from(new Set([cleanAddress(address), address].filter(Boolean)));

  // Retry only when a request threw (OneMap throttles bursts); an empty result set for
  // every query variant is a genuine miss, so stop. Backoff grows with each attempt.
  for (let attempt = 0; attempt < GEOCODE_MAX_ATTEMPTS; attempt += 1) {
    let threw = false;
    for (const query of queries) {
      try {
        const results = await searchForGeocode(query);
        const match = results.find(
          (result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude)
        );
        if (match) return { lat: Number(match.latitude), lng: Number(match.longitude) };
      } catch {
        threw = true;
      }
    }
    if (!threw) return undefined;
    await delay(300 * (attempt + 1));
  }
  return undefined;
}

// Run one concurrency-limited, paced pass over the given addresses. Returns the subset
// that could not be geocoded this pass (so the caller can retry them after a cooldown).
async function geocodePass(cache: CoordMap, addresses: string[]): Promise<string[]> {
  let cursor = 0;
  let geocoded = 0;
  const stillMissing: string[] = [];

  async function worker(): Promise<void> {
    while (cursor < addresses.length) {
      const address = addresses[cursor++];
      const coord = await geocode(address);
      if (coord) {
        cache[normalizeKey(address)] = coord;
        geocoded += 1;
        if (geocoded % 25 === 0) scheduleSave();
      } else {
        stillMissing.push(address);
      }
      await delay(REQUEST_SPACING_MS);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(GEOCODE_CONCURRENCY, addresses.length) }, () => worker())
  );
  return stillMissing;
}

// Geocode every still-missing address, retrying failures across rounds with a cooldown
// so the batch converges despite OneMap's rate limiting. De-duplicated and guarded so
// only one warm runs at a time; concurrent callers share the same promise.
export function warmShelterCoords(addresses: string[]): Promise<void> {
  if (warming) return warming;

  const cache = load();
  let remaining = Array.from(
    new Set(addresses.filter((address) => address && !cache[normalizeKey(address)]))
  );
  if (remaining.length === 0) return Promise.resolve();

  const target = remaining.length;
  warming = (async () => {
    let zeroRounds = 0;
    for (let round = 0; round < MAX_ROUNDS && remaining.length > 0; round += 1) {
      const before = remaining.length;
      remaining = await geocodePass(cache, remaining);
      persist();
      const progressed = before - remaining.length;
      console.log(
        `[scdf.shelterGeocache] round ${round + 1}: +${progressed} (${remaining.length} unresolved)`
      );
      // Tolerate one stalled round (transient throttle) but stop after two in a row so
      // genuinely unmatchable addresses don't spin forever.
      zeroRounds = progressed === 0 ? zeroRounds + 1 : 0;
      if (zeroRounds >= 2) break;
      if (remaining.length > 0) await delay(ROUND_COOLDOWN_MS);
    }
    console.log(
      `[scdf.shelterGeocache] geocoded ${target - remaining.length}/${target}; ${remaining.length} unresolved`
    );
  })().finally(() => {
    warming = null;
  });

  return warming;
}
