import axios from "axios";
import { env } from "../../config/env";
import { aggregateEvents } from "../crisis/crisis.service";
import { severityRank, type CrisisEvent } from "../../../../shared/types/crisisEvent";
import type {
  ForesightInterventions,
  ForesightLeaderBrief,
  ForesightNarrative,
  ForesightOutcome,
  ForesightPrediction,
  ForesightResponse,
  ForesightRiskType,
  ForesightSeverity,
} from "./foresight.types";

const LEADER_BRIEF_SYSTEM_PROMPT = `
You are the MURUS SG Foresight briefing layer for Singapore crisis commanders.

MURUS SG fuses Singapore crisis signals from NEA, PUB, LTA, SCDF, MOH, OneMap, and public resource datasets into one operating picture.

You are not the forecasting model. The deterministic rules engine is the source of truth for:
- risk type
- confidence
- severity
- horizon
- evidence
- recommended actions
- intervention outcomes

Your job is to turn the supplied deterministic package into a commander-ready brief.

Rules:
- Do not invent incidents, locations, agencies, confidence scores, severity, horizons, or resource numbers.
- Do not change confidence or severity.
- Do not claim actions have happened unless supplied.
- Prioritise by urgency, confidence, severity, horizon, and operational impact.
- Explain what command should do first, what to monitor, what agency owns the next action, and whether public/responder comms are needed.
- If all signals are low/advisory, avoid alarmist wording and recommend monitoring posture.
- Keep output concise, operational, and defensible.
- Return only valid JSON matching the requested shape.
`.trim();

const baseline: ForesightOutcome = {
  overflowProbability: 64,
  responseTime: 18,
  livesAtRisk: 847,
};

const SEVERITY_TO_UI: Record<CrisisEvent["severity"], ForesightSeverity> = {
  info: "info",
  advisory: "advisory",
  warning: "warning",
  danger: "danger",
  critical: "critical",
};

export async function getForesightPredictions(interventions: ForesightInterventions): Promise<ForesightResponse> {
  const events = await aggregateEvents();
  const livePredictions = buildDeterministicPredictions(events);
  const deterministic = livePredictions.length > 0 ? livePredictions : demoFallbackPredictions();
  const predictions = deterministic.slice(0, 3);
  const outcomes = calculateOutcomes(interventions);
  const leaderBrief = await generateLeaderBrief(predictions, interventions, baseline, outcomes);
  const llmStatus = summarizeLlmStatus(predictions);

  return {
    predictions,
    interventions,
    baseline,
    outcomes,
    llm: {
      enabled: Boolean(env.LLM_API_KEY),
      status: leaderBrief.status === "generated" ? "generated" : llmStatus,
      model: env.LLM_API_KEY ? env.LLM_MODEL : undefined,
    },
    leaderBrief,
    sourceEvents: events.slice(0, 10).map((event) => ({
      id: event.id,
      source: event.source,
      category: event.category,
      severity: event.severity,
      title: event.title,
      area: event.area,
    })),
  };
}

export function calculateOutcomes(interventions: ForesightInterventions): ForesightOutcome {
  const surgeBeds = clampNumber(interventions.surgeBeds, 0, 50);
  const qrtCount = clampNumber(interventions.qrtCount, 0, 5);

  return {
    overflowProbability: clamp(baseline.overflowProbability - surgeBeds * 0.8 - qrtCount * 3, 0, baseline.overflowProbability),
    responseTime: clamp(baseline.responseTime - qrtCount * 0.15, 0, baseline.responseTime),
    livesAtRisk: clamp(baseline.livesAtRisk - surgeBeds * 4 - qrtCount * 35, 0, baseline.livesAtRisk),
  };
}

function buildDeterministicPredictions(events: CrisisEvent[]): ForesightPrediction[] {
  return events.flatMap((event) => predictionForEvent(event)).sort((left, right) => {
    const severityDelta = uiSeverityRank(right.severity) - uiSeverityRank(left.severity);
    if (severityDelta !== 0) return severityDelta;
    return right.confidence - left.confidence;
  });
}

