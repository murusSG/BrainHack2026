import axios from "axios";
import { z } from "zod";
import { env } from "../../config/env";
import { BadRequestError, ConfigurationError, UpstreamApiError } from "../../utils/apiError";
import type { ResidentAlert } from "./residentAlerts.types";

export interface ResidentAskMurusInput {
  question?: string;
  alert?: Partial<ResidentAlert>;
  residentContext?: {
    profile?: string;
    profileLabel?: string;
    residentDetails?: {
      displayName?: string;
      homeAddress?: string;
      currentLocationNote?: string;
      plannedDestination?: string;
      supportNotes?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
    };
    pointLabel?: string;
    pointSublabel?: string;
    transportMode?: string;
    mobilityNeed?: string;
    liveLocation?: {
      label?: string;
      address?: string;
      lat?: number;
      lng?: number;
      accuracyMeters?: number;
      capturedAt?: string;
      isInsideAlertRadius?: boolean;
      distanceMeters?: number | null;
    };
    nearestShelter?: {
      name?: string;
      address?: string;
      distanceMeters?: number | null;
      source?: string;
    } | null;
    evacuationGuide?: {
      heading?: string;
      summary?: string;
      detail?: string;
      riskLabel?: string;
      routeLabel?: string;
      routeTone?: string;
      destination?: {
        label?: string;
        address?: string;
        type?: string;
        confidenceLabel?: string;
        kind?: string;
        distanceMeters?: number | null;
      } | null;
      route?: {
        source?: string;
        distanceMeters?: number | null;
        durationSeconds?: number | null;
        pointCount?: number;
      };
      routeConfidence?: {
        label?: string;
        tone?: string;
        reasons?: string[];
      };
      skippedCandidates?: Array<{
        label?: string;
        reasons?: string[];
      }>;
      steps?: Array<{
        title?: string;
        instruction?: string;
        distanceLabel?: string;
        tone?: string;
      }>;
    } | null;
    savedPlaces?: Array<{
      id?: string;
      label?: string;
      address?: string;
      isAffected?: boolean;
      affectedBy?: string | null;
      affectedLocation?: string | null;
    }>;
    emergencyPack?: {
      readyCount?: number;
      totalCount?: number;
      readyItems?: string[];
      missingItems?: string[];
    };
    currentCheckIn?: string | null;
    shareStatusMessage?: string;
  };
  deterministicAnswer?: string;
}

export interface ResidentAskMurusAnswer {
  answer: string;
  mode: "llm" | "fallback";
  model?: string;
  guardrail: string;
}

export interface ResidentRumorCheckInput {
  claim?: string;
  officialAlerts?: Array<Partial<ResidentAlert>>;
  residentContext?: {
    profile?: string;
    profileLabel?: string;
    pointLabel?: string;
    pointSublabel?: string;
    transportMode?: string;
    mobilityNeed?: string;
  };
  deterministicResult?: {
    status?: string;
    label?: string;
    message?: string;
    matchedAlert?: Partial<ResidentAlert> | null;
  };
}

export interface ResidentRumorCheckAnswer {
  status: "verified" | "partial" | "unverified";
  label: string;
  message: string;
  matchedAlert?: {
    id?: string;
    title?: string;
    locationLabel?: string;
  } | null;
  confidence: "high" | "medium" | "low";
  mode: "llm" | "fallback";
  model?: string;
  guardrail: string;
}

const chatCompletionSchema = z.object({
  choices: z.array(
    z.object({
      message: z
        .object({
          content: z.string().nullable().optional(),
        })
        .optional(),
      delta: z
        .object({
          content: z.string().nullable().optional(),
        })
        .optional(),
    })
  ),
});

const rumorCheckPayloadSchema = z.object({
  status: z.string().optional(),
  label: z.string().optional(),
  message: z.string().optional(),
  matchedAlertId: z.string().nullable().optional(),
  matchedAlertTitle: z.string().nullable().optional(),
  confidence: z.string().optional(),
});

