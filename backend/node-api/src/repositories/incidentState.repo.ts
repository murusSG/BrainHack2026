import { supabase } from "../config/supabase";
import type {
  PersistedPublicIncidentReport,
  PublicIncidentReport,
  PublicIncidentReportStatus,
  StoredIncidentCluster,
} from "../modules/incidents/incident.types";
import { ApiError } from "../utils/apiError";

type StoredIncidentSnapshot = Omit<StoredIncidentCluster, "reports" | "responder_logs">;

type IncidentRow = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  status: StoredIncidentCluster["status"];
  severity: string | null;
  priority_score: number | null;
  priority_reason: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  marker_status: string;
  recommended_agencies: unknown;
  recommended_resources: unknown;
  cluster_id: string | null;
  created_from_report_id: string | null;
  resource_allocation_status: StoredIncidentCluster["resource_allocation_status"];
  canonical_event: unknown;
  extracted_incident: unknown;
  recommendations: unknown;
  approved_agencies: string[] | null;
  approved_by: string | null;
  approved_at: string | null;
  dispatch_decision: unknown;
  created_at: string;
  updated_at: string;
};

type PublicIncidentReportRow = {
  id: string;
  report_id: string;
  source: string;
  title: string | null;
  category: string | null;
  report_text: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  media_urls: unknown;
  incident_id: string | null;
  status: string;
  reported_at: string;
  created_at: string;
};

const INCIDENTS_TABLE = "incidents";
const PUBLIC_INCIDENT_REPORTS_TABLE = "public_incident_reports";

const memoryIncidents = new Map<string, StoredIncidentSnapshot>();
const memoryPublicReports = new Map<string, PersistedPublicIncidentReport>();
const unavailableSupabaseTables = new Set<string>();
let memoryIncidentSequence = 1;
let memoryPublicReportSequence = 1;

function requireSupabase() {
  return supabase;
}

function shouldUseMemoryTable(table: string): boolean {
  return !supabase || unavailableSupabaseTables.has(table);
}

function markTableUnavailable(table: string, error: { code?: unknown; message?: unknown } | null | undefined): boolean {
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? "");
  const normalizedMessage = message.toLowerCase();
  const qualifiedTableName = `public.${table}`.toLowerCase();
  const isMissingTableError =
    code === "PGRST205" ||
    code === "42P01" ||
    (normalizedMessage.includes(qualifiedTableName) &&
      (normalizedMessage.includes("schema cache") ||
        normalizedMessage.includes("does not exist") ||
        normalizedMessage.includes("not found")));
  const isAuthorizationError =
    code === "42501" ||
    normalizedMessage.includes("row-level security policy") ||
    normalizedMessage.includes("permission denied");

  if (!isMissingTableError && !isAuthorizationError) {
    return false;
  }

  if (!unavailableSupabaseTables.has(table)) {
    const guidance = isAuthorizationError
      ? `Verify the Node API is using SUPABASE_SERVICE_ROLE_KEY and that the incident-state RLS policies from backend/node-api/supabase/migration_incident_state.sql are applied.`
      : `Apply backend/node-api/supabase/migration_incident_state.sql to restore durable persistence.`;
    console.warn(
      `[incidentStateRepo] Supabase table "${table}" is unavailable; falling back to in-memory incident state. ${guidance}`,
      message
    );
  }

  unavailableSupabaseTables.add(table);
  return true;
}

export async function nextIncidentId(): Promise<string> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(INCIDENTS_TABLE)) {
    const incidentId = `INC-${String(memoryIncidentSequence).padStart(3, "0")}`;
    memoryIncidentSequence += 1;
    return incidentId;
  }

  const { data, error } = await db.from(INCIDENTS_TABLE).select("id");
  if (error) {
    if (markTableUnavailable(INCIDENTS_TABLE, error)) {
      const incidentId = `INC-${String(memoryIncidentSequence).padStart(3, "0")}`;
      memoryIncidentSequence += 1;
      return incidentId;
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: INCIDENTS_TABLE });
  }

  const maxSequence = (data ?? []).reduce((highest, item) => {
    const match = /^INC-(\d+)$/i.exec(String((item as { id?: unknown }).id ?? ""));
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `INC-${String(maxSequence + 1).padStart(3, "0")}`;
}

export async function insertPublicIncidentReport(
  report: PublicIncidentReport
): Promise<PersistedPublicIncidentReport> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(PUBLIC_INCIDENT_REPORTS_TABLE)) {
    const id = `public-report-${String(memoryPublicReportSequence).padStart(4, "0")}`;
    memoryPublicReportSequence += 1;
    const created: PersistedPublicIncidentReport = {
      id,
      ...clonePublicIncidentReport(report),
      status: "received",
      created_at: new Date().toISOString(),
    };
    memoryPublicReports.set(id, created);
    return created;
  }

  const { data, error } = await db
    .from(PUBLIC_INCIDENT_REPORTS_TABLE)
    .insert({
      report_id: report.report_id,
      source: report.source,
      report_text: report.report_text,
      location_name: null,
      latitude: report.reporter_location?.lat ?? null,
      longitude: report.reporter_location?.lng ?? null,
      media_urls: report.media_urls,
      status: "received",
      reported_at: report.reported_at,
    })
    .select("*")
    .single();

  if (error) {
    if (markTableUnavailable(PUBLIC_INCIDENT_REPORTS_TABLE, error)) {
      return insertPublicIncidentReport(report);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: PUBLIC_INCIDENT_REPORTS_TABLE });
  }

  return mapPublicIncidentReportRow(data as PublicIncidentReportRow);
}