function predictionForEvent(event: CrisisEvent): ForesightPrediction[] {
  if (event.category === "flood-alert") {
    return [
      basePrediction(event, {
        riskType: "flood_escalation",
        title: `Flood risk escalating - ${event.area ?? event.title}`,
        confidence: confidenceFromEvent(event, 62, 8),
        horizonMinutes: severityRank(event.severity) >= severityRank("danger") ? 40 : 60,
        recommendedAction: "Stage QRT and prepare traffic diversion before access routes degrade.",
        publicAction: "Avoid low-lying roads and do not enter flood water.",
        evidence: [
          "PUB/LTA flood signal normalised by crisis aggregator",
          `${event.vicinityRadiusMeters}m affected vicinity`,
          `Current event severity: ${event.severity}`,
        ],
      }),
    ];
  }

  if (event.category === "dengue-cluster") {
    const rawCaseSize = Number((event.raw as { caseSize?: unknown }).caseSize ?? 0);
    return [
      basePrediction(event, {
        riskType: "dengue_expansion",
        title: `Dengue expansion watch - ${event.area ?? event.title}`,
        confidence: clamp(Math.round(58 + rawCaseSize * 2.3), 50, 86),
        horizonMinutes: 4320,
        recommendedAction: "Schedule vector control sweep and push block-level source reduction advisories.",
        publicAction: "Remove stagnant water, apply repellent, and check common breeding spots.",
        evidence: [
          `NEA dengue cluster detected${rawCaseSize ? ` with ${rawCaseSize} cases` : ""}`,
          `${event.vicinityRadiusMeters}m street-level vicinity`,
          `Current event severity: ${event.severity}`,
        ],
      }),
    ];
  }

  if (event.category === "psi" || event.category === "pm25") {
    return [
      basePrediction(event, {
        riskType: "air_quality_deterioration",
        title: `Air quality advisory watch - ${event.area ?? event.title}`,
        confidence: confidenceFromEvent(event, 54, 7),
        horizonMinutes: 180,
        recommendedAction: "Prepare vulnerable-group advisory and monitor regional trend for escalation.",
        publicAction: "Limit prolonged outdoor activity if air quality worsens.",
        evidence: [
          `NEA ${event.category.toUpperCase()} reading is actionable`,
          `${event.area ?? "Regional"} signal mapped to crisis event`,
          `Current event severity: ${event.severity}`,
        ],
      }),
    ];
  }

  if (event.category === "traffic-incident") {
    return [
      basePrediction(event, {
        riskType: "traffic_disruption",
        title: `Responder access risk - ${event.area ?? event.title}`,
        confidence: confidenceFromEvent(event, 52, 6),
        horizonMinutes: 45,
        recommendedAction: "Check responder route alternatives and pre-alert transport ops if congestion grows.",
        publicAction: "Expect delays and use alternate routes where possible.",
        evidence: [
          "LTA traffic incident normalised by crisis aggregator",
          `${event.vicinityRadiusMeters}m road impact vicinity`,
          `Current event severity: ${event.severity}`,
        ],
      }),
    ];
  }

  return [];
}

function basePrediction(
  event: CrisisEvent,
  options: {
    riskType: ForesightRiskType;
    title: string;
    confidence: number;
    horizonMinutes: number;
    recommendedAction: string;
    publicAction: string;
    evidence: string[];
  }
): ForesightPrediction {
  return {
    id: `foresight:${options.riskType}:${event.id}`,
    riskType: options.riskType,
    title: options.title,
    source: event.source,
    severity: SEVERITY_TO_UI[event.severity],
    confidence: options.confidence,
    horizonMinutes: options.horizonMinutes,
    horizonLabel: formatHorizon(options.horizonMinutes),
    area: event.area ?? event.title,
    location: event.location,
    evidence: options.evidence,
    linkedEventIds: [event.id],
    recommendedAction: options.recommendedAction,
    publicAction: options.publicAction,
    scenarioSource: "live",
    deterministicModel: {
      name: "MURUS_RULES_V1",
      inputs: [event.source, event.category, event.severity],
    },
    narrative: fallbackNarrative(options.title, options.recommendedAction, options.publicAction, "not_configured"),
  };
}

