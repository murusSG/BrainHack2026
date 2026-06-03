/**
 * The unified event schema that the Crisis Aggregator normalises every agency
 * feed into. This is the "single source of truth" contract consumed by the
 * Node API (now) and the Flask foresight service (later).
 */

export type AgencySource = "NEA" | "PUB" | "MOH" | "SCDF" | "SPF" | "LTA";

export type HazardType = "environmental" | "biological" | "security" | "infrastructure";

export type Severity = "info" | "advisory" | "warning" | "danger" | "critical";

/** Severity ordered from least to most urgent, for sorting and threshold filters. */
export const SEVERITY_ORDER: Severity[] = ["info", "advisory", "warning", "danger", "critical"];

export function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface CrisisEvent {
  /** Stable identity across polls: `${source}:${category}:${nativeId}`. */
  id: string;
  source: AgencySource;
  hazardType: HazardType;
  /** Fine-grained kind, e.g. "psi" | "flood-alert" | "dengue-cluster" | "traffic-incident". */
  category: string;
  title: string;
  severity: Severity;
  /** null when the feed only provides a text area with no coordinates. */
  location: GeoPoint | null;
  /** Human-readable area/region label (used when location is null, or for display). */
  area?: string;
  /** Hazard-appropriate radius: flood ~300m, dengue ~150m, haze/PSI regional ~5000m. */
  vicinityRadiusMeters: number;
  startedAt: string;
  updatedAt: string;
  /** Original upstream record, for drill-down and debugging. */
  raw: Record<string, unknown>;
}
