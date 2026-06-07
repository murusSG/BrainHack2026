import { ApiError, BadRequestError } from "../../utils/apiError";
import { commandRepo } from "../../repositories/command.repo";
import type {
  AllocationAgencyStatus,
  AllocationSeverity,
  CommandAllocationAgency,
  CommandAllocationRecommendation,
  CommandTimelineEntry,
  CreateCommandAllocationInput,
  UpdateAgencyStatusInput,
} from "./command.types";

const STATUS_VALUES: AllocationAgencyStatus[] = [
  "pending_approval",
  "approved",
  "contacted",
  "rejected",
];

const SEVERITY_VALUES: AllocationSeverity[] = ["critical", "high", "medium", "low"];
const MAX_ALLOCATIONS = 25;
const MAX_TIMELINE = 50;

const allocations: CommandAllocationRecommendation[] = [];
const timeline: CommandTimelineEntry[] = [];

export async function listAllocationRecommendations(): Promise<CommandAllocationRecommendation[]> {
  const persisted = await commandRepo.listAllocations(MAX_ALLOCATIONS);
  if (persisted) {
    syncMemoryAllocations(persisted);
    return persisted.map(cloneRecommendation);
  }

  return allocations.map(cloneRecommendation);
}

export async function listCommandTimeline(): Promise<CommandTimelineEntry[]> {
  const persisted = await commandRepo.listTimeline(MAX_TIMELINE);
  if (persisted) {
    syncMemoryTimeline(persisted);
    return persisted.map((entry) => ({ ...entry }));
  }

  return timeline.map((entry) => ({ ...entry }));
}

export async function createAllocationRecommendation(
  input: CreateCommandAllocationInput
): Promise<CommandAllocationRecommendation> {
  const now = new Date().toISOString();
  const agencies = normaliseAgencies(input.agencies);

  if (!agencies.length) {
    throw new BadRequestError("At least one agency is required for an allocation recommendation.");
  }

  const recommendation: CommandAllocationRecommendation = {
    id: safeText(input.id) || makeId("alloc"),
    incidentId: safeText(input.incidentId) || "FORESIGHT",
    incidentTitle: safeText(input.incidentTitle) || "Foresight allocation",
    severity: normaliseSeverity(input.severity),
    confidence: clampNumber(input.confidence, 0, 100, 72),
    generatedAt: safeText(input.generatedAt) || "just now",
    generatedFrom: safeText(input.generatedFrom) || undefined,
    linkedPrediction: safeText(input.linkedPrediction) || undefined,
    modelVersion: safeText(input.modelVersion) || "MURUS-COMMAND-STATE-1.0",
    triggerSignals: normaliseStrings(input.triggerSignals),
    draftMessage: safeText(input.draftMessage) || "Review and confirm agency availability.",
    agencies,
    createdAt: now,
    updatedAt: now,
  };

  allocations.unshift(recommendation);
  trimTo(allocations, MAX_ALLOCATIONS);

  const timelineEntry = addTimelineEntry({
    title: `Allocation staged - ${recommendation.incidentTitle}`,
    detail: `Dispatcher review opened for ${agencyNames(agencies)}.`,
    location: recommendation.linkedPrediction ?? recommendation.incidentTitle,
    severity: timelineSeverity(recommendation.severity),
    recommendationId: recommendation.id,
  });

  await persistCommandState(recommendation, timelineEntry);

  return cloneRecommendation(recommendation);
}

export async function updateAllocationAgencyStatus(
  recommendationId: string,
  input: UpdateAgencyStatusInput
): Promise<CommandAllocationRecommendation> {
  const recommendation = await findAllocation(recommendationId);
  if (!recommendation) {
    throw new ApiError("NOT_FOUND", "Allocation recommendation not found.", 404, {
      recommendationId,
    });
  }

  const status = normaliseStatus(input.status);
  const requestedAgencyIds = new Set((input.agencyIds ?? []).map(String));
  const shouldUpdateAll = requestedAgencyIds.size === 0;
  const changedAgencies: CommandAllocationAgency[] = [];

  recommendation.agencies = recommendation.agencies.map((agency) => {
    if (!shouldUpdateAll && !requestedAgencyIds.has(agency.id)) return agency;
    if (agency.status === status) return agency;

    const updated = { ...agency, status };
    changedAgencies.push(updated);
    return updated;
  });

  if (!changedAgencies.length) {
    return cloneRecommendation(recommendation);
  }

  recommendation.updatedAt = new Date().toISOString();
  upsertMemoryAllocation(recommendation);

  const timelineEntry = addTimelineEntry({
    title: timelineTitleForStatus(status, recommendation.incidentTitle),
    detail:
      safeText(input.note) ||
      `${agencyNames(changedAgencies)} marked ${statusLabel(status).toLowerCase()}.`,
    location: recommendation.linkedPrediction ?? recommendation.incidentTitle,
    severity: timelineSeverity(recommendation.severity),
    recommendationId: recommendation.id,
  });

  await persistCommandState(recommendation, timelineEntry);

  return cloneRecommendation(recommendation);
}

