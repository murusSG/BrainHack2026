import { ApiError } from "../../utils/apiError";
import type {
  CanonicalResidentEvent,
  ExtractedIncident,
  IncidentClusterResponse,
  PublicIncidentReport,
  ResponderIncidentLog,
  ResponderLogCategory,
  ResourceAllocationRecommendations,
  ResourceAllocationStatus,
  StoredIncidentCluster,
} from "./incident.types";

const clusters: StoredIncidentCluster[] = [];
let incidentSequence = 1;

export function createIncidentCluster(
  report: PublicIncidentReport,
  extractedIncident: ExtractedIncident,
  recommendations: ResourceAllocationRecommendations,
  resourceAllocationStatus: ResourceAllocationStatus
): StoredIncidentCluster {
  const now = new Date().toISOString();
  const incidentId = makeIncidentId();
  const priority = calculatePriority(extractedIncident, 1);
  const cluster: StoredIncidentCluster = {
    incident_id: incidentId,
    status: "pending_approval",
    created_at: now,
    updated_at: now,
    extracted_incident: cloneExtractedIncident(extractedIncident),
    reports: [cloneReport(report)],
    recommendations: cloneRecommendations(recommendations),
    resource_allocation_status: resourceAllocationStatus,
    canonical_event: buildCanonicalResidentEvent(incidentId, report, extractedIncident, now),
    priority_score: priority.score,
    priority_reason: priority.reason,
    approved_agencies: [],
    responder_logs: [],
  };

  // Prototype store only. Replace with PostgreSQL/PostGIS persistence and audit writes.
  clusters.unshift(cluster);
  return cloneClusterInternal(cluster);
}

export function attachReportToCluster(
  incidentId: string,
  report: PublicIncidentReport
): StoredIncidentCluster {
  const cluster = findClusterInternal(incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, { incident_id: incidentId });
  }

  cluster.reports.push(cloneReport(report));
  const priority = calculatePriority(cluster.extracted_incident, cluster.reports.length);
  cluster.priority_score = priority.score;
  cluster.priority_reason = priority.reason;
  cluster.updated_at = new Date().toISOString();
  return cloneClusterInternal(cluster);
}

export function updateClusterResourceAllocation(
  incidentId: string,
  recommendations: ResourceAllocationRecommendations,
  resourceAllocationStatus: ResourceAllocationStatus
): StoredIncidentCluster {
  const cluster = findClusterInternal(incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, { incident_id: incidentId });
  }

  cluster.recommendations = cloneRecommendations(recommendations);
  cluster.resource_allocation_status = resourceAllocationStatus;
  cluster.status = "pending_approval";
  cluster.updated_at = new Date().toISOString();
  return cloneClusterInternal(cluster);
}

export function decideClusterDispatch(input: {
  incidentId: string;
  dispatcherId: string;
  decision: "approved" | "declined";
  approvedAgencies: string[];
  dispatcherNote?: string;
}): StoredIncidentCluster {
  const cluster = findClusterInternal(input.incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, {
      incident_id: input.incidentId,
    });
  }
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
    cluster.responder_logs.push({
      id: makeResponderLogId(cluster),
      incident_id: cluster.incident_id,
      agency: "MURUS",
      author: input.dispatcherId,
      message: `Dispatch approved. Resources assigned: ${approvedAgencies.join(", ")}.${
        input.dispatcherNote ? ` Note: ${input.dispatcherNote}` : ""
      }`,
      category: "resource_update",
      timestamp: now,
    });
  } else {
    cluster.canonical_event.tags = [
      ...cluster.canonical_event.tags.filter((tag) => tag !== "pending_dispatcher_approval"),
      "dispatch_declined",
    ];
  }
  cluster.updated_at = now;
  return cloneClusterInternal(cluster);
}

export function approveClusterAgencies(input: {
  incidentId: string;
  dispatcherId: string;
  approvedAgencies: string[];
}): StoredIncidentCluster {
  return decideClusterDispatch({
    ...input,
    decision: "approved",
  });
}

