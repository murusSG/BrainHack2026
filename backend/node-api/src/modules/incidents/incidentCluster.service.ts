import { search as searchOneMap } from "../onemap/onemap.service";
import { ApiError } from "../../utils/apiError";
import {
  clearIncidentStateForTests,
  getIncidentClusterById,
  insertIncidentCluster,
  nextIncidentId,
  listIncidentClusters as listPersistedIncidentClusters,
  listRecentIncidentClusters as listPersistedRecentIncidentClusters,
  updateIncidentCluster,
} from "../../repositories/incidentState.repo";
import { insertResponderLog } from "../../repositories/responderLog.repo";
import type {
  CanonicalResidentEvent,
  ExtractedIncident,
  IncidentClusterResponse,
  PublicIncidentReport,
  ResourceAllocationRecommendations,
  ResourceAllocationStatus,
  StoredIncidentCluster,
} from "./incident.types";

export async function createIncidentCluster(
  report: PublicIncidentReport,
  extractedIncident: ExtractedIncident,
  recommendations: ResourceAllocationRecommendations,
  resourceAllocationStatus: ResourceAllocationStatus,
  createdFromReportId?: string
): Promise<StoredIncidentCluster> {
  const now = new Date().toISOString();
  const incidentId = await nextIncidentId();
  const priority = calculatePriority(extractedIncident, 1);
  const location = await resolveIncidentLocation(report, extractedIncident);
  const cluster: StoredIncidentCluster = {
    incident_id: incidentId,
    status: "pending_approval",
    marker_status: "pending",
    created_at: now,
    updated_at: now,
    extracted_incident: cloneExtractedIncident(extractedIncident),
    reports: [cloneReport(report)],
    recommendations: cloneRecommendations(recommendations),
    resource_allocation_status: resourceAllocationStatus,
    canonical_event: buildCanonicalResidentEvent(incidentId, report, extractedIncident, now, location),
    priority_score: priority.score,
    priority_reason: priority.reason,
    approved_agencies: [],
    responder_logs: [],
  };

  return insertIncidentCluster(cluster, createdFromReportId);
}

export async function attachReportToCluster(
  incidentId: string,
  report: PublicIncidentReport
): Promise<StoredIncidentCluster> {
  const cluster = await requireCluster(incidentId);

  cluster.reports.push(cloneReport(report));
  const priority = calculatePriority(cluster.extracted_incident, cluster.reports.length);
  cluster.priority_score = priority.score;
  cluster.priority_reason = priority.reason;

  if (!hasIncidentCoordinates(cluster)) {
    const location = await resolveIncidentLocation(report, cluster.extracted_incident);
    if (location.latitude !== undefined && location.longitude !== undefined) {
      cluster.canonical_event.location = {
        ...cluster.canonical_event.location,
        type: "POINT",
        latitude: location.latitude,
        longitude: location.longitude,
        addressText: location.addressText ?? cluster.canonical_event.location.addressText,
        geocodingConfidence:
          location.geocodingConfidence ?? cluster.canonical_event.location.geocodingConfidence,
      };
    }
  }

  cluster.updated_at = new Date().toISOString();
  return updateIncidentCluster(cluster);
}

export async function updateClusterResourceAllocation(
  incidentId: string,
  recommendations: ResourceAllocationRecommendations,
  resourceAllocationStatus: ResourceAllocationStatus
): Promise<StoredIncidentCluster> {
  const cluster = await requireCluster(incidentId);

  cluster.recommendations = cloneRecommendations(recommendations);
  cluster.resource_allocation_status = resourceAllocationStatus;
  cluster.status = "pending_approval";
  cluster.marker_status = "pending";
  cluster.updated_at = new Date().toISOString();
  return updateIncidentCluster(cluster);
}

