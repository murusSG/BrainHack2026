import { aggregateEvents } from "../crisis/crisis.service";
import { ApiError, BadRequestError } from "../../utils/apiError";
import { residentAlertsRepo } from "../../repositories/residentAlerts.repo";
import { createCommandTimelineEntry } from "../command/command.service";
import { haversineDistanceMeters } from "../../utils/geo";
import { SEVERITY_ORDER, type CrisisEvent, type Severity } from "../../../../shared/types/crisisEvent";
import { sendResidentAlertSms, sendResidentAlertTelegram, sendResidentAlertWhatsapp } from "./residentAlertSms.service";
import type {
  CreateResidentAlertInput,
  ResidentAlert,
  ResidentAlertFilter,
  ResidentAlertStatus,
  UpdateResidentAlertInput,
} from "./residentAlerts.types";

const DEFAULT_RADIUS_METERS = 5_000;
const DEFAULT_EVENT_RADIUS_METERS = 500;

const commandBroadcasts: ResidentAlert[] = [];

const ACTION_BY_CATEGORY: Record<string, string> = {
  "flood-alert": "Avoid the affected area and do not enter flood water.",
  "dengue-cluster": "Remove stagnant water, use repellent, and check on vulnerable neighbours.",
  psi: "Reduce prolonged outdoor activity if air quality worsens.",
  pm25: "Limit outdoor exertion if you are sensitive to air quality.",
  "traffic-incident": "Avoid the affected route and follow official diversions.",
};

export async function listResidentAlerts(filter: ResidentAlertFilter = {}): Promise<ResidentAlert[]> {
  const crisisFilter =
    filter.lat != null && filter.lng != null
      ? {
          near: {
            lat: filter.lat,
            lng: filter.lng,
            radiusMeters: filter.radiusMeters ?? DEFAULT_RADIUS_METERS,
          },
        }
      : {};

  const events = await aggregateEvents(crisisFilter);
  const incidentAlerts = events
    .filter((event) => event.location)
    .map(eventToResidentAlert);
  const broadcasts = await listBroadcasts(filter);

  return [...broadcasts, ...incidentAlerts].sort((a, b) => {
    const bySeverity = severityRank(b.severity) - severityRank(a.severity);
    if (bySeverity !== 0) return bySeverity;
    return b.issuedAt.localeCompare(a.issuedAt);
  });
}

