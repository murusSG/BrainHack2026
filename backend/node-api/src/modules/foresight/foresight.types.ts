import type { AgencySource, CrisisEvent, GeoPoint } from "../../../../shared/types/crisisEvent";

export type ForesightRiskType =
  | "flood_escalation"
  | "health_system_pressure"
  | "dengue_expansion"
  | "air_quality_deterioration"
  | "traffic_disruption"
  | "multi_hazard_watch";

export type ForesightSeverity = "info" | "advisory" | "warning" | "danger" | "critical";

export interface ForesightInterventions {
  surgeBeds: number;
  qrtCount: number;
}

export interface ForesightNarrative {
  status: "not_configured" | "generated" | "fallback";
  model?: string;
  commanderBrief: string;
  responderBrief: string;
  residentBrief: string;
}

export interface ForesightPriorityAction {
  label: string;
  owner: "Command" | "PUB" | "NEA" | "SCDF" | "LTA" | "MOH" | "Multi-agency";
  urgency: "now" | "next_60_min" | "today" | "monitor";
  rationale: string;
  linkedPredictionIds: string[];
}

export interface ForesightLeaderBrief {
  status: "not_configured" | "generated" | "fallback";
  model?: string;
  fallbackReason?: string;
  headline: string;
  summary: string;
  posture: "routine_watch" | "heightened_watch" | "stage_resources" | "escalate_command";
  priorityActions: ForesightPriorityAction[];
  publicComms: string;
  uncertainty: string;
  tradeoff: string;
}

export interface ForesightPrediction {
  id: string;
  riskType: ForesightRiskType;
  title: string;
  source: AgencySource | "MURUS";
  severity: ForesightSeverity;
  confidence: number;
  horizonMinutes: number;
  horizonLabel: string;
  area: string;
  location: GeoPoint | null;
  evidence: string[];
  linkedEventIds: string[];
  recommendedAction: string;
  publicAction: string;
  scenarioSource: "live" | "demo_fallback";
  deterministicModel: {
    name: "MURUS_RULES_V1";
    inputs: string[];
  };
  narrative: ForesightNarrative;
}

export interface ForesightOutcome {
  overflowProbability: number;
  responseTime: number;
  livesAtRisk: number;
}

export interface ForesightResponse {
  predictions: ForesightPrediction[];
  interventions: ForesightInterventions;
  baseline: ForesightOutcome;
  outcomes: ForesightOutcome;
  llm: {
    enabled: boolean;
    status: "not_configured" | "generated" | "fallback";
    model?: string;
  };
  leaderBrief: ForesightLeaderBrief;
  sourceEvents: Pick<CrisisEvent, "id" | "source" | "category" | "severity" | "title" | "area">[];
}
