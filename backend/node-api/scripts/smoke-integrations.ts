import * as mohService from "../src/modules/moh/moh.service";
import * as oneMapService from "../src/modules/onemap/onemap.service";
import * as populationService from "../src/modules/population/population.service";
import * as scdfService from "../src/modules/scdf/scdf.service";
import { env } from "../src/config/env";
import { ApiError } from "../src/utils/apiError";

type SmokeCase = {
  id: string;
  name: string;
  configured: boolean;
  run: () => Promise<unknown>;
};

const smokeCases: SmokeCase[] = [
  {
    id: "scdf-resources",
    name: "SCDF resources",
    configured: Boolean(env.SCDF_FIRE_STATIONS_RESOURCE_ID || env.SCDF_SHELTERS_RESOURCE_ID || env.SCDF_AEDS_RESOURCE_ID),
    run: () => scdfService.getResources(),
  },
  {
    id: "scdf-nearest-fire-station",
    name: "SCDF nearest fire station",
    configured: Boolean(env.SCDF_FIRE_STATIONS_RESOURCE_ID),
    run: () => scdfService.getNearestResources(1.2931, 103.8492, "FIRE_STATION"),
  },
  {
    id: "moh-infectious-diseases",
    name: "MOH infectious diseases",
    configured: Boolean(env.MOH_INFECTIOUS_DISEASES_RESOURCE_ID),
    run: () => mohService.getInfectiousDiseases("dengue"),
  },
  {
    id: "moh-health-capacity",
    name: "MOH health capacity",
    configured: Boolean(env.MOH_HEALTH_CAPACITY_RESOURCE_ID),
    run: () => mohService.getHealthCapacity(),
  },
  {
    id: "moh-covid-weekly",
    name: "MOH COVID weekly",
    configured: Boolean(env.MOH_COVID_WEEKLY_RESOURCE_ID),
    run: () => mohService.getCovidWeekly(),
  },
  {
    id: "moh-health-summary",
    name: "MOH health summary",
    configured: Boolean(env.MOH_INFECTIOUS_DISEASES_RESOURCE_ID || env.MOH_HEALTH_CAPACITY_RESOURCE_ID),
    run: () => mohService.getSignalsSummary(),
  },
  {
    id: "onemap-search",
    name: "OneMap search",
    configured: Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD),
    run: () => oneMapService.search("city hall"),
  },
  {
    id: "onemap-reverse-geocode",
    name: "OneMap reverse geocode",
    configured: Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD),
    run: () => oneMapService.reverseGeocode(1.2931, 103.852),
  },
  {
    id: "onemap-route",
    name: "OneMap route",
    configured: Boolean(env.ONEMAP_EMAIL && env.ONEMAP_PASSWORD),
    run: () => oneMapService.route(1.2931, 103.8492, 1.3521, 103.8198, "drive"),
  },
  {
    id: "hdb-buildings",
    name: "HDB buildings",
    configured: Boolean(env.HDB_BUILDINGS_RESOURCE_ID),
    run: () => populationService.getHdbBuildings(),
  },
  {
    id: "population-planning-areas",
    name: "Population planning areas",
    configured: Boolean(env.POPULATION_PLANNING_AREAS_RESOURCE_ID),
    run: () => populationService.getPlanningAreas(),
  },
  {
    id: "population-nearby-context",
    name: "Population nearby context",
    configured: Boolean(env.POPULATION_PLANNING_AREAS_RESOURCE_ID),
    run: () => populationService.getNearbyContext(1.2931, 103.852),
  },
];

async function main() {
  const selectedCases = selectCases(process.argv.slice(2));
  for (const smokeCase of selectedCases) {
    console.log(`\n=== ${smokeCase.name} ===`);
    try {
      const result = await smokeCase.run();
      console.log(`mode=${smokeCase.configured ? "live-configured" : "not-configured"}`);
      console.log(JSON.stringify(trimResult(result), null, 2));
    } catch (error) {
      console.log(`mode=${smokeCase.configured ? "live-error" : "not-configured"}`);
      console.log(JSON.stringify(serializeError(error), null, 2));
    }
    await wait(300);
  }
}

function selectCases(args: string[]): SmokeCase[] {
  if (args.includes("--list")) {
    console.log(smokeCases.map((item) => item.id).join("\n"));
    process.exit(0);
  }

  const onlyArg = args.find((arg) => arg.startsWith("--only="));
  if (!onlyArg) return smokeCases;

  const requested = new Set(
    onlyArg
      .replace("--only=", "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
  const selected = smokeCases.filter((item) => requested.has(item.id));
  if (selected.length === 0) {
    console.log(`No smoke cases matched: ${Array.from(requested).join(", ")}`);
    console.log("Use --list to see available case ids.");
    process.exit(1);
  }
  return selected;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      error: error.message,
      details: error.details,
    };
  }
  return { error: error instanceof Error ? error.message : String(error) };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimResult(value: unknown): unknown {
  if (Array.isArray(value)) {
    return {
      count: value.length,
      firstItems: value.slice(0, 3).map(trimResult),
    };
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "geometry" && typeof item === "string") {
        result[key] = `${item.slice(0, 180)}...<trimmed>`;
      } else {
        result[key] = trimResult(item);
      }
    }
    return result;
  }
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