function demoFallbackPredictions(): ForesightPrediction[] {
  return [
    demoPrediction({
      id: "demo:flood-orchard",
      riskType: "flood_escalation",
      title: "Flood risk escalating - Orchard Road",
      source: "PUB",
      severity: "critical",
      confidence: 73,
      horizonMinutes: 40,
      area: "Orchard Road",
      evidence: ["Demo PUB flood alert", "900m shopping-belt impact radius", "High commuter density corridor"],
      recommendedAction: "Stage QRT and prepare traffic diversion before pedestrian routes degrade.",
      publicAction: "Avoid Orchard Road underpasses and do not enter flood water.",
    }),
    demoPrediction({
      id: "demo:health-woodlands",
      riskType: "health_system_pressure",
      title: "ED load pressure watch - North region",
      source: "MOH",
      severity: "warning",
      confidence: 68,
      horizonMinutes: 120,
      area: "Woodlands / KTPH catchment",
      evidence: ["Demo ED surge signal", "Medium medical event in north region", "KTPH catchment pressure scenario"],
      recommendedAction: "Prepare ambulance diversion playbook and open surge-bed standby.",
      publicAction: "Use non-emergency care channels unless symptoms are severe.",
    }),
    demoPrediction({
      id: "demo:dengue-tampines",
      riskType: "dengue_expansion",
      title: "Dengue expansion watch - Tampines St 21",
      source: "NEA",
      severity: "warning",
      confidence: 81,
      horizonMinutes: 4320,
      area: "Tampines St 21",
      evidence: ["Demo dengue cluster", "Street-level 320m radius", "Vector operations scenario"],
      recommendedAction: "Schedule vector control sweep and push block-level source reduction advisories.",
      publicAction: "Remove stagnant water, use repellent, and check pails, trays, and drains.",
    }),
  ];
}

function demoPrediction(input: Omit<ForesightPrediction, "horizonLabel" | "location" | "linkedEventIds" | "scenarioSource" | "deterministicModel" | "narrative">): ForesightPrediction {
  return {
    ...input,
    horizonLabel: formatHorizon(input.horizonMinutes),
    location: null,
    linkedEventIds: [],
    scenarioSource: "demo_fallback",
    deterministicModel: {
      name: "MURUS_RULES_V1",
      inputs: ["demo", input.riskType, input.severity],
    },
    narrative: fallbackNarrative(input.title, input.recommendedAction, input.publicAction, "not_configured"),
  };
}

async function attachNarratives(predictions: ForesightPrediction[]): Promise<ForesightPrediction[]> {
  if (!env.LLM_API_KEY) {
    return predictions.map((prediction) => ({
      ...prediction,
      narrative: fallbackNarrative(prediction.title, prediction.recommendedAction, prediction.publicAction, "not_configured"),
    }));
  }

  return Promise.all(
    predictions.map(async (prediction) => ({
      ...prediction,
      narrative: await generateNarrative(prediction),
    }))
  );
}