export async function updatePublicIncidentReport(
  reportId: string,
  patch: {
    incident_id?: string;
    title?: string;
    category?: string;
    location_name?: string;
    reporter_location?: PublicIncidentReport["reporter_location"];
    status?: PublicIncidentReportStatus;
  }
): Promise<PersistedPublicIncidentReport> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(PUBLIC_INCIDENT_REPORTS_TABLE)) {
    const existing = memoryPublicReports.get(reportId);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Public incident report not found.", 404, {
        report_id: reportId,
      });
    }
    const updated: PersistedPublicIncidentReport = {
      ...existing,
      incident_id: patch.incident_id ?? existing.incident_id,
      title: patch.title ?? existing.title,
      category: patch.category ?? existing.category,
      location_name: patch.location_name ?? existing.location_name,
      reporter_location: patch.reporter_location ?? existing.reporter_location,
      status: patch.status ?? existing.status,
    };
    memoryPublicReports.set(reportId, updated);
    return updated;
  }

  const { data, error } = await db
    .from(PUBLIC_INCIDENT_REPORTS_TABLE)
    .update({
      incident_id: patch.incident_id,
      title: patch.title,
      category: patch.category,
      location_name: patch.location_name,
      latitude: patch.reporter_location?.lat ?? undefined,
      longitude: patch.reporter_location?.lng ?? undefined,
      status: patch.status,
    })
    .eq("id", reportId)
    .select("*")
    .single();

  if (error) {
    if (markTableUnavailable(PUBLIC_INCIDENT_REPORTS_TABLE, error)) {
      return updatePublicIncidentReport(reportId, patch);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: PUBLIC_INCIDENT_REPORTS_TABLE });
  }

  return mapPublicIncidentReportRow(data as PublicIncidentReportRow);
}

export async function listPublicIncidentReports(
  options: { incidentId?: string } = {}
): Promise<PersistedPublicIncidentReport[]> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(PUBLIC_INCIDENT_REPORTS_TABLE)) {
    const reports = [...memoryPublicReports.values()];
    return reports
      .filter((report) => !options.incidentId || report.incident_id === options.incidentId)
      .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))
      .map(clonePersistedPublicIncidentReport);
  }

  let query = db
    .from(PUBLIC_INCIDENT_REPORTS_TABLE)
    .select("*")
    .order("created_at", { ascending: true });
  if (options.incidentId) {
    query = query.eq("incident_id", options.incidentId);
  }

  const { data, error } = await query;
  if (error) {
    if (markTableUnavailable(PUBLIC_INCIDENT_REPORTS_TABLE, error)) {
      return listPublicIncidentReports(options);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: PUBLIC_INCIDENT_REPORTS_TABLE });
  }

  return ((data ?? []) as PublicIncidentReportRow[]).map(mapPublicIncidentReportRow);
}

