import { BadRequestError } from "../../utils/apiError";
import { env } from "../../config/env";
import { z } from "zod";
import { extractReport } from "./incidentExtraction.service";
import {
  attachReportToCluster,
  createIncidentCluster,
  getIncidentCluster,
  getRecentIncidentClusters,
  listPriorityQueue,
  listResponderIncidents,
  listResponderLogs,
  listIncidentClusters,
  addResponderLog,
  updateClusterResourceAllocation,
} from "./incidentCluster.service";
import { findSimilarIncidentCluster } from "./incidentSimilarity.service";
import {
  manualReviewRecommendations,
  recommendResourceAllocation,
} from "./resourceAllocation.service";
import type {
  ExtractedIncident,
  IncidentClusterResponse,
  IncidentReportResult,
  PublicIncidentReport,
  ResponderIncidentLog,
} from "./incident.types";

const EXTRACTION_CONFIDENCE_THRESHOLD = 0.65;

export async function submitIncidentReport(input: unknown): Promise<IncidentReportResult> {
  const report = normaliseReport(input);
  let extractedIncident: ExtractedIncident;

  try {
    extractedIncident = await extractReport(report);
  } catch {
    const reason = "AI extraction service unavailable or returned invalid data.";
    const fallbackIncident: ExtractedIncident = {
      incident_type: "unknown",
      location_text: "",
      severity: "unknown",
      description: report.report_text.slice(0, 280),
      possible_casualties: false,
      hazards: [],
      confidence: 0,
      missing_fields: ["incident_type", "location", "severity"],
    };
    const recommendations = manualReviewRecommendations(reason);
    const cluster = createIncidentCluster(
      report,
      fallbackIncident,
      recommendations,
      "needs_manual_review"
    );
    console.warn("[incident-report] extraction failed; manual review required", {
      reportId: report.report_id,
      incidentId: cluster.incident_id,
      resourceAllocationCalled: false,
    });
    return manualReviewResult(cluster.incident_id, reason, fallbackIncident, recommendations);
  }

  console.info("[incident-report] extraction complete", {
    reportId: report.report_id,
    confidence: extractedIncident.confidence,
  });

  const manualReviewReason = manualReviewReasonForExtraction(extractedIncident);
  if (manualReviewReason) {
    const recommendations = manualReviewRecommendations(manualReviewReason);
    const cluster = createIncidentCluster(
      report,
      extractedIncident,
      recommendations,
      "needs_manual_review"
    );
    console.info("[incident-report] low-confidence extraction; resource allocation skipped", {
      reportId: report.report_id,
      incidentId: cluster.incident_id,
      confidence: extractedIncident.confidence,
      resourceAllocationCalled: false,
    });
    return manualReviewResult(cluster.incident_id, manualReviewReason, extractedIncident, recommendations);
  }

  const cutoffIso = new Date(
    Date.parse(report.reported_at) - env.INCIDENT_SIMILARITY_TIME_WINDOW_MINUTES * 60000
  ).toISOString();
  const similarity = findSimilarIncidentCluster(
    extractedIncident,
    report,
    getRecentIncidentClusters(cutoffIso)
  );

  console.info("[incident-report] similarity evaluated", {
    reportId: report.report_id,
    similarity: similarity.confidence,
    matchedIncidentId: similarity.matched_incident_id,
  });

  if (similarity.is_similar && similarity.matched_incident_id) {
    const cluster = attachReportToCluster(similarity.matched_incident_id, report);
    console.info("[incident-report] grouped with existing incident; allocation skipped", {
      reportId: report.report_id,
      incidentId: cluster.incident_id,
      resourceAllocationCalled: false,
    });
    return {
      status: "grouped_with_existing_incident",
      incident_id: cluster.incident_id,
      similarity,
      resource_allocation_status: cluster.resource_allocation_status,
      message: "Report grouped with existing incident. No duplicate resource allocation request created.",
    };
  }

  const cluster = createIncidentCluster(
    report,
    extractedIncident,
    manualReviewRecommendations("Resource allocation pending."),
    "pending_dispatcher_approval"
  );

  try {
    const recommendations = await recommendResourceAllocation(extractedIncident);
    const updatedCluster = updateClusterResourceAllocation(
      cluster.incident_id,
      recommendations,
      "pending_dispatcher_approval"
    );
    console.info("[incident-report] new incident created; allocation recommendation staged", {
      reportId: report.report_id,
      incidentId: updatedCluster.incident_id,
      resourceAllocationCalled: true,
    });
    return {
      status: "new_incident_created",
      incident_id: updatedCluster.incident_id,
      extracted_incident: updatedCluster.extracted_incident,
      resource_allocation_status: updatedCluster.resource_allocation_status,
      recommendations: updatedCluster.recommendations,
    };
  } catch {
    const fallback = manualReviewRecommendations(
      "AI resource allocation unavailable. Dispatcher review is required before any agency notification."
    );
    const updatedCluster = updateClusterResourceAllocation(cluster.incident_id, fallback, "needs_manual_review");
    console.warn("[incident-report] allocation failed after cluster creation", {
      reportId: report.report_id,
      incidentId: updatedCluster.incident_id,
      resourceAllocationCalled: true,
    });
    return {
      status: "new_incident_created",
      incident_id: updatedCluster.incident_id,
      extracted_incident: updatedCluster.extracted_incident,
      resource_allocation_status: updatedCluster.resource_allocation_status,
      recommendations: updatedCluster.recommendations,
      message: "Incident cluster created, but resource allocation requires manual dispatcher review.",
    };
  }
}

