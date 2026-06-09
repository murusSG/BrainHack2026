import { z } from "zod";
import { getIncidentCluster } from "./incidentCluster.service";
import { insertResponderLog, listResponderLogs } from "../../repositories/responderLog.repo";
import type {
  CreateResponderIncidentLogInput,
  ResponderIncidentLog,
} from "./incident.types";
import { ApiError, BadRequestError } from "../../utils/apiError";

const createSchema = z.object({
  agency: z.string().trim().min(1, "agency is required").max(80),
  author: z.string().trim().max(120).optional(),
  unit: z.string().trim().max(120).optional(),
  category: z
    .enum(["hazard", "medical", "evacuation", "security", "resource_update", "general"])
    .default("general"),
  message: z.string().trim().min(1, "message is required").max(4000),
});

export async function getResponderIncidentLogs(
  incidentId: string
): Promise<ResponderIncidentLog[]> {
  const cluster = await getIncidentCluster(incidentId);
  if (cluster && cluster.status !== "dispatched") {
    throw new ApiError(
      "INVALID_INCIDENT_STATUS",
      "Shared logs are only available for approved or dispatched incidents.",
      409,
      { incident_id: incidentId, status: cluster.status }
    );
  }

  const persistedLogs = await listResponderLogs(incidentId);
  if (!cluster && persistedLogs.length === 0) {
    throw new ApiError("NOT_FOUND", "Incident not found.", 404, { incident_id: incidentId });
  }

  return dedupeAndSortLogs(persistedLogs);
}

export async function createResponderIncidentLog(
  incidentId: string,
  input: unknown
): Promise<ResponderIncidentLog> {
  const cluster = await getIncidentCluster(incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident not found.", 404, { incident_id: incidentId });
  }
  if (cluster.status !== "dispatched") {
    throw new ApiError(
      "INVALID_INCIDENT_STATUS",
      "Shared logs can only be added to approved or dispatched incidents.",
      409,
      { incident_id: incidentId, status: cluster.status }
    );
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("Invalid responder log data.", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }

  return insertResponderLog(incidentId, parsed.data as CreateResponderIncidentLogInput);
}

function dedupeAndSortLogs(logs: ResponderIncidentLog[]): ResponderIncidentLog[] {
  const byId = new Map<string, ResponderIncidentLog>();
  for (const log of logs) {
    byId.set(log.id, log);
  }

  return [...byId.values()].sort((left, right) => {
    const leftTime = Date.parse(left.timestamp);
    const rightTime = Date.parse(right.timestamp);
    if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
      return leftTime - rightTime;
    }
    return left.id.localeCompare(right.id);
  });
}