export async function insertIncidentCluster(
  cluster: StoredIncidentCluster,
  createdFromReportId?: string
): Promise<StoredIncidentCluster> {
  const db = requireSupabase();
  const snapshot = toSnapshot(cluster);

  if (!db || shouldUseMemoryTable(INCIDENTS_TABLE)) {
    memoryIncidents.set(cluster.incident_id, snapshot);
    return hydrateCluster(snapshot, reportsForIncidentId(cluster.incident_id));
  }

  const { data, error } = await db
    .from(INCIDENTS_TABLE)
    .insert({
      id: snapshot.incident_id,
      title: titleForCluster(snapshot),
      category: snapshot.extracted_incident?.incident_type ?? null,
      description: snapshot.extracted_incident?.description ?? null,
      status: snapshot.status,
      severity: snapshot.extracted_incident?.severity ?? null,
      priority_score: snapshot.priority_score,
      priority_reason: snapshot.priority_reason,
      location_name:
        snapshot.canonical_event?.location?.addressText ?? snapshot.extracted_incident?.location_text ?? null,
      latitude: snapshot.canonical_event?.location?.latitude ?? null,
      longitude: snapshot.canonical_event?.location?.longitude ?? null,
      marker_status: snapshot.marker_status ?? "pending",
      recommended_agencies: recommendedAgenciesForCluster(snapshot),
      recommended_resources: [],
      cluster_id: snapshot.incident_id,
      created_from_report_id: createdFromReportId ?? null,
      resource_allocation_status: snapshot.resource_allocation_status,
      canonical_event: snapshot.canonical_event,
      extracted_incident: snapshot.extracted_incident,
      recommendations: snapshot.recommendations,
      approved_agencies: snapshot.approved_agencies,
      approved_by: snapshot.approved_by ?? null,
      approved_at: snapshot.approved_at ?? null,
      dispatch_decision: snapshot.dispatch_decision ?? null,
      created_at: snapshot.created_at,
      updated_at: snapshot.updated_at,
    })
    .select("*")
    .single();

  if (error) {
    if (markTableUnavailable(INCIDENTS_TABLE, error)) {
      return insertIncidentCluster(cluster, createdFromReportId);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: INCIDENTS_TABLE });
  }

  const reports = await listPublicIncidentReports({ incidentId: cluster.incident_id });
  return hydrateCluster(mapIncidentRowToSnapshot(data as IncidentRow), reports);
}

export async function updateIncidentCluster(cluster: StoredIncidentCluster): Promise<StoredIncidentCluster> {
  const db = requireSupabase();
  const snapshot = toSnapshot(cluster);

  if (!db || shouldUseMemoryTable(INCIDENTS_TABLE)) {
    memoryIncidents.set(cluster.incident_id, snapshot);
    return hydrateCluster(snapshot, reportsForIncidentId(cluster.incident_id));
  }

  const { data, error } = await db
    .from(INCIDENTS_TABLE)
    .update({
      title: titleForCluster(snapshot),
      category: snapshot.extracted_incident?.incident_type ?? null,
      description: snapshot.extracted_incident?.description ?? null,
      status: snapshot.status,
      severity: snapshot.extracted_incident?.severity ?? null,
      priority_score: snapshot.priority_score,
      priority_reason: snapshot.priority_reason,
      location_name:
        snapshot.canonical_event?.location?.addressText ?? snapshot.extracted_incident?.location_text ?? null,
      latitude: snapshot.canonical_event?.location?.latitude ?? null,
      longitude: snapshot.canonical_event?.location?.longitude ?? null,
      marker_status: snapshot.marker_status ?? "pending",
      recommended_agencies: recommendedAgenciesForCluster(snapshot),
      recommended_resources: [],
      resource_allocation_status: snapshot.resource_allocation_status,
      canonical_event: snapshot.canonical_event,
      extracted_incident: snapshot.extracted_incident,
      recommendations: snapshot.recommendations,
      approved_agencies: snapshot.approved_agencies,
      approved_by: snapshot.approved_by ?? null,
      approved_at: snapshot.approved_at ?? null,
      dispatch_decision: snapshot.dispatch_decision ?? null,
      updated_at: snapshot.updated_at,
    })
    .eq("id", cluster.incident_id)
    .select("*")
    .single();

  if (error) {
    if (markTableUnavailable(INCIDENTS_TABLE, error)) {
      return updateIncidentCluster(cluster);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: INCIDENTS_TABLE });
  }

  const reports = await listPublicIncidentReports({ incidentId: cluster.incident_id });
  return hydrateCluster(mapIncidentRowToSnapshot(data as IncidentRow), reports);
}

export async function getIncidentClusterById(
  incidentId: string
): Promise<StoredIncidentCluster | undefined> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(INCIDENTS_TABLE)) {
    const snapshot = memoryIncidents.get(incidentId);
    return snapshot ? hydrateCluster(snapshot, reportsForIncidentId(incidentId)) : undefined;
  }

  const { data, error } = await db.from(INCIDENTS_TABLE).select("*").eq("id", incidentId).maybeSingle();
  if (error) {
    if (markTableUnavailable(INCIDENTS_TABLE, error)) {
      return getIncidentClusterById(incidentId);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: INCIDENTS_TABLE });
  }
  if (!data) return undefined;

  const reports = await listPublicIncidentReports({ incidentId });
  return hydrateCluster(mapIncidentRowToSnapshot(data as IncidentRow), reports);
}

