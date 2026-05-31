import { datastoreSearch } from "../../services/dataGovSg.client";
import { floodRepo } from "../../repositories/flood.repo";
import type { DatastoreResponse, RawFloodAlertRecord, RawSensorRecord } from "./flood.types";
import type { FloodAlert, WaterSensorLocation } from "../../../../shared/types/flood";

const FLOOD_ALERTS_RESOURCE_ID = "d_f1404e08587ce555b9ea3f565e2eb9a3";
const WATER_SENSORS_RESOURCE_ID = "d_31333fa5cf0834f012d840365b336610";

export async function getFloodAlerts(): Promise<FloodAlert[]> {
  const raw = (await datastoreSearch(FLOOD_ALERTS_RESOURCE_ID, { limit: 100 })) as DatastoreResponse<RawFloodAlertRecord>;

  const alerts: FloodAlert[] = raw.result.records.map((record) => ({
    id: String(record._id),
    location: String(record["location"] ?? record["LOCATION"] ?? "Unknown"),
    severity: String(record["severity"] ?? record["SEVERITY"] ?? "Unknown"),
    source: "PUB",
    timestamp: String(record["timestamp"] ?? record["TIMESTAMP"] ?? new Date().toISOString()),
    raw: record as Record<string, unknown>,
  }));

  floodRepo.saveAlerts(alerts).catch(console.error);
  return alerts;
}

export async function getWaterSensors(): Promise<WaterSensorLocation[]> {
  const raw = (await datastoreSearch(WATER_SENSORS_RESOURCE_ID, { limit: 500 })) as DatastoreResponse<RawSensorRecord>;

  const sensors: WaterSensorLocation[] = raw.result.records.map((record) => ({
    sensorId: String(record["sensor_id"] ?? record["SENSOR_ID"] ?? record._id),
    name: String(record["name"] ?? record["NAME"] ?? `Sensor ${record._id}`),
    latitude: Number(record["latitude"] ?? record["LATITUDE"] ?? 0),
    longitude: Number(record["longitude"] ?? record["LONGITUDE"] ?? 0),
  }));

  return sensors;
}