async function generateNarrative(prediction: ForesightPrediction): Promise<ForesightNarrative> {
  try {
    const response = await axios.post(
      `${env.LLM_API_BASE_URL.replace(/\/$/, "")}/responses`,
      {
        model: env.LLM_MODEL,
        instructions:
          "You are the MURUS SG crisis communication layer. Do not invent facts, agencies, locations, scores, or actions. Rewrite only from the supplied deterministic prediction. Return only valid JSON with commanderBrief, responderBrief, and residentBrief.",
        input: [
          {
            role: "user",
            content: JSON.stringify({
              task: "Create concise commander, responder, and resident briefings from this deterministic prediction.",
              outputJsonShape: {
                commanderBrief: "string",
                responderBrief: "string",
                residentBrief: "string",
              },
              prediction: {
                title: prediction.title,
                riskType: prediction.riskType,
                severity: prediction.severity,
                confidence: prediction.confidence,
                horizon: prediction.horizonLabel,
                area: prediction.area,
                evidence: prediction.evidence,
                recommendedAction: prediction.recommendedAction,
                publicAction: prediction.publicAction,
              },
            }),
          },
        ],
        stream: false,
      },
      {
        timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = extractOutputText(response.data);
    const parsed = parseJsonFromModelText(text) as Pick<ForesightNarrative, "commanderBrief" | "responderBrief" | "residentBrief">;
    return {
      status: "generated",
      model: env.LLM_MODEL,
      commanderBrief: parsed.commanderBrief,
      responderBrief: parsed.responderBrief,
      residentBrief: parsed.residentBrief,
    };
  } catch (error) {
    const message = errorMessage(error);
    console.warn("[foresight] LLM narrative fallback:", message);
    return fallbackNarrative(prediction.title, prediction.recommendedAction, prediction.publicAction, "fallback", env.LLM_MODEL);
  }
}

function extractOutputText(payload: unknown): string {
  const data = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    choices?: Array<{ message?: { content?: string }; delta?: { content?: string }; text?: string }>;
  };
  if (typeof data.output_text === "string") return data.output_text;

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }

  for (const choice of data.choices ?? []) {
    if (typeof choice.message?.content === "string") return choice.message.content;
    if (typeof choice.text === "string") return choice.text;
    if (typeof choice.delta?.content === "string") return choice.delta.content;
  }

  throw new Error("LLM response did not include output text.");
}

function parseJsonFromModelText(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());

    const firstObject = trimmed.indexOf("{");
    const lastObject = trimmed.lastIndexOf("}");
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
    }

    throw new Error("LLM output did not contain parseable JSON.");
  }
}

function fallbackNarrative(
  title: string,
  recommendedAction: string,
  publicAction: string,
  status: ForesightNarrative["status"],
  model?: string
): ForesightNarrative {
  return {
    status,
    model,
    commanderBrief: `${title}. ${recommendedAction}`,
    responderBrief: `Prepare for tasking: ${recommendedAction}`,
    residentBrief: publicAction,
  };
}