export async function listIncidentClusters(): Promise<StoredIncidentCluster[]> {
  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(INCIDENTS_TABLE)) {
    return [...memoryIncidents.values()]
      .map((snapshot) => hydrateCluster(snapshot, reportsForIncidentId(snapshot.incident_id)))
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
  }

  const { data, error } = await db
    .from(INCIDENTS_TABLE)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    if (markTableUnavailable(INCIDENTS_TABLE, error)) {
      return listIncidentClusters();
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: INCIDENTS_TABLE });
  }

  return hydrateIncidentRows((data ?? []) as IncidentRow[]);
}

export async function listRecentIncidentClusters(cutoffIso: string): Promise<StoredIncidentCluster[]> {
  const incidents = await listIncidentClusters();
  const cutoff = Date.parse(cutoffIso);
  return incidents.filter((cluster) => {
    const latest = Math.max(
      ...cluster.reports
        .map((report) => Date.parse(report.reported_at))
        .filter((timestamp) => Number.isFinite(timestamp))
    );
    const candidate = Number.isFinite(latest) ? latest : Date.parse(cluster.updated_at);
    return candidate >= cutoff;
  });
}

export function clearIncidentStateForTests() {
  memoryIncidents.clear();
  memoryPublicReports.clear();
  unavailableSupabaseTables.clear();
  memoryIncidentSequence = 1;
  memoryPublicReportSequence = 1;
}

function reportsForIncidentId(incidentId: string): PersistedPublicIncidentReport[] {
  return [...memoryPublicReports.values()]
    .filter((report) => report.incident_id === incidentId)
    .sort((left, right) => Date.parse(left.created_at) - Date.parse(right.created_at))
    .map(clonePersistedPublicIncidentReport);
}

async function hydrateIncidentRows(rows: IncidentRow[]): Promise<StoredIncidentCluster[]> {
  const incidentIds = rows.map((row) => row.id);
  const reports = await listPublicReportsForIncidentIds(incidentIds);
  return rows.map((row) => hydrateCluster(mapIncidentRowToSnapshot(row), reports.get(row.id) ?? []));
}

async function listPublicReportsForIncidentIds(
  incidentIds: string[]
): Promise<Map<string, PersistedPublicIncidentReport[]>> {
  const grouped = new Map<string, PersistedPublicIncidentReport[]>();
  if (!incidentIds.length) return grouped;

  const db = requireSupabase();
  if (!db || shouldUseMemoryTable(PUBLIC_INCIDENT_REPORTS_TABLE)) {
    for (const report of memoryPublicReports.values()) {
      if (!report.incident_id || !incidentIds.includes(report.incident_id)) continue;
      const current = grouped.get(report.incident_id) ?? [];
      current.push(clonePersistedPublicIncidentReport(report));
      grouped.set(report.incident_id, current);
    }
    return grouped;
  }

  const { data, error } = await db
    .from(PUBLIC_INCIDENT_REPORTS_TABLE)
    .select("*")
    .in("incident_id", incidentIds)
    .order("created_at", { ascending: true });
  if (error) {
    if (markTableUnavailable(PUBLIC_INCIDENT_REPORTS_TABLE, error)) {
      return listPublicReportsForIncidentIds(incidentIds);
    }
    throw new ApiError("DB_ERROR", error.message, 500, { table: PUBLIC_INCIDENT_REPORTS_TABLE });
  }

  for (const row of (data ?? []) as PublicIncidentReportRow[]) {
    const report = mapPublicIncidentReportRow(row);
    if (!report.incident_id) continue;
    const current = grouped.get(report.incident_id) ?? [];
    current.push(report);
    grouped.set(report.incident_id, current);
  }

  return grouped;
}

function toSnapshot(cluster: StoredIncidentCluster): StoredIncidentSnapshot {
  const { reports: _reports, responder_logs: _responderLogs, ...snapshot } = cluster;
  return {
    ...snapshot,
    marker_status: cluster.marker_status ?? "pending",
  };
}

function hydrateCluster(
  snapshot: StoredIncidentSnapshot,
  reports: PersistedPublicIncidentReport[]
): StoredIncidentCluster {
  return {
    ...snapshot,
    marker_status: snapshot.marker_status ?? "pending",
    reports: reports.map(toClusterReport),
    responder_logs: [],
  };
}

