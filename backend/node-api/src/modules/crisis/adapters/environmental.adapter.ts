import { getPsi, getPm25 } from "../../environmental/environmental.service";
import { regionCoords } from "../regions";
import type { CrisisEvent, Severity } from "../../../../../shared/types/crisisEvent";

const PSI_REGIONAL_RADIUS_METERS = 5000;

/** NEA PSI 24-hour health bands → unified severity. */
function psiSeverity(psi: number): Severity {
  if (psi <= 50) return "info"; // Good
  if (psi <= 100) return "advisory"; // Moderate
  if (psi <= 200) return "warning"; // Unhealthy
  if (psi <= 300) return "danger"; // Very Unhealthy
  return "critical"; // Hazardous
}

/** PM2.5 one-hourly bands (µg/m³) → unified severity (NEA reference). */
function pm25Severity(pm25: number): Severity {
  if (pm25 <= 55) return "info"; // Normal (Band I)
  if (pm25 <= 150) return "advisory"; // Elevated (Band II)
  if (pm25 <= 250) return "warning"; // High (Band III)
  return "danger"; // Very High (Band IV)
}

export async function environmentalEvents(): Promise<CrisisEvent[]> {
  const [psiReadings, pm25Readings] = await Promise.all([getPsi(), getPm25()]);
  const events: CrisisEvent[] = [];

  for (const reading of psiReadings) {
    if (reading.region === "national") continue; // national is an aggregate, not a place
    const location = regionCoords(reading.region);
    const severity = psiSeverity(reading.psi);
    events.push({
      id: `NEA:psi:${reading.region}`,
      source: "NEA",
      hazardType: "environmental",
      category: "psi",
      title: `PSI ${reading.psi} - ${capitalize(reading.region)} region`,
      severity,
      location,
      area: `${capitalize(reading.region)} region`,
      vicinityRadiusMeters: PSI_REGIONAL_RADIUS_METERS,
      startedAt: reading.timestamp,
      updatedAt: reading.timestamp,
      raw: { ...reading },
    });
  }

  for (const reading of pm25Readings) {
    const location = regionCoords(reading.region);
    const severity = pm25Severity(reading.pm25);
    // Only surface PM2.5 once it is actionable to avoid duplicating the PSI layer.
    if (severity === "info") continue;
    events.push({
      id: `NEA:pm25:${reading.region}`,
      source: "NEA",
      hazardType: "environmental",
      category: "pm25",
      title: `PM2.5 ${reading.pm25} ug/m3 - ${capitalize(reading.region)} region`,
      severity,
      location,
      area: `${capitalize(reading.region)} region`,
      vicinityRadiusMeters: PSI_REGIONAL_RADIUS_METERS,
      startedAt: reading.timestamp,
      updatedAt: reading.timestamp,
      raw: { ...reading },
    });
  }

  return events;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