export async function decideClusterDispatch(input: {
  incidentId: string;
  dispatcherId: string;
  decision: "approved" | "declined";
  approvedAgencies: string[];
  dispatcherNote?: string;
}): Promise<StoredIncidentCluster> {
  const cluster = await requireCluster(input.incidentId);
  if (cluster.status !== "pending_approval") {
    throw new ApiError(
      "INVALID_INCIDENT_STATUS",
      "Only incidents awaiting approval can receive a dispatch decision.",
      409,
      { incident_id: input.incidentId, status: cluster.status }
    );
  }

  const now = new Date().toISOString();
  const approvedAgencies = [
    ...new Set(input.approvedAgencies.map((agency) => agency.trim()).filter(Boolean)),
  ];

  cluster.approved_agencies = input.decision === "approved" ? approvedAgencies : [];
  cluster.approved_by = input.decision === "approved" ? input.dispatcherId : undefined;
  cluster.approved_at = input.decision === "approved" ? now : undefined;
  cluster.status = input.decision === "approved" ? "dispatched" : "declined";
  cluster.marker_status = input.decision === "approved" ? "approved" : "declined";
  cluster.resource_allocation_status = input.decision === "approved" ? "approved" : "declined";
  cluster.dispatch_decision = {
    incident_id: input.incidentId,
    decision: input.decision,
    approved_resources: cluster.approved_agencies,
    dispatcher_note: input.dispatcherNote,
    dispatcher_id: input.dispatcherId,
    timestamp: now,
  };

  if (input.decision === "approved") {
    cluster.canonical_event.status = "ACTIVE";
    cluster.canonical_event.tags = [
      ...cluster.canonical_event.tags.filter((tag) => tag !== "pending_dispatcher_approval"),
      "dispatch_approved",
    ];
    cluster.canonical_event.recommendedActions = [
      `Coordinate response with ${approvedAgencies.join(", ")}.`,
    ];
  } else {
    cluster.canonical_event.tags = [
      ...cluster.canonical_event.tags.filter((tag) => tag !== "pending_dispatcher_approval"),
      "dispatch_declined",
    ];
  }

  cluster.updated_at = now;
  const updated = await updateIncidentCluster(cluster);

  if (input.decision === "approved") {
    await insertResponderLog(updated.incident_id, {
      agency: "MURUS",
      author: input.dispatcherId,
      category: "resource_update",
      message: `Dispatch approved. Resources assigned: ${approvedAgencies.join(", ")}.${
        input.dispatcherNote ? ` Note: ${input.dispatcherNote}` : ""
      }`,
    });
  }

  return updated;
}

export async function approveClusterAgencies(input: {
  incidentId: string;
  dispatcherId: string;
  approvedAgencies: string[];
}): Promise<StoredIncidentCluster> {
  return decideClusterDispatch({
    ...input,
    decision: "approved",
  });
}

export async function patchClusterStatus(input: {
  incidentId: string;
  status: "dispatched" | "declined" | "closed";
  dispatcherId?: string;
  approvedAgencies?: string[];
  dispatcherNote?: string;
}): Promise<StoredIncidentCluster> {
  if (input.status === "dispatched") {
    return decideClusterDispatch({
      incidentId: input.incidentId,
      dispatcherId: input.dispatcherId ?? "DISPATCHER-API",
      decision: "approved",
      approvedAgencies: input.approvedAgencies ?? [],
      dispatcherNote: input.dispatcherNote,
    });
  }

  if (input.status === "declined") {
    return decideClusterDispatch({
      incidentId: input.incidentId,
      dispatcherId: input.dispatcherId ?? "DISPATCHER-API",
      decision: "declined",
      approvedAgencies: [],
      dispatcherNote: input.dispatcherNote,
    });
  }

  const cluster = await requireCluster(input.incidentId);
  cluster.status = "closed";
  cluster.marker_status = "closed";
  cluster.updated_at = new Date().toISOString();
  cluster.canonical_event.tags = [
    ...cluster.canonical_event.tags.filter((tag) => tag !== "pending_dispatcher_approval"),
    "incident_closed",
  ];
  return updateIncidentCluster(cluster);
}

export async function listIncidentClusters(): Promise<IncidentClusterResponse[]> {
  const clusters = await listPersistedIncidentClusters();
  return clusters.map(cloneClusterForResponse);
}

export async function listPriorityQueue(): Promise<IncidentClusterResponse[]> {
  const clusters = await listPersistedIncidentClusters();
  return clusters
    .filter((cluster) => cluster.status === "pending_approval")
    .sort((left, right) => {
      const scoreDelta = right.priority_score - left.priority_score;
      if (scoreDelta !== 0) return scoreDelta;
      return Date.parse(left.created_at) - Date.parse(right.created_at);
    })
    .map((cluster, index) => ({
      ...cloneClusterForResponse(cluster),
      queue_position: index + 1,
    }));
}

export async function listResponderIncidents(): Promise<IncidentClusterResponse[]> {
  const clusters = await listPersistedIncidentClusters();
  return clusters
    .filter((cluster) => cluster.status === "dispatched")
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
    .map(cloneClusterForResponse);
}

