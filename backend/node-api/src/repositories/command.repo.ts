import { supabase } from "../config/supabase";
import type {
  CommandAllocationAgency,
  CommandAllocationRecommendation,
  CommandTimelineEntry,
} from "../modules/command/command.types";

type AllocationRow = {
  id: string;
  incident_id: string;
  incident_title: string;
  severity: CommandAllocationRecommendation["severity"];
  confidence: number;
  generated_at: string;
  generated_from: string | null;
  linked_prediction: string | null;
  model_version: string;
  trigger_signals: unknown;
  draft_message: string;
  created_at: string;
  updated_at: string;
};

type AgencyRow = {
  allocation_id: string;
  agency_id: string;
  agency: string;
  channel: string;
  confidence: number;
  reason: string;
  suggested_action: string;
  status: CommandAllocationAgency["status"];
};

type TimelineRow = {
  id: string;
  time_label: string;
  title: string;
  detail: string;
  location: string;
  severity: CommandTimelineEntry["severity"];
  source: CommandTimelineEntry["source"];
  recommendation_id: string | null;
  created_at: string;
};

export const commandRepo = {
  async listAllocations(limit = 25): Promise<CommandAllocationRecommendation[] | null> {
    if (!supabase) return null;

    const { data: allocationRows, error } = await supabase
      .from("command_allocations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[commandRepo.listAllocations]", error.message);
      return null;
    }

    const allocations = (allocationRows ?? []) as AllocationRow[];
    if (!allocations.length) return [];

    const agencyRows = await listAgenciesForAllocations(allocations.map((allocation) => allocation.id));
    if (!agencyRows) return null;

    return mapAllocations(allocations, agencyRows);
  },

  async getAllocation(id: string): Promise<CommandAllocationRecommendation | null> {
    if (!supabase) return null;

    const { data: allocationRow, error } = await supabase
      .from("command_allocations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[commandRepo.getAllocation]", error.message);
      return null;
    }
    if (!allocationRow) return null;

    const agencyRows = await listAgenciesForAllocations([id]);
    if (!agencyRows) return null;

    return mapAllocation(allocationRow as AllocationRow, agencyRows);
  },

  async saveAllocation(recommendation: CommandAllocationRecommendation): Promise<boolean> {
    if (!supabase) return false;

    const { error: allocationError } = await supabase.from("command_allocations").upsert({
      id: recommendation.id,
      incident_id: recommendation.incidentId,
      incident_title: recommendation.incidentTitle,
      severity: recommendation.severity,
      confidence: recommendation.confidence,
      generated_at: recommendation.generatedAt,
      generated_from: recommendation.generatedFrom ?? null,
      linked_prediction: recommendation.linkedPrediction ?? null,
      model_version: recommendation.modelVersion,
      trigger_signals: recommendation.triggerSignals,
      draft_message: recommendation.draftMessage,
      created_at: recommendation.createdAt,
      updated_at: recommendation.updatedAt,
    });

    if (allocationError) {
      console.error("[commandRepo.saveAllocation]", allocationError.message);
      return false;
    }

    const agencyRows = recommendation.agencies.map((agency) => ({
      allocation_id: recommendation.id,
      agency_id: agency.id,
      agency: agency.agency,
      channel: agency.channel,
      confidence: agency.confidence,
      reason: agency.reason,
      suggested_action: agency.suggestedAction,
      status: agency.status,
      updated_at: recommendation.updatedAt,
    }));

    const { error: agencyError } = await supabase
      .from("command_allocation_agencies")
      .upsert(agencyRows, { onConflict: "allocation_id,agency_id" });

    if (agencyError) {
      console.error("[commandRepo.saveAllocation.agencies]", agencyError.message);
      return false;
    }

    return true;
  },

  async saveTimelineEntry(entry: CommandTimelineEntry): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from("command_timeline_entries").upsert({
      id: entry.id,
      time_label: entry.time,
      title: entry.title,
      detail: entry.detail,
      location: entry.location,
      severity: entry.severity,
      source: entry.source,
      recommendation_id: entry.recommendationId ?? null,
      created_at: entry.createdAt,
    });

    if (error) {
      console.error("[commandRepo.saveTimelineEntry]", error.message);
      return false;
    }

    return true;
  },

  async listTimeline(limit = 50): Promise<CommandTimelineEntry[] | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("command_timeline_entries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[commandRepo.listTimeline]", error.message);
      return null;
    }

    return ((data ?? []) as TimelineRow[]).map(mapTimelineEntry);
  },
};

async function listAgenciesForAllocations(allocationIds: string[]): Promise<AgencyRow[] | null> {
  if (!supabase) return null;
  if (!allocationIds.length) return [];

  const { data, error } = await supabase
    .from("command_allocation_agencies")
    .select("*")
    .in("allocation_id", allocationIds)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[commandRepo.listAgenciesForAllocations]", error.message);
    return null;
  }

  return (data ?? []) as AgencyRow[];
}

function mapAllocations(
  allocations: AllocationRow[],
  agencies: AgencyRow[]
): CommandAllocationRecommendation[] {
  return allocations.map((allocation) => mapAllocation(allocation, agencies));
}

function mapAllocation(
  allocation: AllocationRow,
  agencies: AgencyRow[]
): CommandAllocationRecommendation {
  return {
    id: allocation.id,
    incidentId: allocation.incident_id,
    incidentTitle: allocation.incident_title,
    severity: allocation.severity,
    confidence: allocation.confidence,
    generatedAt: allocation.generated_at,
    generatedFrom: allocation.generated_from ?? undefined,
    linkedPrediction: allocation.linked_prediction ?? undefined,
    modelVersion: allocation.model_version,
    triggerSignals: Array.isArray(allocation.trigger_signals)
      ? allocation.trigger_signals.map(String)
      : [],
    draftMessage: allocation.draft_message,
    agencies: agencies
      .filter((agency) => agency.allocation_id === allocation.id)
      .map((agency) => ({
        id: agency.agency_id,
        agency: agency.agency,
        channel: agency.channel,
        confidence: agency.confidence,
        reason: agency.reason,
        suggestedAction: agency.suggested_action,
        status: agency.status,
      })),
    createdAt: allocation.created_at,
    updatedAt: allocation.updated_at,
  };
}

function mapTimelineEntry(row: TimelineRow): CommandTimelineEntry {
  return {
    id: row.id,
    time: row.time_label,
    title: row.title,
    detail: row.detail,
    location: row.location,
    severity: row.severity,
    source: row.source,
    recommendationId: row.recommendation_id ?? undefined,
    createdAt: row.created_at,
  };
}
