import { downloadDatasetJson, getRealtimeV2 } from "../../services/dataGovSg.client";
import { floodRepo } from "../../repositories/flood.repo";
import type { FloodAlertReading, FloodAlertsV2Data, WaterSensorFeatureCollection } from "./flood.types";
import type { FloodAlert, WaterSensorLocation } from "../../../../shared/types/flood";

const WATER_SENSORS_DATASET_ID = "d_31333fa5cf0834f012d840365b336610";

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
  const fc = await downloadDatasetJson<WaterSensorFeatureCollection>(WATER_SENSORS_DATASET_ID);

  return (fc.features ?? [])
    .filter((f) => f.geometry?.type === "Point")
    .map((f, i) => {
      const p = f.properties;
      const [lon, lat] = f.geometry.coordinates;
      return {
        sensorId: String(p["SENSOR_ID"] ?? p["ID"] ?? p["id"] ?? i),
        name: String(p["SENSOR_NAME"] ?? p["NAME"] ?? p["name"] ?? p["LOCATION"] ?? "Unknown"),
        latitude: lat,
        longitude: lon,
      };
    });
}
