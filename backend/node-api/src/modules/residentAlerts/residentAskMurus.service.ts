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

function buildAskMurusSystemPrompt() {
  return [
    "You are Ask MURUS, a resident safety assistant for Singapore crisis alerts.",
    "Answer only using the official alert JSON, resident context JSON, and deterministic fallback answer provided by MURUS.",
    "Before answering, use the resident context to personalize the guidance to their profile, current place, saved places, mobility needs, transport mode, emergency pack readiness, and check-in state.",
    "Treat resident_details as the strongest personalization signal. Use the resident's name, home, current situation note, intended destination, and support notes when they are relevant.",
    "Do not invent closures, rescue details, casualty numbers, shelter availability, road status, train status, agency orders, or new incident facts.",
    "Never say a transport service, road, station, or route is operating, open, closed, safe, or clear unless the official alert explicitly says so.",
    "If the official alert does not confirm something, say it is not confirmed by the current MURUS alert.",
    "Format the final answer as four short labelled lines exactly: Situation, Your context, What to do now, Check-in. Keep each line concise, specific, and practical.",
    "In 'Your context', connect the alert to the resident's current area, home, destination, saved places, mobility need, transport mode, and support notes where available.",
    "For evacuation questions, mention a nearest shelter only if resident_context.nearestShelter is present; otherwise say MURUS has not confirmed a shelter for this alert.",
    "Mention exact known places from the resident context when relevant, such as current area, home, work, school, or family location. Do not reveal raw latitude/longitude.",
    "Use a calm Singapore public-safety tone. Plain English, no markdown bullets, no emojis.",
    "Answer directly. Do not include analysis, hidden reasoning, or step-by-step deliberation in the final answer.",
    "For evacuation, medical, rescue, police, or life-threatening uncertainty, tell the resident to follow official emergency services and avoid the affected area.",
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
  const currentAddress = context.currentAddress ? ` near ${context.currentAddress}` : "";
  const currentNote = details?.currentLocationNote ? ` (${details.currentLocationNote})` : "";
  const destination = details?.plannedDestination ? ` You planned to go to ${details.plannedDestination}.` : "";
  const supportNotes = details?.supportNotes ? ` Support note: ${details.supportNotes}.` : "";
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

  return clampAnswer(
    [
      `Situation: ${alert.title} at ${alert.locationLabel}. Official action: ${alert.publicAction}`,
      `Your context: ${namePrefix}${currentPlace}${currentAddress}${currentNote}${
        context.liveLocation?.isInsideAlertRadius ? " is inside the alert area" : " is not currently flagged"
      }${affectedPlaces ? `; affected saved places: ${affectedPlaces}` : ""}${
        unaffectedPlaces ? `; not flagged: ${unaffectedPlaces}` : ""
      }.${home}${destination}`,
      `What to do now: ${fallback}${mobility}${supportNotes}${shelterNote}`,
      `Check-in: ${checkIn}${pack}`,
    ].join("\n")
  );
}

function violatesResidentSafetyGuardrails(answer: string) {
  const transportClaim =
    /\b(?:mrt|train|bus|road|route|station|travel)\b.{0,60}\b(?:safe|clear|open|operating|available|possible)\b/i.test(
      answer
    ) ||
    /\b(?:safe|clear|open|operating|available|possible)\b.{0,60}\b(?:mrt|train|bus|road|route|station|travel)\b/i.test(
      answer
    ) ||
    /\bboard\b.{0,40}\b(?:train|mrt|bus)\b/i.test(answer);

  const inventedCertainty =
    /\b(?:confirmed safe|confirmed clear|no danger|safe to proceed|you can travel|you may travel)\b/i.test(answer);

  return transportClaim || inventedCertainty;
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