export async function createCommandTimelineEntry(input: {
  title: string;
  detail: string;
  location: string;
  severity: CommandTimelineEntry["severity"];
  recommendationId?: string;
}): Promise<CommandTimelineEntry> {
  const entry = addTimelineEntry(input);
  await commandRepo.saveTimelineEntry(entry);
  return { ...entry };
}

export function clearCommandStateForTests() {
  allocations.splice(0, allocations.length);
  timeline.splice(0, timeline.length);
}

function addTimelineEntry(input: {
  title: string;
  detail: string;
  location: string;
  severity: CommandTimelineEntry["severity"];
  recommendationId?: string;
}): CommandTimelineEntry {
  const now = new Date();
  const entry: CommandTimelineEntry = {
    id: makeId("timeline"),
    time: formatSingaporeTime(now),
    title: input.title,
    detail: input.detail,
    location: input.location,
    severity: input.severity,
    source: "command",
    recommendationId: input.recommendationId,
    createdAt: now.toISOString(),
  };
  timeline.unshift(entry);
  trimTo(timeline, MAX_TIMELINE);
  return entry;
}

async function findAllocation(id: string): Promise<CommandAllocationRecommendation | undefined> {
  const persisted = await commandRepo.getAllocation(id);
  if (persisted) {
    upsertMemoryAllocation(persisted);
    return cloneRecommendation(persisted);
  }

  const memoryAllocation = allocations.find((item) => item.id === id);
  return memoryAllocation ? cloneRecommendation(memoryAllocation) : undefined;
}

async function persistCommandState(
  recommendation: CommandAllocationRecommendation,
  timelineEntry: CommandTimelineEntry
) {
  await commandRepo.saveAllocation(recommendation);
  await commandRepo.saveTimelineEntry(timelineEntry);
}

function syncMemoryAllocations(items: CommandAllocationRecommendation[]) {
  allocations.splice(0, allocations.length, ...items.map(cloneRecommendation));
}

function syncMemoryTimeline(items: CommandTimelineEntry[]) {
  timeline.splice(0, timeline.length, ...items.map((entry) => ({ ...entry })));
}

function upsertMemoryAllocation(recommendation: CommandAllocationRecommendation) {
  const index = allocations.findIndex((item) => item.id === recommendation.id);
  if (index >= 0) allocations[index] = cloneRecommendation(recommendation);
  else allocations.unshift(cloneRecommendation(recommendation));
  trimTo(allocations, MAX_ALLOCATIONS);
}

function normaliseAgencies(input: CreateCommandAllocationInput["agencies"]): CommandAllocationAgency[] {
  return (input ?? [])
    .map((agency, index) => ({
      id: safeText(agency.id) || `agency-${index + 1}`,
      agency: safeText(agency.agency) || "CMD",
      channel: safeText(agency.channel) || "Ops Command",
      confidence: clampNumber(agency.confidence, 0, 100, 70),
      reason: safeText(agency.reason) || "Dispatcher review required.",
      suggestedAction: safeText(agency.suggestedAction) || "Confirm tasking.",
      status: normaliseStatus(agency.status),
    }))
    .filter((agency) => agency.agency.length > 0);
}

function normaliseStatus(value: unknown): AllocationAgencyStatus {
  if (typeof value === "string" && STATUS_VALUES.includes(value as AllocationAgencyStatus)) {
    return value as AllocationAgencyStatus;
  }
  if (value === undefined || value === null) return "pending_approval";
  throw new BadRequestError("Unsupported allocation agency status.", {
    status: value,
    allowed: STATUS_VALUES,
  });
}

function normaliseSeverity(value: unknown): AllocationSeverity {
  if (typeof value === "string" && SEVERITY_VALUES.includes(value as AllocationSeverity)) {
    return value as AllocationSeverity;
  }
  return "medium";
}

function normaliseStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(safeText).filter(Boolean).slice(0, 8);
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function trimTo<T>(items: T[], max: number) {
  if (items.length > max) items.splice(max);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatSingaporeTime(date: Date): string {
  return `${new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)} SGT`;
}

function agencyNames(agencies: CommandAllocationAgency[]): string {
  return agencies.map((agency) => agency.agency).join(", ") || "selected agencies";
}

function timelineSeverity(severity: AllocationSeverity): CommandTimelineEntry["severity"] {
  if (severity === "critical") return "critical";
  if (severity === "high") return "warning";
  return "normal";
}

function statusLabel(status: AllocationAgencyStatus): string {
  const labels: Record<AllocationAgencyStatus, string> = {
    pending_approval: "Pending approval",
    approved: "Approved",
    contacted: "Contacted",
    rejected: "Rejected",
  };
  return labels[status];
}

function timelineTitleForStatus(status: AllocationAgencyStatus, incidentTitle: string): string {
  if (status === "approved") return `Allocation approved - ${incidentTitle}`;
  if (status === "contacted") return `Agencies contacted - ${incidentTitle}`;
  if (status === "rejected") return `Allocation rejected - ${incidentTitle}`;
  return `Allocation reset - ${incidentTitle}`;
}

function cloneRecommendation(
  recommendation: CommandAllocationRecommendation
): CommandAllocationRecommendation {
  return {
    ...recommendation,
    triggerSignals: [...recommendation.triggerSignals],
    agencies: recommendation.agencies.map((agency) => ({ ...agency })),
  };
}