export async function getIncidentCluster(
  incidentId: string
): Promise<IncidentClusterResponse | undefined> {
  const cluster = await getIncidentClusterById(incidentId);
  return cluster ? cloneClusterForResponse(cluster) : undefined;
}

export async function getRecentIncidentClusters(cutoffIso: string): Promise<StoredIncidentCluster[]> {
  return listPersistedRecentIncidentClusters(cutoffIso);
}

export function clearIncidentClusterStateForTests() {
  clearIncidentStateForTests();
}

async function requireCluster(incidentId: string): Promise<StoredIncidentCluster> {
  const cluster = await getIncidentClusterById(incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, {
      incident_id: incidentId,
    });
  }
  return cloneClusterInternal(cluster);
}

async function resolveIncidentLocation(
  report: PublicIncidentReport,
  extractedIncident: ExtractedIncident
): Promise<{
  latitude?: number;
  longitude?: number;
  addressText?: string;
  geocodingConfidence?: string;
}> {
  if (report.reporter_location) {
    return {
      latitude: report.reporter_location.lat,
      longitude: report.reporter_location.lng,
      addressText: extractedIncident.location_text || undefined,
      geocodingConfidence: extractedIncident.location_text ? "MEDIUM" : "LOW",
    };
  }

  const locationText = extractedIncident.location_text.trim();
  if (!locationText || process.env.NODE_ENV === "test") {
    return {
      addressText: locationText || undefined,
      geocodingConfidence: locationText ? "LOW" : undefined,
    };
  }

  try {
    const results = await searchOneMap(locationText);
    const first = results[0];
    if (!first) {
      return {
        addressText: locationText,
        geocodingConfidence: "LOW",
      };
    }
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      addressText: first.address || first.building || locationText,
      geocodingConfidence: "MEDIUM",
    };
  } catch {
    return {
      addressText: locationText,
      geocodingConfidence: "LOW",
    };
  }
}

function hasIncidentCoordinates(cluster: StoredIncidentCluster): boolean {
  return Number.isFinite(Number(cluster.canonical_event.location.latitude)) &&
    Number.isFinite(Number(cluster.canonical_event.location.longitude));
}

function buildCanonicalResidentEvent(
  incidentId: string,
  report: PublicIncidentReport,
  extractedIncident: ExtractedIncident,
  now: string,
  location: {
    latitude?: number;
    longitude?: number;
    addressText?: string;
    geocodingConfidence?: string;
  }
): CanonicalResidentEvent {
  const source = report.source.toLowerCase() === "responder" ? "RESPONDER_REPORT" : "RESIDENT_REPORT";
  const hazardType = hazardTypeFromIncidentType(extractedIncident.incident_type);
  return {
    id: `evt_${incidentId.toLowerCase()}`,
    source,
    sourceRecordId: report.report_id,
    retrievedAt: now,
    observedAt: report.reported_at,
    hazardType,
    title: titleForExtractedIncident(extractedIncident),
    description: extractedIncident.description || report.report_text.slice(0, 280),
    severity: severityFromExtractedIncident(extractedIncident.severity),
    confidence: confidenceFromScore(extractedIncident.confidence),
    location:
      location.latitude !== undefined && location.longitude !== undefined
        ? {
            type: "POINT",
            latitude: location.latitude,
            longitude: location.longitude,
            addressText: location.addressText,
            geocodingConfidence: location.geocodingConfidence,
          }
        : {
            type: "UNKNOWN",
            addressText: location.addressText,
            geocodingConfidence: location.geocodingConfidence ?? "LOW",
          },
    vicinityRadiusMeters: vicinityRadiusForHazard(hazardType),
    status: "TRIAGING",
    recommendedActions: ["Dispatcher approval required before any agency notification."],
    tags: ["resident_report", "ai_extracted", "pending_dispatcher_approval"],
  };
}

function hazardTypeFromIncidentType(value: string): string {
  const type = value.toLowerCase();
  if (type.includes("fire") || type.includes("smoke")) return "FIRE";
  if (type.includes("accident") || type.includes("road") || type.includes("traffic")) return "ROAD_INCIDENT";
  if (type.includes("chemical")) return "INFRASTRUCTURE_FAILURE";
  if (type.includes("flood")) return "FLOOD";
  if (type.includes("disease") || type.includes("outbreak")) return "INFECTIOUS_DISEASE";
  if (type.includes("power")) return "INFRASTRUCTURE_FAILURE";
  if (type.includes("collapse")) return "INFRASTRUCTURE_FAILURE";
  return "GENERAL_ALERT";
}