export function listIncidentClusters(): IncidentClusterResponse[] {
  return clusters.map(cloneClusterForResponse);
}

export function listPriorityQueue(): IncidentClusterResponse[] {
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

export function listResponderIncidents(): IncidentClusterResponse[] {
  return clusters
    .filter((cluster) => cluster.status === "dispatched")
    .sort((left, right) => Date.parse(right.updated_at) - Date.parse(left.updated_at))
    .map(cloneClusterForResponse);
}

export function getIncidentCluster(incidentId: string): IncidentClusterResponse | undefined {
  const cluster = findClusterInternal(incidentId);
  return cluster ? cloneClusterForResponse(cluster) : undefined;
}

export function listResponderLogs(incidentId: string): ResponderIncidentLog[] {
  const cluster = requireCluster(incidentId);
  if (cluster.status !== "dispatched") {
    throw new ApiError("NOT_FOUND", "Responder incident not found.", 404, {
      incident_id: incidentId,
    });
  }
  return cluster.responder_logs.map(cloneResponderLog);
}

export function addResponderLog(input: {
  incidentId: string;
  agency: string;
  author?: string;
  message: string;
  category: ResponderLogCategory;
}): ResponderIncidentLog {
  const cluster = requireCluster(input.incidentId);
  if (cluster.status !== "dispatched") {
    throw new ApiError("NOT_FOUND", "Responder incident not found.", 404, {
      incident_id: input.incidentId,
    });
  }

  const now = new Date().toISOString();
  const log: ResponderIncidentLog = {
    id: makeResponderLogId(cluster),
    incident_id: cluster.incident_id,
    agency: input.agency,
    author: input.author,
    message: input.message,
    category: input.category,
    timestamp: now,
  };
  cluster.responder_logs.push(log);
  cluster.updated_at = now;
  return cloneResponderLog(log);
}

export function getRecentIncidentClusters(cutoffIso: string): StoredIncidentCluster[] {
  const cutoff = Date.parse(cutoffIso);
  return clusters
    .filter((cluster) => latestReportedAtMs(cluster) >= cutoff)
    .map(cloneClusterInternal);
}

export function clearIncidentClusterStateForTests() {
  clusters.splice(0, clusters.length);
  incidentSequence = 1;
}

function findClusterInternal(incidentId: string): StoredIncidentCluster | undefined {
  return clusters.find((cluster) => cluster.incident_id === incidentId);
}

function requireCluster(incidentId: string): StoredIncidentCluster {
  const cluster = findClusterInternal(incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, {
      incident_id: incidentId,
    });
  }
  return cluster;
}

function makeIncidentId(): string {
  const id = `INC-${String(incidentSequence).padStart(3, "0")}`;
  incidentSequence += 1;
  return id;
}

function buildCanonicalResidentEvent(
  incidentId: string,
  report: PublicIncidentReport,
  extractedIncident: ExtractedIncident,
  now: string
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
    location: report.reporter_location
      ? {
          type: "POINT",
          latitude: report.reporter_location.lat,
          longitude: report.reporter_location.lng,
          addressText: extractedIncident.location_text,
          geocodingConfidence: extractedIncident.location_text ? "MEDIUM" : "LOW",
        }
      : {
          type: "UNKNOWN",
          addressText: extractedIncident.location_text,
          geocodingConfidence: extractedIncident.location_text ? "LOW" : "LOW",
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
    responder_logs: cluster.responder_logs.map(cloneResponderLog),
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

function latestReportedAtMs(cluster: StoredIncidentCluster): number {
  const latest = Math.max(
    ...cluster.reports
      .map((report) => Date.parse(report.reported_at))
      .filter((timestamp) => Number.isFinite(timestamp))
  );
  return Number.isFinite(latest) ? latest : Date.parse(cluster.updated_at);
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

function makeResponderLogId(cluster: StoredIncidentCluster): string {
  return `${cluster.incident_id}-LOG-${String(cluster.responder_logs.length + 1).padStart(3, "0")}`;
}

function cloneResponderLog(log: ResponderIncidentLog): ResponderIncidentLog {
  return { ...log };
}
