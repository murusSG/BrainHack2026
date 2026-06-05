import { env } from "../../config/env";
import type {
  ExtractedIncident,
  PublicIncidentReport,
  SimilarityBreakdown,
  SimilarityResult,
  StoredIncidentCluster,
} from "./incident.types";

const SCORE_WEIGHTS = {
  incident_type: 0.35,
  location: 0.35,
  time: 0.2,
  description: 0.1,
};

export function findSimilarIncidentCluster(
  extractedIncident: ExtractedIncident,
  report: PublicIncidentReport,
  recentClusters: StoredIncidentCluster[]
): SimilarityResult {
  let best:
    | {
        incidentId: string;
        score: number;
        breakdown: SimilarityBreakdown;
      }
    | undefined;

  for (const cluster of recentClusters) {
    const breakdown = scoreClusterSimilarity(extractedIncident, report, cluster);
    const score =
      breakdown.incident_type * SCORE_WEIGHTS.incident_type +
      breakdown.location * SCORE_WEIGHTS.location +
      breakdown.time * SCORE_WEIGHTS.time +
      breakdown.description * SCORE_WEIGHTS.description;

    if (!best || score > best.score) {
      best = {
        incidentId: cluster.incident_id,
        score,
        breakdown,
      };
    }
  }

  if (!best) {
    return {
      is_similar: false,
      confidence: 0,
      reason: "No recent incident clusters are available for comparison.",
    };
  }

  const confidence = roundScore(best.score);
  const isSimilar = confidence >= env.INCIDENT_SIMILARITY_THRESHOLD;
  return {
    is_similar: isSimilar,
    matched_incident_id: isSimilar ? best.incidentId : undefined,
    confidence,
    reason: reasonForScore(isSimilar, best.breakdown),
    score_breakdown: roundBreakdown(best.breakdown),
  };
}

function scoreClusterSimilarity(
  extractedIncident: ExtractedIncident,
  report: PublicIncidentReport,
  cluster: StoredIncidentCluster
): SimilarityBreakdown {
  return {
    incident_type: incidentTypeScore(extractedIncident.incident_type, cluster.extracted_incident.incident_type),
    location: locationScore(extractedIncident, report, cluster),
    time: timeScore(report.reported_at, latestReportedAt(cluster)),
    description: textSimilarity(extractedIncident.description, cluster.extracted_incident.description),
  };
}

function incidentTypeScore(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.85;
  return tokenOverlapScore(normalizedLeft, normalizedRight);
}

function locationScore(
  extractedIncident: ExtractedIncident,
  report: PublicIncidentReport,
  cluster: StoredIncidentCluster
): number {
  const textScore = textSimilarity(extractedIncident.location_text, cluster.extracted_incident.location_text);
  const coordinateScore = bestCoordinateScore(report, cluster);
  return Math.max(textScore, coordinateScore);
}

function bestCoordinateScore(report: PublicIncidentReport, cluster: StoredIncidentCluster): number {
  if (!report.reporter_location) return 0;

  const distances = cluster.reports
    .map((clusterReport) =>
      clusterReport.reporter_location
        ? distanceMeters(report.reporter_location as { lat: number; lng: number }, clusterReport.reporter_location)
        : Number.NaN
    )
    .filter(Number.isFinite);

  if (!distances.length) return 0;
  const nearest = Math.min(...distances);
  if (nearest <= 500) return 1;
  if (nearest <= 1000) return 0.85;
  if (nearest <= 2500) return 0.45;
  return 0;
}

function timeScore(leftIso: string, rightIso: string): number {
  const left = Date.parse(leftIso);
  const right = Date.parse(rightIso);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  const deltaMinutes = Math.abs(left - right) / 60000;
  if (deltaMinutes > env.INCIDENT_SIMILARITY_TIME_WINDOW_MINUTES) return 0;
  return Math.max(0, 1 - deltaMinutes / env.INCIDENT_SIMILARITY_TIME_WINDOW_MINUTES);
}

function latestReportedAt(cluster: StoredIncidentCluster): string {
  const latestReport = cluster.reports
    .map((report) => ({
      reportedAt: report.reported_at,
      timestamp: Date.parse(report.reported_at),
    }))
    .filter((item) => Number.isFinite(item.timestamp))
    .sort((left, right) => right.timestamp - left.timestamp)[0];

  return latestReport?.reportedAt ?? cluster.updated_at;
}

function textSimilarity(left: string, right: string): number {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return 0;
  if (normalizedLeft === normalizedRight) return 1;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return 0.85;
  return tokenOverlapScore(normalizedLeft, normalizedRight);
}

function tokenOverlapScore(left: string, right: string): number {
  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  if (!leftTokens.size || !rightTokens.size) return 0;

  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return intersection / union;
}

function tokens(value: string): string[] {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function distanceMeters(left: { lat: number; lng: number }, right: { lat: number; lng: number }): number {
  const earthRadiusMeters = 6371000;
  const leftLat = toRadians(left.lat);
  const rightLat = toRadians(right.lat);
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(leftLat) * Math.cos(rightLat) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function reasonForScore(isSimilar: boolean, breakdown: SimilarityBreakdown): string {
  const strongSignals = [
    breakdown.incident_type >= 0.8 ? "same incident type" : undefined,
    breakdown.location >= 0.8 ? "similar location" : undefined,
    breakdown.time >= 0.5 ? "reported within the active similarity window" : undefined,
    breakdown.description >= 0.25 ? "overlapping report details" : undefined,
  ].filter(Boolean);

  if (isSimilar) {
    return strongSignals.length
      ? `Matched on ${strongSignals.join(", ")}.`
      : "Similarity threshold met across weak combined signals.";
  }

  return strongSignals.length
    ? `Not grouped; ${strongSignals.join(", ")} was not enough to meet the threshold.`
    : "No sufficient similarity signal found.";
}

function roundBreakdown(breakdown: SimilarityBreakdown): SimilarityBreakdown {
  return {
    incident_type: roundScore(breakdown.incident_type),
    location: roundScore(breakdown.location),
    time: roundScore(breakdown.time),
    description: roundScore(breakdown.description),
  };
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
