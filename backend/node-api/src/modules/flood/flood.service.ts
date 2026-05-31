import { getRealtimeV2 } from "../../services/dataGovSg.client";
import { floodRepo } from "../../repositories/flood.repo";
import type { FloodAlertReading, FloodAlertsV2Data } from "./flood.types";
import type { FloodAlert, WaterSensorLocation } from "../../../../shared/types/flood";

function pick(reading: FloodAlertReading, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = reading[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return fallback;
}

export async function getFloodAlerts(): Promise<FloodAlert[]> {
  const data = await getRealtimeV2<FloodAlertsV2Data>("weather/flood-alerts");

  const alerts: FloodAlert[] = [];
  for (const record of data.records ?? []) {
    for (const reading of record.item?.readings ?? []) {
      alerts.push({
        id: pick(reading, ["id", "stationId", "station_id"], `${record.datetime}-${alerts.length}`),
        location: pick(reading, ["label", "location", "name"], "Unknown"),
        severity: pick(reading, ["level", "severity", "value"], "alert"),
        source: "PUB",
        timestamp: record.datetime,
        raw: reading as Record<string, unknown>,
      });
    }
  }

  floodRepo.saveAlerts(alerts).catch(console.error);
  return alerts;
}

export async function getWaterSensors(): Promise<WaterSensorLocation[]> {
  // The PUB water-level sensor dataset is published as a zipped shapefile/KML
  // rather than GeoJSON, so it needs a zip + shapefile parsing step we have not
  // built yet. Returning an empty list until that pipeline exists.
  return [];
}
