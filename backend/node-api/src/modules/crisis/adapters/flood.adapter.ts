import { getFloodAlerts, getWaterSensors } from "../../flood/flood.service";
import { getLtaFloodAlerts } from "../../transport/transport.service";
import { slug } from "../../../utils/records";
import type { GeoPoint, CrisisEvent, Severity } from "../../../../../shared/types/crisisEvent";

const FLOOD_HYPERLOCAL_RADIUS_METERS = 300;

/** Map free-text PUB/LTA alert levels to a unified severity. */
function floodSeverity(level: string): Severity {
  const value = level.toLowerCase();
  if (/(flash|flood|danger|high|critical)/.test(value)) return "danger";
  if (/(alert|warning|risk|overflow)/.test(value)) return "warning";
  if (/(watch|caution|advisory)/.test(value)) return "advisory";
  return "warning"; // a flood feed emitting anything at all is at least a warning
}

export async function floodEvents(): Promise<CrisisEvent[]> {
  const [pubAlerts, sensors, ltaAlerts] = await Promise.all([
    getFloodAlerts(),
    getWaterSensors().catch(() => []),
    getLtaFloodAlerts().catch(() => []),
  ]);

  // Build a name-to-coordinate lookup so text-only PUB alerts can be placed.
  const sensorByName = new Map<string, GeoPoint>();
  for (const sensor of sensors) {
    sensorByName.set(sensor.name.toLowerCase(), { lat: sensor.latitude, lng: sensor.longitude });
  }

  const events: CrisisEvent[] = [];

  for (const alert of pubAlerts) {
    const location = sensorByName.get(alert.location.toLowerCase()) ?? null;
    events.push({
      id: `PUB:flood-alert:${slug(alert.id)}`,
      source: "PUB",
      hazardType: "environmental",
      category: "flood-alert",
      title: `Flood alert - ${alert.location}`,
      severity: floodSeverity(alert.severity),
      location,
      area: alert.location,
      vicinityRadiusMeters: FLOOD_HYPERLOCAL_RADIUS_METERS,
      startedAt: alert.timestamp,
      updatedAt: alert.timestamp,
      raw: alert.raw,
    });
  }

  for (const alert of ltaAlerts) {
    events.push({
      id: `LTA:flood-alert:${slug(alert.nodeId)}`,
      source: "LTA",
      hazardType: "infrastructure",
      category: "flood-alert",
      title: alert.alertMessage || "Road flood alert",
      severity: floodSeverity(alert.alertLevel),
      location: { lat: alert.latitude, lng: alert.longitude },
      vicinityRadiusMeters: FLOOD_HYPERLOCAL_RADIUS_METERS,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      raw: { ...alert },
    });
  }

  return events;
}
