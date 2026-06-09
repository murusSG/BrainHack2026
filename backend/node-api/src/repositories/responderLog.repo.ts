import { supabase } from "../config/supabase";
import type {
  CreateResponderIncidentLogInput,
  ResponderIncidentLog,
} from "../modules/incidents/incident.types";
import { ApiError } from "../utils/apiError";

type ResponderLogRow = {
  id: string;
  incident_id: string;
  agency: string;
  author: string | null;
  unit: string | null;
  category: ResponderIncidentLog["category"];
  message: string;
  created_at: string;
};

const memoryResponderLogs: ResponderIncidentLog[] = [];

function requireSupabase() {
  if (!supabase) {
    return null;
  }
  return supabase;
}

export async function listResponderLogs(incidentId: string): Promise<ResponderIncidentLog[]> {
  const db = requireSupabase();
  if (!db) {
    return memoryResponderLogs
      .filter((log) => log.incident_id === incidentId)
      .sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
  }

  const { data, error } = await db
    .from("responder_incident_logs")
    .select("*")
    .eq("incident_id", incidentId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new ApiError("DB_ERROR", error.message, 500, {
      incident_id: incidentId,
      table: "responder_incident_logs",
    });
  }

  return ((data ?? []) as ResponderLogRow[]).map(mapResponderLogRow);
}

export async function insertResponderLog(
  incidentId: string,
  input: CreateResponderIncidentLogInput
): Promise<ResponderIncidentLog> {
  const db = requireSupabase();
  if (!db) {
    const log: ResponderIncidentLog = {
      id: makeMemoryLogId(incidentId, memoryResponderLogs.length + 1),
      incident_id: incidentId,
      agency: input.agency ?? "Unknown",
      author: input.author,
      unit: input.unit,
      category: input.category ?? "general",
      message: input.message,
      timestamp: new Date().toISOString(),
    };
    memoryResponderLogs.push(log);
    return log;
  }

  const { data, error } = await db
    .from("responder_incident_logs")
    .insert({
      incident_id: incidentId,
      agency: input.agency,
      author: input.author ?? null,
      unit: input.unit ?? null,
      category: input.category ?? "general",
      message: input.message,
    })
    .select("*")
    .single();

  if (error) {
    throw new ApiError("DB_ERROR", error.message, 500, {
      incident_id: incidentId,
      table: "responder_incident_logs",
    });
  }

  return mapResponderLogRow(data as ResponderLogRow);
}

function mapResponderLogRow(row: ResponderLogRow): ResponderIncidentLog {
  return {
    id: row.id,
    incident_id: row.incident_id,
    agency: row.agency,
    author: row.author ?? undefined,
    unit: row.unit ?? undefined,
    category: row.category,
    message: row.message,
    timestamp: row.created_at,
  };
}

function makeMemoryLogId(incidentId: string, sequence: number): string {
  return `${incidentId}-DBLOG-${String(sequence).padStart(3, "0")}`;
}

export function clearResponderLogStateForTests() {
  memoryResponderLogs.splice(0, memoryResponderLogs.length);
}