export async function answerAskMurus(input: ResidentAskMurusInput): Promise<ResidentAskMurusAnswer> {
  const question = input.question?.trim();
  const alert = normalizeAlert(input.alert);
  const fallback = sanitizeFallback(input.deterministicAnswer, alert);

  if (!question) {
    throw new BadRequestError("Ask MURUS question is required.");
  }

  const apiKey = env.ASK_MURUS_LLM_API_KEY ?? env.LLM_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError("Ask MURUS LLM key is not configured.");
  }

  try {
    const response = await axios.post(
      `${env.ASK_MURUS_LLM_API_BASE_URL.replace(/\/$/, "")}/chat/completions`,
      {
        model: env.ASK_MURUS_LLM_MODEL,
        stream: true,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          { role: "system", content: buildAskMurusSystemPrompt() },
          {
            role: "user",
            content: JSON.stringify({
              question,
              official_alert: alert,
              resident_context: summarizeResidentContext(input.residentContext),
              deterministic_fallback_answer: fallback,
            }),
          },
        ],
      },
      {
        timeout: env.ASK_MURUS_TIMEOUT_MS,
        responseType: "stream",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const answer = await extractCompletionText(response.data);
    if (!answer) {
      return {
        answer: fallback,
        mode: "fallback",
        model: env.ASK_MURUS_LLM_MODEL,
        guardrail: "LLM returned no usable answer; deterministic guidance used.",
      };
    }

    const safeAnswer = clampAnswer(answer);
    if (violatesResidentSafetyGuardrails(safeAnswer)) {
      return {
        answer: buildPersonalizedFallbackAnswer(input, alert, fallback),
        mode: "fallback",
        model: env.ASK_MURUS_LLM_MODEL,
        guardrail: "LLM answer made an unconfirmed safety or transport claim; personalized fallback used.",
      };
    }

    return {
      answer: safeAnswer,
      mode: "llm",
      model: env.ASK_MURUS_LLM_MODEL,
      guardrail: "Grounded in official alert fields and approved fallback rules.",
    };
  } catch (error) {
    if (error instanceof ConfigurationError || error instanceof BadRequestError) throw error;
    const message = axios.isAxiosError(error) ? error.message : String(error);
    throw new UpstreamApiError("Ask MURUS LLM request failed.", { message });
  }
}