async function generateLeaderBrief(
  predictions: ForesightPrediction[],
  interventions: ForesightInterventions,
  currentBaseline: ForesightOutcome,
  outcomes: ForesightOutcome
): Promise<ForesightLeaderBrief> {
  if (!env.LLM_API_KEY) {
    return fallbackLeaderBrief(predictions, interventions, currentBaseline, outcomes, "not_configured");
  }

  try {
    const response = await axios.post(
      `${env.LLM_API_BASE_URL.replace(/\/$/, "")}/responses`,
      {
        model: env.LLM_MODEL,
        instructions: LEADER_BRIEF_SYSTEM_PROMPT,
        input: [
          {
            role: "user",
            content: JSON.stringify({
              task: "Create one concise leader briefing for commanders from the deterministic Foresight package.",
              outputJsonShape: {
                headline: "string",
                summary: "string",
                posture: "routine_watch | heightened_watch | stage_resources | escalate_command",
                priorityActions: [
                  {
                    label: "string",
                    owner: "Command | PUB | NEA | SCDF | LTA | MOH | Multi-agency",
                    urgency: "now | next_60_min | today | monitor",
                    rationale: "string",
                    linkedPredictionIds: ["string"],
                  },
                ],
                publicComms: "string",
                uncertainty: "string",
                tradeoff: "string",
              },
              interventions,
              baseline: currentBaseline,
              outcomes,
              deltas: outcomeDeltas(currentBaseline, outcomes),
              predictions: predictions.map((prediction) => ({
                id: prediction.id,
                title: prediction.title,
                riskType: prediction.riskType,
                severity: prediction.severity,
                confidence: prediction.confidence,
                horizon: prediction.horizonLabel,
                area: prediction.area,
                evidence: prediction.evidence,
                recommendedAction: prediction.recommendedAction,
              })),
            }),
          },
        ],
        stream: false,
      },
      {
        timeout: env.EXTERNAL_API_TIMEOUT_SECONDS * 1000,
        headers: {
          Authorization: `Bearer ${env.LLM_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = extractOutputText(response.data);
    const parsed = normaliseLeaderBriefJson(parseJsonFromModelText(text), predictions);
    return {
      status: "generated",
      model: env.LLM_MODEL,
      headline: parsed.headline,
      summary: parsed.summary,
      posture: parsed.posture,
      priorityActions: parsed.priorityActions,
      publicComms: parsed.publicComms,
      uncertainty: parsed.uncertainty,
      tradeoff: parsed.tradeoff,
    };
  } catch (error) {
    const message = errorMessage(error);
    console.warn("[foresight] leader brief fallback:", message);
    return fallbackLeaderBrief(predictions, interventions, currentBaseline, outcomes, "fallback", env.LLM_MODEL, message);
  }
}

function fallbackLeaderBrief(
  predictions: ForesightPrediction[],
  interventions: ForesightInterventions,
  currentBaseline: ForesightOutcome,
  outcomes: ForesightOutcome,
  status: ForesightLeaderBrief["status"],
  model?: string,
  fallbackReason?: string
): ForesightLeaderBrief {
  const primary = predictions[0];
  const deltas = outcomeDeltas(currentBaseline, outcomes);
  return {
    status,
    model,
    fallbackReason,
    headline: primary ? `Command priority: ${primary.title}` : "Command priority: maintain watch",
    summary: primary
      ? `${primary.confidence}% confidence over ${primary.horizonLabel}. ${primary.recommendedAction}`
      : "No deterministic foresight risks are available from the current feed.",
    posture: primary ? postureFor(primary) : "routine_watch",
    priorityActions: predictions.slice(0, 3).map((prediction) => ({
      label: prediction.recommendedAction,
      owner: ownerFor(prediction),
      urgency: urgencyFor(prediction),
      rationale: `${prediction.title} has ${prediction.confidence}% confidence over ${prediction.horizonLabel}.`,
      linkedPredictionIds: [prediction.id],
    })),
    publicComms: primary?.publicAction ?? "No public advisory is required from the current Foresight package.",
    uncertainty: "Confidence, severity, and horizons come from deterministic rules; LLM text does not alter those values.",
    tradeoff: `${interventions.surgeBeds} surge beds and ${interventions.qrtCount} QRTs reduce overflow by ${deltas.overflowProbability} pts, response time by ${deltas.responseTime.toFixed(1)} min, and lives-at-risk by ${deltas.livesAtRisk}.`,
  };
}

function normaliseLeaderBriefJson(value: unknown, predictions: ForesightPrediction[]): Pick<ForesightLeaderBrief, "headline" | "summary" | "posture" | "priorityActions" | "publicComms" | "uncertainty" | "tradeoff"> {
  const raw = value as Partial<ForesightLeaderBrief>;
  const fallback = fallbackLeaderBrief(predictions, { surgeBeds: 0, qrtCount: 0 }, baseline, baseline, "fallback");
  const priorityActions = Array.isArray(raw.priorityActions)
    ? raw.priorityActions.slice(0, 3).map((action) => normalisePriorityAction(action, predictions))
    : fallback.priorityActions;

  return {
    headline: typeof raw.headline === "string" ? raw.headline : fallback.headline,
    summary: typeof raw.summary === "string" ? raw.summary : fallback.summary,
    posture: isPosture(raw.posture) ? raw.posture : fallback.posture,
    priorityActions,
    publicComms: typeof raw.publicComms === "string" ? raw.publicComms : fallback.publicComms,
    uncertainty: typeof raw.uncertainty === "string" ? raw.uncertainty : fallback.uncertainty,
    tradeoff: typeof raw.tradeoff === "string" ? raw.tradeoff : fallback.tradeoff,
  };
}

function normalisePriorityAction(value: unknown, predictions: ForesightPrediction[]): ForesightLeaderBrief["priorityActions"][number] {
  const raw = value as Partial<ForesightLeaderBrief["priorityActions"][number]>;
  const linkedPredictionIds = Array.isArray(raw.linkedPredictionIds)
    ? raw.linkedPredictionIds.filter((id): id is string => typeof id === "string")
    : [];
  const firstPrediction = predictions.find((prediction) => linkedPredictionIds.includes(prediction.id)) ?? predictions[0];

  return {
    label: typeof raw.label === "string" ? raw.label : firstPrediction?.recommendedAction ?? "Maintain command watch.",
    owner: isOwner(raw.owner) ? raw.owner : firstPrediction ? ownerFor(firstPrediction) : "Command",
    urgency: isUrgency(raw.urgency) ? raw.urgency : firstPrediction ? urgencyFor(firstPrediction) : "monitor",
    rationale: typeof raw.rationale === "string" ? raw.rationale : firstPrediction ? `${firstPrediction.title} is the linked deterministic prediction.` : "No linked deterministic prediction.",
    linkedPredictionIds: linkedPredictionIds.length ? linkedPredictionIds : firstPrediction ? [firstPrediction.id] : [],
  };
}

function postureFor(prediction: ForesightPrediction): ForesightLeaderBrief["posture"] {
  if (prediction.severity === "critical") return "escalate_command";
  if (prediction.severity === "danger" || prediction.riskType === "flood_escalation") return "stage_resources";
  if (prediction.severity === "warning" || prediction.severity === "advisory") return "heightened_watch";
  return "routine_watch";
}

function ownerFor(prediction: ForesightPrediction): ForesightLeaderBrief["priorityActions"][number]["owner"] {
  if (prediction.riskType === "flood_escalation") return "PUB";
  if (prediction.riskType === "dengue_expansion" || prediction.riskType === "air_quality_deterioration") return "NEA";
  if (prediction.riskType === "traffic_disruption") return "LTA";
  if (prediction.riskType === "health_system_pressure") return "MOH";
  return "Command";
}

function urgencyFor(prediction: ForesightPrediction): ForesightLeaderBrief["priorityActions"][number]["urgency"] {
  if (prediction.horizonMinutes <= 60 || prediction.severity === "critical") return "now";
  if (prediction.horizonMinutes <= 180) return "next_60_min";
  if (prediction.horizonMinutes <= 1440) return "today";
  return "monitor";
}

function isPosture(value: unknown): value is ForesightLeaderBrief["posture"] {
  return typeof value === "string" && ["routine_watch", "heightened_watch", "stage_resources", "escalate_command"].includes(value);
}

function isOwner(value: unknown): value is ForesightLeaderBrief["priorityActions"][number]["owner"] {
  return typeof value === "string" && ["Command", "PUB", "NEA", "SCDF", "LTA", "MOH", "Multi-agency"].includes(value);
}

function isUrgency(value: unknown): value is ForesightLeaderBrief["priorityActions"][number]["urgency"] {
  return typeof value === "string" && ["now", "next_60_min", "today", "monitor"].includes(value);
}

function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    return status ? `HTTP ${status}: ${JSON.stringify(data).slice(0, 800)}` : error.message;
  }
  return error instanceof Error ? error.message : String(error);
}

function outcomeDeltas(currentBaseline: ForesightOutcome, outcomes: ForesightOutcome): ForesightOutcome {
  return {
    overflowProbability: Math.round((currentBaseline.overflowProbability - outcomes.overflowProbability) * 10) / 10,
    responseTime: Math.round((currentBaseline.responseTime - outcomes.responseTime) * 10) / 10,
    livesAtRisk: Math.round(currentBaseline.livesAtRisk - outcomes.livesAtRisk),
  };
}

function summarizeLlmStatus(predictions: ForesightPrediction[]): ForesightNarrative["status"] {
  if (!env.LLM_API_KEY) return "not_configured";
  return predictions.some((prediction) => prediction.narrative.status === "generated") ? "generated" : "fallback";
}

function confidenceFromEvent(event: CrisisEvent, base: number, severityStep: number): number {
  return clamp(Math.round(base + severityRank(event.severity) * severityStep), 45, 92);
}

function uiSeverityRank(severity: ForesightSeverity): number {
  return ["info", "advisory", "warning", "danger", "critical"].indexOf(severity);
}

function formatHorizon(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hrs`;
  return `${Math.round(minutes / 1440)} days`;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return clamp(Math.round(value), min, max);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