export function getIncidentClusters(): IncidentClusterResponse[] {
  return listIncidentClusters();
}

export function getIncidentClusterDetails(incidentId: string): IncidentClusterResponse | undefined {
  return getIncidentCluster(incidentId);
}

export function getDispatcherPriorityQueue(): IncidentClusterResponse[] {
  return listPriorityQueue();
}

export function getResponderIncidentList(): IncidentClusterResponse[] {
  return listResponderIncidents();
}

export function getResponderIncidentLogs(incidentId: string): ResponderIncidentLog[] {
  return listResponderLogs(incidentId);
}

const responderLogSchema = z.object({
  agency: z.string().trim().min(1).max(32),
  author: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1).max(2000),
  category: z
    .enum(["hazard", "medical", "evacuation", "security", "resource_update", "general"])
    .default("general"),
});

export function createResponderIncidentLog(
  incidentId: string,
  input: unknown
): ResponderIncidentLog {
  const parsed = responderLogSchema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestError("agency and message are required for responder updates.", {
      issues: parsed.error.flatten().fieldErrors,
    });
  }
  return addResponderLog({
    incidentId,
    ...parsed.data,
  });
}

function normaliseReport(input: unknown): PublicIncidentReport {
  const raw = input as Partial<PublicIncidentReport> | undefined;
  const reportText = safeText(raw?.report_text);
  if (!reportText) {
    throw new BadRequestError("report_text is required.");
  }

  const reportedAt = safeText(raw?.reported_at) || new Date().toISOString();
  const reporterLocation = normaliseReporterLocation(raw?.reporter_location);
  const mediaUrls = Array.isArray(raw?.media_urls) ? raw.media_urls.map(safeText).filter(Boolean) : [];

  return {
    report_id: safeText(raw?.report_id) || makeReportId(),
    report_text: reportText,
    reported_at: Number.isFinite(Date.parse(reportedAt)) ? reportedAt : new Date().toISOString(),
    source: safeText(raw?.source) || "public",
    reporter_location: reporterLocation,
    media_urls: mediaUrls,
  };
}

function normaliseReporterLocation(value: unknown): PublicIncidentReport["reporter_location"] {
  const raw = value as { lat?: unknown; lng?: unknown } | undefined;
  const lat = Number(raw?.lat);
  const lng = Number(raw?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new BadRequestError("reporter_location must contain valid lat and lng.");
  }
  return { lat, lng };
}

function manualReviewReasonForExtraction(extractedIncident: ExtractedIncident): string | undefined {
  const missing = new Set(extractedIncident.missing_fields.map((field) => field.toLowerCase()));
  const hasIncidentType = Boolean(safeText(extractedIncident.incident_type)) && extractedIncident.incident_type !== "unknown";
  const hasLocation = Boolean(safeText(extractedIncident.location_text));
  if ((missing.has("incident_type") && !hasIncidentType) || (missing.has("location") && !hasLocation)) {
    return "Extraction confidence below threshold or missing critical fields.";
  }

  if (!hasIncidentType || !hasLocation) {
    return "Extraction confidence below threshold or missing critical fields.";
  }

  if (isActionableStructuredReport(extractedIncident)) {
    return undefined;
  }

  if (extractedIncident.confidence < EXTRACTION_CONFIDENCE_THRESHOLD) {
    return "Extraction confidence below threshold or missing critical fields.";
  }

  return undefined;
}

function isActionableStructuredReport(extractedIncident: ExtractedIncident): boolean {
  const incidentType = extractedIncident.incident_type.toLowerCase();
  const hasEmergencyType = ["fire", "building fire", "chemical spill", "road accident", "flood", "structural collapse"].some(
    (type) => incidentType.includes(type)
  );
  return hasEmergencyType && Boolean(safeText(extractedIncident.location_text));
}

function manualReviewResult(
  incidentId: string,
  reason: string,
  extractedIncident: Partial<ExtractedIncident>,
  recommendations: ReturnType<typeof manualReviewRecommendations>
): IncidentReportResult {
  return {
    status: "needs_manual_review",
    incident_id: incidentId,
    reason,
    extracted_incident: extractedIncident,
    resource_allocation_status: "needs_manual_review",
    recommendations,
    message: "Incident report requires dispatcher review before resource allocation.",
  };
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function makeReportId(): string {
  return `RPT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}
