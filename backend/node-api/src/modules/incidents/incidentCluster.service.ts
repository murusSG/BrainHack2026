import { ApiError } from "../../utils/apiError";
import type {
  CanonicalResidentEvent,
  ExtractedIncident,
  IncidentClusterResponse,
  PublicIncidentReport,
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
  const cluster: StoredIncidentCluster = {
    incident_id: incidentId,
    status: resourceAllocationStatus,
    created_at: now,
    updated_at: now,
    extracted_incident: cloneExtractedIncident(extractedIncident),
    reports: [cloneReport(report)],
    recommendations: cloneRecommendations(recommendations),
    resource_allocation_status: resourceAllocationStatus,
    canonical_event: buildCanonicalResidentEvent(incidentId, report, extractedIncident, now),
    approved_agencies: [],
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
  cluster.status = resourceAllocationStatus;
  cluster.updated_at = new Date().toISOString();
  return cloneClusterInternal(cluster);
}

export function approveClusterAgencies(input: {
  incidentId: string;
  dispatcherId: string;
  approvedAgencies: string[];
}): StoredIncidentCluster {
  const cluster = findClusterInternal(input.incidentId);
  if (!cluster) {
    throw new ApiError("NOT_FOUND", "Incident cluster not found.", 404, {
      incident_id: input.incidentId,
    });
  }

  const now = new Date().toISOString();
  cluster.approved_agencies = [...new Set(input.approvedAgencies.map((agency) => agency.trim()).filter(Boolean))];
  cluster.approved_by = input.dispatcherId;
  cluster.approved_at = now;
  cluster.status = "approved";
  cluster.resource_allocation_status = "approved";
  cluster.updated_at = now;
  return cloneClusterInternal(cluster);
}

export function listIncidentClusters(): IncidentClusterResponse[] {
  return clusters.map(cloneClusterForResponse);
}

export function getIncidentCluster(incidentId: string): IncidentClusterResponse | undefined {
  const cluster = findClusterInternal(incidentId);
  return cluster ? cloneClusterForResponse(cluster) : undefined;
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
