import { supabase } from "../config/supabase";
import type {
  IncidentReport,
  CreateIncidentReportInput,
  UpdateIncidentReportInput,
} from "../modules/incidents/incident.types";
import { ApiError } from "../utils/apiError";

function requireSupabase() {
  if (!supabase) {
    throw new ApiError("SERVICE_UNAVAILABLE", "Database is not configured.", 503);
  }
  return supabase;
}

export async function listReports(incidentId: string): Promise<IncidentReport[]> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("incident_reports")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });
  if (error) throw new ApiError("DB_ERROR", error.message, 500);
  return (data ?? []) as IncidentReport[];
}

export async function findReport(reportId: string): Promise<IncidentReport | null> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("incident_reports")
    .select("*")
    .eq("id", reportId)
    .single();
  // PGRST116 = no rows found — not an error, just null
  if (error && error.code !== "PGRST116") {
    throw new ApiError("DB_ERROR", error.message, 500);
  }
  return (data ?? null) as IncidentReport | null;
}

export async function insertReport(
  incidentId: string,
  authorId: string,
  agency: string,
  input: CreateIncidentReportInput
): Promise<IncidentReport> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("incident_reports")
    .insert({
      incident_id: incidentId,
      author_id: authorId,
      agency,
      author_name: input.author_name ?? null,
      situation_summary: input.situation_summary,
      casualties: input.casualties ?? null,
      location: input.location ?? null,
      resources_deployed: input.resources_deployed ?? null,
      actions_taken: input.actions_taken ?? null,
      hazards: input.hazards ?? [],
      next_steps: input.next_steps ?? null,
      status: input.status ?? "draft",
    })
    .select()
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new ApiError("CONFLICT", "You have already filed a report for this incident.", 409);
    }
    throw new ApiError("DB_ERROR", error.message, 500);
  }
  return data as IncidentReport;
}

export async function patchReport(
  reportId: string,
  patch: UpdateIncidentReportInput
): Promise<IncidentReport> {
  const db = requireSupabase();
  const { data, error } = await db
    .from("incident_reports")
    .update(patch)
    .eq("id", reportId)
    .select()
    .single();
  if (error) throw new ApiError("DB_ERROR", error.message, 500);
  return data as IncidentReport;
}