function severityFromExtractedIncident(value: string): string {
  const severity = value.toLowerCase();
  if (severity === "critical") return "CRITICAL";
  if (severity === "high") return "HIGH";
  if (severity === "moderate" || severity === "medium") return "MODERATE";
  if (severity === "low") return "LOW";
  return "INFO";
}

function confidenceFromScore(value: number): string {
  if (value >= 0.9) return "VERIFIED";
  if (value >= 0.75) return "HIGH";
  if (value >= 0.5) return "MEDIUM";
  return "LOW";
}

function vicinityRadiusForHazard(hazardType: string): number {
  if (hazardType === "FIRE") return 1000;
  if (hazardType === "FLOOD") return 800;
  if (hazardType === "ROAD_INCIDENT") return 500;
  if (hazardType === "INFECTIOUS_DISEASE") return 1000;
  return 500;
}

function titleForExtractedIncident(extractedIncident: ExtractedIncident): string {
  const type = extractedIncident.incident_type || "Incident";
  const location = extractedIncident.location_text;
  return location ? `${capitalize(type)} - ${location}` : capitalize(type);
}

function capitalize(value: string): string {
  const text = value.trim();
  if (!text) return "Incident";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function cloneClusterInternal(cluster: StoredIncidentCluster): StoredIncidentCluster {
  return {
    ...cluster,
    extracted_incident: cloneExtractedIncident(cluster.extracted_incident),
    reports: cluster.reports.map(cloneReport),
    recommendations: cloneRecommendations(cluster.recommendations),
    canonical_event: {
      ...cluster.canonical_event,
      location: { ...cluster.canonical_event.location },
      recommendedActions: [...(cluster.canonical_event.recommendedActions ?? [])],
      tags: [...cluster.canonical_event.tags],
    },
    approved_agencies: [...cluster.approved_agencies],
    dispatch_decision: cluster.dispatch_decision
      ? {
          ...cluster.dispatch_decision,
          approved_resources: [...cluster.dispatch_decision.approved_resources],
        }
      : undefined,
    responder_logs: [],
  };
}

function cloneClusterForResponse(cluster: StoredIncidentCluster): IncidentClusterResponse {
  const cloned = cloneClusterInternal(cluster);
  return {
    ...cloned,
    reports: cloned.reports.map((report) => ({
      ...report,
      reporter_location: report.reporter_location
        ? {
            lat: roundCoordinate(report.reporter_location.lat),
            lng: roundCoordinate(report.reporter_location.lng),
          }
        : undefined,
      precise_location_redacted: Boolean(report.reporter_location),
    })),
  };
}

function cloneReport(report: PublicIncidentReport): PublicIncidentReport {
  return {
    ...report,
    reporter_location: report.reporter_location ? { ...report.reporter_location } : undefined,
    media_urls: [...report.media_urls],
  };
}

function cloneExtractedIncident(extractedIncident: ExtractedIncident): ExtractedIncident {
  return {
    ...extractedIncident,
    hazards: [...extractedIncident.hazards],
    missing_fields: [...extractedIncident.missing_fields],
  };
}

function cloneRecommendations(
  recommendations: ResourceAllocationRecommendations
): ResourceAllocationRecommendations {
  return {
    mandatory_agencies: recommendations.mandatory_agencies.map((agency) => ({ ...agency })),
    suggested_agencies: recommendations.suggested_agencies.map((agency) => ({ ...agency })),
    risk_notes: [...recommendations.risk_notes],
    dispatcher_approval_required: true,
  };
}

function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function calculatePriority(
  incident: ExtractedIncident,
  reportCount: number
): { score: number; reason: string } {
  const severity = incident.severity.toLowerCase();
  const severityScore =
    severity === "critical"
      ? 90
      : severity === "high"
        ? 75
        : severity === "moderate" || severity === "medium"
          ? 55
          : severity === "low"
            ? 35
            : 20;
  const casualtyScore = incident.possible_casualties ? 8 : 0;
  const hazardScore = Math.min(6, incident.hazards.length * 2);
  const corroborationScore = Math.min(12, Math.max(0, reportCount - 1) * 4);
  const score = Math.min(100, severityScore + casualtyScore + hazardScore + corroborationScore);
  const reasons = [`${severity || "unknown"} severity`];
  if (incident.possible_casualties) reasons.push("possible casualties");
  if (incident.hazards.length) reasons.push(`${incident.hazards.length} identified hazard(s)`);
  if (reportCount > 1) reasons.push(`${reportCount} grouped reports`);
  return { score, reason: reasons.join("; ") };
}