export async function createResidentAlert(input: CreateResidentAlertInput): Promise<ResidentAlert> {
  const title = input.title?.trim();
  const publicAction = input.publicAction?.trim();
  const severity = input.severity ?? "warning";

  if (!title) throw new BadRequestError("title is required.");
  if (!publicAction) throw new BadRequestError("publicAction is required.");
  if (!SEVERITY_ORDER.includes(severity)) {
    throw new BadRequestError("Unsupported severity.", { severity, allowed: SEVERITY_ORDER });
  }

  const issuedAt = new Date().toISOString();
  const radiusMeters = normaliseRadius(input.radiusMeters);
  const alert: ResidentAlert = {
    id: `resident-alert:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    sourceType: "command_broadcast",
    title,
    body: input.body?.trim() || publicAction,
    publicAction,
    severity,
    locationLabel: input.locationLabel?.trim() || "Singapore",
    lat: finiteOrNull(input.lat),
    lng: finiteOrNull(input.lng),
    radiusMeters,
    relatedEventId: input.relatedEventId,
    issuedAt,
    expiresAt: input.expiresInMinutes
      ? new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString()
      : undefined,
    status: "active",
    channels: [
      "in_app",
      "web",
      ...(input.smsEnabled ? (["sms"] as const) : []),
      ...(input.whatsappEnabled ? (["whatsapp"] as const) : []),
      ...(input.telegramEnabled ? (["telegram"] as const) : []),
    ],
    audience: input.lat != null && input.lng != null ? { type: "nearby", radiusMeters } : { type: "all" },
  };

  commandBroadcasts.unshift(alert);
  trimTo(commandBroadcasts, 50);
  await residentAlertsRepo.saveBroadcast(alert);
  if (input.smsEnabled) {
    await sendResidentAlertSms(alert);
  }
  if (input.whatsappEnabled) {
    await sendResidentAlertWhatsapp(alert);
  }
  if (input.telegramEnabled) {
    await sendResidentAlertTelegram(alert);
  }
  await createCommandTimelineEntry({
    title: `Resident alert published - ${alert.title}`,
    detail: `${alert.locationLabel} broadcast issued to ${audienceLabel(alert)}.`,
    location: alert.locationLabel,
    severity: timelineSeverity(alert.severity),
  });
  return alert;
}

export async function updateResidentAlert(
  alertId: string,
  input: UpdateResidentAlertInput
): Promise<ResidentAlert> {
  const alert = await findCommandBroadcast(alertId);
  if (!alert) {
    throw new ApiError("NOT_FOUND", "Resident alert not found.", 404, { alertId });
  }

  const nextStatus = normaliseStatus(input.status);
  if (input.title !== undefined) alert.title = requiredText(input.title, "title");
  if (input.body !== undefined) alert.body = requiredText(input.body, "body");
  if (input.publicAction !== undefined) alert.publicAction = requiredText(input.publicAction, "publicAction");
  if (input.severity !== undefined) alert.severity = normaliseSeverity(input.severity);
  if (input.expiresInMinutes !== undefined) {
    alert.expiresAt =
      input.expiresInMinutes > 0
        ? new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString()
        : undefined;
  }
  alert.status = nextStatus ?? (alert.status === "resolved" ? "resolved" : "updated");

  upsertMemoryBroadcast(alert);
  await residentAlertsRepo.updateBroadcast(alert);
  await createCommandTimelineEntry({
    title: residentTimelineTitle(alert),
    detail: residentTimelineDetail(alert),
    location: alert.locationLabel,
    severity: timelineSeverity(alert.severity),
  });

  return { ...alert, channels: [...alert.channels], audience: { ...alert.audience } };
}

export function clearResidentAlertsForTests() {
  commandBroadcasts.splice(0, commandBroadcasts.length);
}

function eventToResidentAlert(event: CrisisEvent): ResidentAlert {
  const radiusMeters = event.vicinityRadiusMeters || DEFAULT_EVENT_RADIUS_METERS;
  return {
    id: `resident-alert:event:${event.id}`,
    sourceType: "incident_activated",
    title: event.title,
    body: `${event.source} reported ${event.title.toLowerCase()} near ${event.area ?? "your area"}.`,
    publicAction: ACTION_BY_CATEGORY[event.category] ?? "Follow official advisories for this incident.",
    severity: event.severity,
    locationLabel: event.area ?? event.title,
    lat: event.location?.lat ?? null,
    lng: event.location?.lng ?? null,
    radiusMeters,
    relatedEventId: event.id,
    issuedAt: event.updatedAt ?? event.startedAt,
    status: "active",
    channels: ["in_app", "web"],
    audience: { type: "nearby", radiusMeters },
  };
}

async function findCommandBroadcast(alertId: string): Promise<ResidentAlert | undefined> {
  const persisted = await residentAlertsRepo.listBroadcasts();
  if (persisted) {
    commandBroadcasts.splice(0, commandBroadcasts.length, ...persisted);
  }
  return commandBroadcasts.find((alert) => alert.id === alertId && alert.sourceType === "command_broadcast");
}

function activeCommandBroadcasts(filter: ResidentAlertFilter): ResidentAlert[] {
  const now = Date.now();
  return commandBroadcasts.filter((alert) => {
    if (alert.expiresAt && Date.parse(alert.expiresAt) <= now) return false;
    if (filter.lat == null || filter.lng == null || alert.lat == null || alert.lng == null) return true;
    const distance = haversineDistanceMeters(filter.lat, filter.lng, alert.lat, alert.lng);
    return distance <= (filter.radiusMeters ?? DEFAULT_RADIUS_METERS) + alert.radiusMeters;
  });
}

async function listBroadcasts(filter: ResidentAlertFilter): Promise<ResidentAlert[]> {
  const persisted = await residentAlertsRepo.listBroadcasts();
  if (persisted) {
    commandBroadcasts.splice(0, commandBroadcasts.length, ...persisted);
    return filterAlertsForAudience(persisted, filter);
  }

  return filterAlertsForAudience(activeCommandBroadcasts({}), filter);
}

function filterAlertsForAudience(alerts: ResidentAlert[], filter: ResidentAlertFilter): ResidentAlert[] {
  return alerts.filter((alert) => alertAffectsFilter(alert, filter));
}

function alertAffectsFilter(alert: ResidentAlert, filter: ResidentAlertFilter): boolean {
  if (alert.audience.type === "all") return true;
  if (filter.lat == null || filter.lng == null || alert.lat == null || alert.lng == null) return true;
  const distance = haversineDistanceMeters(filter.lat, filter.lng, alert.lat, alert.lng);
  return distance <= (filter.radiusMeters ?? DEFAULT_RADIUS_METERS) + alert.radiusMeters;
}

function normaliseRadius(radiusMeters?: number): number {
  if (radiusMeters == null) return DEFAULT_RADIUS_METERS;
  if (!Number.isFinite(radiusMeters) || radiusMeters <= 0) {
    throw new BadRequestError("radiusMeters must be a positive number.", { radiusMeters });
  }
  return Math.round(radiusMeters);
}

function normaliseStatus(status: unknown): ResidentAlertStatus | undefined {
  if (status === undefined || status === null) return undefined;
  if (status === "active" || status === "updated" || status === "resolved" || status === "expired") {
    return status;
  }
  throw new BadRequestError("Unsupported resident alert status.", {
    status,
    allowed: ["active", "updated", "resolved", "expired"],
  });
}

function normaliseSeverity(severity: Severity): Severity {
  if (!SEVERITY_ORDER.includes(severity)) {
    throw new BadRequestError("Unsupported severity.", { severity, allowed: SEVERITY_ORDER });
  }
  return severity;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestError(`${field} is required.`);
  }
  return value.trim();
}

function upsertMemoryBroadcast(alert: ResidentAlert) {
  const index = commandBroadcasts.findIndex((item) => item.id === alert.id);
  if (index >= 0) commandBroadcasts[index] = alert;
  else commandBroadcasts.unshift(alert);
  trimTo(commandBroadcasts, 50);
}

function finiteOrNull(value?: number): number | null {
  return Number.isFinite(value) ? Number(value) : null;
}

function severityRank(severity: Severity): number {
  return SEVERITY_ORDER.indexOf(severity);
}

function timelineSeverity(severity: Severity): "critical" | "warning" | "normal" {
  if (severity === "critical" || severity === "danger") return "critical";
  if (severity === "warning" || severity === "advisory") return "warning";
  return "normal";
}

function audienceLabel(alert: ResidentAlert): string {
  if (alert.audience.type === "all") return "all resident channels";
  return `residents within ${alert.radiusMeters}m`;
}

function residentTimelineTitle(alert: ResidentAlert): string {
  if (alert.status === "resolved") return `Resident all-clear issued - ${alert.title}`;
  return `Resident alert updated - ${alert.title}`;
}

function residentTimelineDetail(alert: ResidentAlert): string {
  if (alert.status === "resolved") {
    return `${alert.locationLabel} resident alert marked resolved.`;
  }
  return `${alert.locationLabel} resident guidance updated for ${audienceLabel(alert)}.`;
}

function trimTo<T>(items: T[], max: number) {
  if (items.length > max) items.splice(max);
}
