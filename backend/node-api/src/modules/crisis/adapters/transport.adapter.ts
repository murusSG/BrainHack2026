import { getTrafficIncidents } from "../../transport/transport.service";
import { slug } from "../../../utils/records";
import { env } from "../../../config/env";
import type { CrisisEvent, Severity } from "../../../../../shared/types/crisisEvent";

const TRAFFIC_RADIUS_METERS = 500;

/** LTA incident types that imply a more serious, response-relevant event. */
function incidentSeverity(type: string): Severity {
  const value = type.toLowerCase();
  if (/(accident|fire|breakdown|obstacle|flood)/.test(value)) return "warning";
  if (/(roadwork|road work|diversion)/.test(value)) return "advisory";
  return "info";
}

export async function transportEvents(): Promise<CrisisEvent[]> {
  if (!env.LTA_API_KEY) {
    console.warn("[crisis] transport adapter skipped: LTA_API_KEY not configured");
    return [];
  }
  const incidents = await getTrafficIncidents();

  return incidents.map((incident, index) => ({
    id: `LTA:traffic-incident:${slug(`${incident.type}-${incident.latitude}-${incident.longitude}-${index}`)}`,
    source: "LTA",
    hazardType: "infrastructure",
    category: "traffic-incident",
    title: incident.message || incident.type,
    severity: incidentSeverity(incident.type),
    location: { lat: incident.latitude, lng: incident.longitude },
    vicinityRadiusMeters: TRAFFIC_RADIUS_METERS,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    raw: { ...incident },
  } satisfies CrisisEvent));
}