export async function checkResidentRumorWithLlm(
  input: ResidentRumorCheckInput
): Promise<ResidentRumorCheckAnswer> {
  const claim = input.claim?.trim();
  if (!claim) {
    throw new BadRequestError("Rumor claim is required.");
  }

  const officialAlerts = normalizeRumorAlerts(input.officialAlerts);
  const fallback = buildRumorFallback(input.deterministicResult, officialAlerts);
  const apiKey = env.ASK_MURUS_LLM_API_KEY ?? env.LLM_API_KEY;

  if (!apiKey) {
    throw new ConfigurationError("Ask MURUS LLM key is not configured.");
  }

  try {
    const response = await axios.post(
      `${env.ASK_MURUS_LLM_API_BASE_URL.replace(/\/$/, "")}/chat/completions`,
      {
        model: env.ASK_MURUS_LLM_MODEL,
        stream: true,
        temperature: 0.1,
        max_tokens: 600,
        messages: [
          { role: "system", content: buildRumorCheckSystemPrompt() },
          {
            role: "user",
            content: JSON.stringify({
              claim,
              official_alerts: officialAlerts,
              resident_context: {
                profile: input.residentContext?.profile,
                profileLabel: input.residentContext?.profileLabel,
                currentPlace: input.residentContext?.pointLabel,
                currentAddress: input.residentContext?.pointSublabel,
                transportMode: input.residentContext?.transportMode,
                mobilityNeed: input.residentContext?.mobilityNeed,
              },
              deterministic_fallback_result: fallback,
            }),
          },
        ],
      },
      {
        timeout: env.ASK_MURUS_TIMEOUT_MS,
        responseType: "stream",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    const answer = await extractCompletionText(response.data);
    const parsed = parseRumorCheckPayload(answer);
    if (!parsed) {
      return {
        ...fallback,
        model: env.ASK_MURUS_LLM_MODEL,
        guardrail: "LLM returned no usable rumor-check JSON; deterministic official-alert match used.",
      };
    }

    return normalizeRumorCheckResult(parsed, officialAlerts, fallback);
  } catch (error) {
    if (error instanceof ConfigurationError || error instanceof BadRequestError) throw error;
    const message = axios.isAxiosError(error) ? error.message : String(error);
    throw new UpstreamApiError("Ask MURUS rumor check request failed.", { message });
  }
}

function buildAskMurusSystemPrompt() {
  return [
    "You are Ask MURUS, a resident safety assistant for Singapore crisis alerts.",
    "Answer only using the official alert JSON, resident context JSON, and deterministic fallback answer provided by MURUS.",
    "Before answering, use the resident context to personalize the guidance to their profile, current place, saved places, mobility needs, transport mode, emergency pack readiness, and check-in state.",
    "Treat resident_details as the strongest personalization signal. Use the resident's name, home, current situation note, intended destination, and support notes when they are relevant.",
    "If an emergency contact is provided, you may suggest contacting them or sharing status with them; do not expose the contact phone unless the resident asks for their saved contact.",
    "Do not invent closures, rescue details, casualty numbers, shelter availability, road status, train status, agency orders, or new incident facts.",
    "Never say a transport service, road, station, or route is operating, open, closed, safe, or clear unless the official alert explicitly says so.",
    "You may still give conditional guidance such as 'only use MRT if station staff confirm the route is clear'; that is not the same as claiming the route is clear.",
    "If the official alert does not confirm something, say it is not confirmed by the current MURUS alert.",
    "Format the final answer as four short labelled lines exactly: Situation, Your context, What to do now, Check-in. Keep each line concise, specific, and practical.",
    "In 'Your context', connect the alert to the resident's current area, home, destination, saved places, mobility need, transport mode, and support notes where available.",
    "For evacuation questions, use resident_context.evacuationGuide when present. It is a generated route preview, not an official clearance.",
    "If evacuationGuide.destination.type is 'shelter', call it a possible shelter candidate and say entry still needs staff or MURUS confirmation.",
    "If evacuationGuide.destination.type is 'away-waypoint', say it is a generated move-away waypoint, not an official shelter.",
    "Mention evacuationGuide.routeConfidence.reasons when they affect the resident's next move, especially if routeLabel is 'Check route' or routeTone is warning/caution.",
    "If evacuationGuide.skippedCandidates exists, do not recommend those skipped candidates; they were rejected for the listed reasons.",
    "For evacuation questions without evacuationGuide, mention a nearest shelter only if resident_context.nearestShelter is present; otherwise say MURUS has not confirmed a shelter for this alert.",
    "Mention exact known places from the resident context when relevant, such as current area, home, work, school, or family location. Do not reveal raw latitude/longitude.",
    "Use a calm Singapore public-safety tone. Plain English, no markdown bullets, no emojis.",
    "Answer directly. Do not include analysis, hidden reasoning, or step-by-step deliberation in the final answer.",
    "For evacuation, medical, rescue, police, or life-threatening uncertainty, tell the resident to follow official emergency services and avoid the affected area.",
  ].join("\n");
}

function buildRumorCheckSystemPrompt() {
  return [
    "You are Ask MURUS rumor checker for Singapore resident crisis alerts.",
    "Your job is to decide whether a resident's forwarded claim is supported by the current official MURUS alerts.",
    "Use only the claim, official_alerts JSON, resident_context JSON, and deterministic_fallback_result provided by MURUS.",
    "Do not use outside knowledge. Do not invent closures, all-clears, casualties, agency statements, transport status, road status, shelter availability, or route safety.",
    "Return JSON only, with no markdown and no extra text.",
    "The JSON shape must be: {\"status\":\"verified|partial|unverified\",\"label\":\"short label\",\"message\":\"one or two short resident-facing sentences\",\"matchedAlertId\":\"id or null\",\"matchedAlertTitle\":\"title or null\",\"confidence\":\"high|medium|low\"}.",
    "Use status verified only when the claim is directly supported by an official alert field.",
    "Use status partial when the claim mentions a similar location, hazard, or action but adds details that are not confirmed.",
    "Use status unverified when no official alert supports the claim, when it contradicts current alerts, or when it claims a closure, all-clear, evacuation order, route safety, or transport status not explicitly stated.",
    "Prefer labels like 'Likely true from MURUS', 'Partly related, not confirmed', or 'Not confirmed by MURUS'.",
    "The message must be practical and cautious: tell the resident to follow official MURUS or agency updates when the claim is not fully verified.",
  ].join("\n");
}

function summarizeResidentContext(context: ResidentAskMurusInput["residentContext"]) {
  const savedPlaces = (context?.savedPlaces ?? []).slice(0, 6).map((place) => ({
    label: place.label,
    address: place.address,
    isAffected: Boolean(place.isAffected),
    affectedBy: place.affectedBy,
    affectedLocation: place.affectedLocation,
  }));

  return {
    profile: context?.profile,
    profileLabel: context?.profileLabel,
    resident_details: {
      displayName: context?.residentDetails?.displayName,
      homeAddress: context?.residentDetails?.homeAddress,
      currentLocationNote: context?.residentDetails?.currentLocationNote,
      plannedDestination: context?.residentDetails?.plannedDestination,
      supportNotes: context?.residentDetails?.supportNotes,
      emergencyContactName: context?.residentDetails?.emergencyContactName,
      emergencyContactPhone: context?.residentDetails?.emergencyContactPhone,
    },
    currentPlace: context?.pointLabel,
    currentAddress: context?.pointSublabel,
    transportMode: context?.transportMode,
    mobilityNeed: context?.mobilityNeed,
    liveLocation: context?.liveLocation
      ? {
          label: context.liveLocation.label,
          address: context.liveLocation.address,
          accuracyMeters: context.liveLocation.accuracyMeters,
          capturedAt: context.liveLocation.capturedAt,
          isInsideAlertRadius: Boolean(context.liveLocation.isInsideAlertRadius),
          distanceMeters: context.liveLocation.distanceMeters ?? null,
        }
      : undefined,
    nearestShelter: context?.nearestShelter
      ? {
          name: context.nearestShelter.name,
          address: context.nearestShelter.address,
          distanceMeters: context.nearestShelter.distanceMeters ?? null,
          source: context.nearestShelter.source,
        }
      : null,
    evacuationGuide: context?.evacuationGuide
      ? {
          heading: context.evacuationGuide.heading,
          summary: context.evacuationGuide.summary,
          detail: context.evacuationGuide.detail,
          riskLabel: context.evacuationGuide.riskLabel,
          routeLabel: context.evacuationGuide.routeLabel,
          routeTone: context.evacuationGuide.routeTone,
          destination: context.evacuationGuide.destination
            ? {
                label: context.evacuationGuide.destination.label,
                address: context.evacuationGuide.destination.address,
                type: context.evacuationGuide.destination.type,
                confidenceLabel: context.evacuationGuide.destination.confidenceLabel,
                kind: context.evacuationGuide.destination.kind,
                distanceMeters: context.evacuationGuide.destination.distanceMeters ?? null,
              }
            : null,
          route: context.evacuationGuide.route
            ? {
                source: context.evacuationGuide.route.source,
                distanceMeters: context.evacuationGuide.route.distanceMeters ?? null,
                durationSeconds: context.evacuationGuide.route.durationSeconds ?? null,
                pointCount: context.evacuationGuide.route.pointCount,
              }
            : undefined,
          routeConfidence: context.evacuationGuide.routeConfidence
            ? {
                label: context.evacuationGuide.routeConfidence.label,
                tone: context.evacuationGuide.routeConfidence.tone,
                reasons: (context.evacuationGuide.routeConfidence.reasons ?? []).slice(0, 6),
              }
            : undefined,
          skippedCandidates: (context.evacuationGuide.skippedCandidates ?? []).slice(0, 3).map((candidate) => ({
            label: candidate.label,
            reasons: (candidate.reasons ?? []).slice(0, 4),
          })),
          steps: (context.evacuationGuide.steps ?? []).slice(0, 5).map((step) => ({
            title: step.title,
            instruction: step.instruction,
            distanceLabel: step.distanceLabel,
            tone: step.tone,
          })),
        }
      : null,
    savedPlaces,
    affectedSavedPlaces: savedPlaces.filter((place) => place.isAffected),
    emergencyPack: context?.emergencyPack,
    currentCheckIn: context?.currentCheckIn,
    shareStatusMessage: context?.shareStatusMessage,
  };
}

function buildPersonalizedFallbackAnswer(
  input: ResidentAskMurusInput,
  alert: ReturnType<typeof normalizeAlert>,
  fallback: string
) {
  const context = summarizeResidentContext(input.residentContext);
  const details = context.resident_details;
  const namePrefix =
    details?.displayName && details.displayName.toLowerCase() !== "resident"
      ? `${details.displayName}, `
      : "";
  const currentPlace = context.currentPlace ?? "your current area";
  const currentAddress = context.currentAddress ? ` (${context.currentAddress})` : "";
  const currentNote = details?.currentLocationNote ? ` Current note: ${details.currentLocationNote}.` : "";
  const destination = details?.plannedDestination ? ` Destination: ${details.plannedDestination}.` : "";
  const supportNotes = details?.supportNotes ? ` Support need: ${stripTrailingPunctuation(details.supportNotes)}.` : "";
  const shelter = context.nearestShelter;
  const shelterNote = shelter?.name
    ? ` Nearest shelter lookup: ${shelter.name}${shelter.address ? `, ${shelter.address}` : ""}${
        shelter.distanceMeters ? ` (${Math.round(shelter.distanceMeters)}m away)` : ""
      }.`
    : "";
  const affectedPlaces = context.affectedSavedPlaces
    .map((place) => place.label)
    .filter(Boolean)
    .join(", ");
  const unaffectedPlaces = (context.savedPlaces ?? [])
    .filter((place) => !place.isAffected)
    .map((place) => `${place.label}${place.address ? ` (${place.address})` : ""}`)
    .slice(0, 3)
    .join(", ");
  const mobility = context.mobilityNeed && context.mobilityNeed !== "none"
    ? ` Move slowly, use lifts or street-level sheltered routes, and ask staff or family for help before entering crowds.`
    : "";
  const pack = context.emergencyPack?.totalCount
    ? ` Emergency pack: ${context.emergencyPack.readyCount ?? 0}/${context.emergencyPack.totalCount} ready${
        context.emergencyPack.missingItems?.length
          ? `; still check ${context.emergencyPack.missingItems.slice(0, 3).join(", ")}`
          : ""
      }.`
    : "";
  const checkIn = context.currentCheckIn
    ? ` You have checked in as "${context.currentCheckIn}".`
    : " If you need help, send a check-in to command.";
  const home = details?.homeAddress ? ` Home: ${details.homeAddress}.` : "";
  const affectedSummary = affectedPlaces ? ` Affected saved places: ${affectedPlaces}.` : "";
  const unaffectedSummary = unaffectedPlaces ? ` Not currently flagged: ${unaffectedPlaces}.` : "";
  const fallbackGuidance = summarizeFallbackGuidance(fallback);

  return clampAnswer(
    [
      `Situation: ${alert.title}${alert.locationLabel ? ` near ${alert.locationLabel}` : ""}. Official action: ${stripTrailingPunctuation(alert.publicAction)}.`,
      `Your context: ${namePrefix}${currentPlace}${currentAddress} is ${
        context.liveLocation?.isInsideAlertRadius ? "inside the alert area" : "the place being checked"
      }.${home}${destination}${currentNote}${affectedSummary}${unaffectedSummary}`,
      `What to do now: ${fallbackGuidance}${mobility}${supportNotes}${shelterNote}`,
      `Check-in: ${checkIn}${pack}`,
    ].join("\n")
  );
}

function summarizeFallbackGuidance(fallback: string) {
  const cleaned = stripTrailingPunctuation(
    fallback
      .replace(/\s+/g, " ")
      .replace(/\bSupport note:\s*[^.]+\.?/gi, "")
      .trim()
  );

  const homeMatch = cleaned.match(
    /(.+? is (?:inside|not currently inside) this alert radius)\.?(?:\s*Only go to (.+?) if your route avoids (.+?); MURUS has not confirmed that your route is clear\.?)?/i
  );

  if (homeMatch) {
    const status = homeMatch[1];
    const destination = homeMatch[2];
    const avoidArea = homeMatch[3];
    if (destination && avoidArea) {
      return `${status} MURUS has not confirmed your route is clear. If you go to ${destination}, avoid ${avoidArea}; otherwise wait at a staffed place for the next official update.`;
    }
    return `${status} MURUS has not confirmed your route is clear, so check official updates before moving.`;
  }

  return `${cleaned}.`;
}

function stripTrailingPunctuation(value = "") {
  return value.replace(/[.!?]+$/g, "").trim();
}

export function violatesResidentSafetyGuardrails(answer: string) {
  const sentences = guardrailSentences(answer);
  return sentences.some((sentence) => {
    if (hasCautiousConfirmationContext(sentence)) return false;

    const transportStatusClaim =
      hasTransportSubject(sentence) && hasUnconfirmedStatusWord(sentence);
    const boardingInstruction = /\bboard\b.{0,40}\b(?:train|mrt|bus)\b/i.test(sentence);
    const inventedCertainty =
      /\b(?:confirmed safe|confirmed clear|no danger|safe to proceed|you can travel|you may travel)\b/i.test(
        sentence
      );

    return transportStatusClaim || boardingInstruction || inventedCertainty;
  });
}

function guardrailSentences(answer: string) {
  return answer
    .replace(/\r\n/g, "\n")
    .split(/(?:[.!?]\s+|\n+)/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function hasTransportSubject(sentence: string) {
  return /\b(?:mrt|train|bus|road|route|station|travel|transport)\b/i.test(sentence);
}

function hasUnconfirmedStatusWord(sentence: string) {
  return /\b(?:safe|clear|open|closed|operating|available)\b/i.test(sentence);
}

function hasCautiousConfirmationContext(sentence: string) {
  return (
    /\b(?:not confirmed|not currently confirmed|not yet confirmed|has not confirmed|have not confirmed|cannot confirm|can't confirm)\b/i.test(
      sentence
    ) ||
    /\b(?:do not|don't|should not|must not|avoid|wait for|check with|confirm with|follow)\b.{0,120}\b(?:staff|murus|official|agency|emergency services|station staff)\b/i.test(
      sentence
    ) ||
    /\b(?:only if|unless|until|after|when)\b.{0,120}\b(?:staff|murus|official|agency|emergency services|station staff)\b.{0,80}\b(?:confirm|confirms|confirmed|say|says|direct|directs|instruct|instructs)\b/i.test(
      sentence
    )
  );
}

function normalizeAlert(alert?: Partial<ResidentAlert>) {
  return {
    title: alert?.title ?? "Current MURUS alert",
    body: alert?.body ?? "",
    publicAction: alert?.publicAction ?? "Follow official MURUS updates and avoid the affected area.",
    severity: alert?.severity ?? "warning",
    status: alert?.status ?? "active",
    locationLabel: alert?.locationLabel ?? "the affected area",
    radiusMeters: alert?.radiusMeters ?? null,
  };
}

function sanitizeFallback(fallback: string | undefined, alert: ReturnType<typeof normalizeAlert>) {
  return (
    fallback?.trim() ||
    `Not confirmed by the current MURUS alert. Follow the official action: ${alert.publicAction}`
  );
}

async function extractCompletionText(data: unknown) {
  if (isAsyncIterable(data)) {
    return extractStreamingCompletionText(data);
  }

  if (typeof data === "string") return data.trim();

  const parsed = chatCompletionSchema.safeParse(data);
  if (!parsed.success) return "";

  return parsed.data.choices
    .map((choice) => choice.message?.content ?? choice.delta?.content ?? "")
    .join("")
    .trim();
}

async function extractStreamingCompletionText(stream: AsyncIterable<unknown>) {
  let buffer = "";
  let answer = "";

  for await (const chunk of stream) {
    buffer += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      try {
        const parsed = chatCompletionSchema.safeParse(JSON.parse(payload));
        if (!parsed.success) continue;
        answer += parsed.data.choices
          .map((choice) => choice.delta?.content ?? choice.message?.content ?? "")
          .filter((content): content is string => Boolean(content))
          .join("");
      } catch {
        continue;
      }
    }
  }

  return answer.trim();
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return Boolean(value && typeof value === "object" && Symbol.asyncIterator in value);
}

function clampAnswer(answer: string) {
  const normalized = answer
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  if (normalized.length <= 1200) return normalized;

  const clipped = normalized.slice(0, 1200);
  const sentenceEnd = Math.max(clipped.lastIndexOf("."), clipped.lastIndexOf("?"), clipped.lastIndexOf("!"));
  return sentenceEnd > 500 ? clipped.slice(0, sentenceEnd + 1) : `${clipped.trimEnd()}...`;
}

function normalizeRumorAlerts(alerts: ResidentRumorCheckInput["officialAlerts"]) {
  return (alerts ?? []).slice(0, 12).map((alert, index) => ({
    id: alert.id ?? `alert-${index + 1}`,
    title: alert.title ?? "MURUS alert",
    body: alert.body ?? "",
    publicAction: alert.publicAction ?? "",
    severity: alert.severity ?? "warning",
    status: alert.status ?? "active",
    locationLabel: alert.locationLabel ?? "",
  }));
}

function buildRumorFallback(
  result: ResidentRumorCheckInput["deterministicResult"],
  officialAlerts: ReturnType<typeof normalizeRumorAlerts>
): ResidentRumorCheckAnswer {
  const status = normalizeRumorStatus(result?.status);
  const matchedAlert =
    resolveRumorAlert(result?.matchedAlert, officialAlerts) ??
    (status === "unverified" ? null : officialAlerts[0] ?? null);

  return {
    status,
    label: cleanSingleLine(result?.label) || labelForRumorStatus(status),
    message:
      cleanSingleLine(result?.message, 420) ||
      "Ask MURUS could not verify this from the current official alerts. Treat it as unconfirmed.",
    matchedAlert: matchedAlert
      ? {
          id: matchedAlert.id,
          title: matchedAlert.title,
          locationLabel: matchedAlert.locationLabel,
        }
      : null,
    confidence: status === "verified" ? "medium" : status === "partial" ? "medium" : "low",
    mode: "fallback",
    model: env.ASK_MURUS_LLM_MODEL,
    guardrail: "Deterministic official-alert match used.",
  };
}

function parseRumorCheckPayload(answer: string) {
  const jsonText = extractJsonObject(answer);
  if (!jsonText) return null;

  try {
    const parsed = rumorCheckPayloadSchema.safeParse(JSON.parse(jsonText));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function extractJsonObject(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return "";
  return candidate.slice(start, end + 1);
}

function normalizeRumorCheckResult(
  parsed: z.infer<typeof rumorCheckPayloadSchema>,
  officialAlerts: ReturnType<typeof normalizeRumorAlerts>,
  fallback: ResidentRumorCheckAnswer
): ResidentRumorCheckAnswer {
  let status = normalizeRumorStatus(parsed.status);
  const matchedAlert = resolveRumorAlert(
    {
      id: parsed.matchedAlertId ?? undefined,
      title: parsed.matchedAlertTitle ?? undefined,
    },
    officialAlerts
  );

  if (status === "verified" && !matchedAlert) {
    status = "partial";
  }
  if (officialAlerts.length === 0) {
    status = "unverified";
  }

  const message =
    cleanSingleLine(parsed.message, 420) ||
    fallback.message ||
    "MURUS could not verify this claim from the current official alerts.";

  return {
    status,
    label: cleanSingleLine(parsed.label, 90) || labelForRumorStatus(status),
    message,
    matchedAlert: matchedAlert
      ? {
          id: matchedAlert.id,
          title: matchedAlert.title,
          locationLabel: matchedAlert.locationLabel,
        }
      : status === "unverified"
        ? null
        : fallback.matchedAlert ?? null,
    confidence: normalizeRumorConfidence(parsed.confidence, fallback.confidence),
    mode: "llm",
    model: env.ASK_MURUS_LLM_MODEL,
    guardrail: "Grounded in current official alert fields; unconfirmed details remain marked as not confirmed.",
  };
}

function resolveRumorAlert(
  alert: Partial<ResidentAlert> | { id?: string; title?: string | null } | null | undefined,
  officialAlerts: ReturnType<typeof normalizeRumorAlerts>
) {
  if (!alert) return null;
  const id = alert.id?.toString().trim();
  const title = alert.title?.toString().trim().toLowerCase();
  return (
    officialAlerts.find((candidate) => candidate.id === id) ??
    officialAlerts.find((candidate) => candidate.title.toLowerCase() === title) ??
    null
  );
}

function normalizeRumorStatus(status: string | undefined): ResidentRumorCheckAnswer["status"] {
  const normalized = status?.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "verified" || normalized === "true" || normalized === "likely_true") {
    return "verified";
  }
  if (normalized === "partial" || normalized === "partly_true" || normalized === "partly_verified") {
    return "partial";
  }
  return "unverified";
}

function normalizeRumorConfidence(
  confidence: string | undefined,
  fallback: ResidentRumorCheckAnswer["confidence"]
): ResidentRumorCheckAnswer["confidence"] {
  const normalized = confidence?.toLowerCase();
  if (normalized === "high" || normalized === "medium" || normalized === "low") return normalized;
  return fallback;
}

function labelForRumorStatus(status: ResidentRumorCheckAnswer["status"]) {
  if (status === "verified") return "Likely true from MURUS";
  if (status === "partial") return "Partly related, not confirmed";
  return "Not confirmed by MURUS";
}

function cleanSingleLine(value: string | undefined, maxLength = 180) {
  const cleaned = value?.replace(/\s+/g, " ").trim() ?? "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}