function toClusterReport(report: PersistedPublicIncidentReport): PublicIncidentReport {
  return {
    report_id: report.report_id,
    report_text: report.report_text,
    reported_at: report.reported_at,
    source: report.source,
    reporter_location: report.reporter_location
      ? { ...report.reporter_location }
      : undefined,
    media_urls: [...report.media_urls],
  };
}

function mapIncidentRowToSnapshot(row: IncidentRow): StoredIncidentSnapshot {
  const latitude = toFiniteNumber(row.latitude);
  const longitude = toFiniteNumber(row.longitude);
  const canonicalEvent = (row.canonical_event ?? {}) as StoredIncidentSnapshot["canonical_event"];
  return {
    incident_id: row.id,
    status: row.status,
    marker_status: normalizeMarkerStatus(row.marker_status),
    created_at: row.created_at,
    updated_at: row.updated_at,
    extracted_incident: (row.extracted_incident ?? {}) as StoredIncidentSnapshot["extracted_incident"],
    recommendations: (row.recommendations ?? {
      mandatory_agencies: [],
      suggested_agencies: [],
      risk_notes: [],
      dispatcher_approval_required: true,
    }) as StoredIncidentSnapshot["recommendations"],
    resource_allocation_status: row.resource_allocation_status,
    canonical_event: {
      ...canonicalEvent,
      location: {
        ...(canonicalEvent.location ?? {}),
        latitude,
        longitude,
        addressText:
          canonicalEvent.location?.addressText ??
          row.location_name ??
          (row.extracted_incident as { location_text?: string } | null)?.location_text,
      },
    },
    priority_score: Number(row.priority_score ?? 0),
    priority_reason: row.priority_reason ?? "",
    approved_agencies: row.approved_agencies ?? [],
    approved_by: row.approved_by ?? undefined,
    approved_at: row.approved_at ?? undefined,
    dispatch_decision: (row.dispatch_decision ?? undefined) as StoredIncidentSnapshot["dispatch_decision"],
  };
}

function mapPublicIncidentReportRow(row: PublicIncidentReportRow): PersistedPublicIncidentReport {
  return {
    id: row.id,
    report_id: row.report_id,
    report_text: row.report_text,
    reported_at: row.reported_at,
    source: row.source,
    reporter_location:
      toFiniteNumber(row.latitude) !== undefined && toFiniteNumber(row.longitude) !== undefined
        ? {
            lat: Number(row.latitude),
            lng: Number(row.longitude),
          }
        : undefined,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls.map(String) : [],
    incident_id: row.incident_id ?? undefined,
    title: row.title ?? undefined,
    category: row.category ?? undefined,
    location_name: row.location_name ?? undefined,
    status: normalizePublicReportStatus(row.status),
    created_at: row.created_at,
  };
}

function normalizeMarkerStatus(value: string | null | undefined): StoredIncidentCluster["marker_status"] {
  if (value === "approved" || value === "declined" || value === "closed") return value;
  return "pending";
}

function normalizePublicReportStatus(value: string): PublicIncidentReportStatus {
  if (
    value === "pending_approval" ||
    value === "needs_manual_review" ||
    value === "grouped_with_existing_incident" ||
    value === "dispatched" ||
    value === "declined"
  ) {
    return value;
  }
  return "received";
}

function recommendedAgenciesForCluster(snapshot: StoredIncidentSnapshot): unknown[] {
  return [
    ...(snapshot.recommendations?.mandatory_agencies ?? []),
    ...(snapshot.recommendations?.suggested_agencies ?? []),
  ];
}

function titleForCluster(snapshot: StoredIncidentSnapshot): string {
  const incidentType = snapshot.extracted_incident?.incident_type || "Incident";
  const location =
    snapshot.extracted_incident?.location_text || snapshot.canonical_event?.location?.addressText;
  return location ? `${capitalize(incidentType)} - ${location}` : capitalize(incidentType);
}

function capitalize(value: string): string {
  const text = value.trim();
  if (!text) return "Incident";
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function toFiniteNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clonePublicIncidentReport(report: PublicIncidentReport): PublicIncidentReport {
  return {
    ...report,
    reporter_location: report.reporter_location ? { ...report.reporter_location } : undefined,
    media_urls: [...report.media_urls],
  };
}

function clonePersistedPublicIncidentReport(
  report: PersistedPublicIncidentReport
): PersistedPublicIncidentReport {
  return {
    ...report,
    reporter_location: report.reporter_location ? { ...report.reporter_location } : undefined,
    media_urls: [...report.media_urls],
  };
}
