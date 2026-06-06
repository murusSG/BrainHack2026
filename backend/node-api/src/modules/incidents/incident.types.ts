export type ReporterLocation = {
  lat: number;
  lng: number;
};

export type PublicIncidentReport = {
  report_id: string;
  report_text: string;
  reported_at: string;
  source: string;
  reporter_location?: ReporterLocation;
  media_urls: string[];
};

export type ExtractedIncident = {
  incident_type: string;
  location_text: string;
  severity: string;
  description: string;
  possible_casualties: boolean;
  hazards: string[];
  confidence: number;
  missing_fields: string[];
  [key: string]: unknown;
};

export type AgencyRecommendation = {
  agency: string;
  reason: string;
  confidence?: string | number;
};

export type ResourceAllocationRecommendations = {
  mandatory_agencies: AgencyRecommendation[];
  suggested_agencies: AgencyRecommendation[];
  risk_notes: string[];
  dispatcher_approval_required: boolean;
};

export type ResourceAllocationStatus =
  | "pending_dispatcher_approval"
  | "needs_manual_review"
  | "approved"
  | "declined";

export type IncidentLifecycleStatus =
  | "pending_approval"
  | "dispatched"
  | "declined"
  | "closed";

export type DispatchDecision = {
  incident_id: string;
  decision: "approved" | "declined";
  approved_resources: string[];
  dispatcher_note?: string;
  dispatcher_id: string;
  timestamp: string;
};

export type ResponderLogCategory =
  | "hazard"
  | "medical"
  | "evacuation"
  | "security"
  | "resource_update"
  | "general";

export type ResponderIncidentLog = {
  id: string;
  incident_id: string;
  agency: string;
  author?: string;
  message: string;
  category: ResponderLogCategory;
  timestamp: string;
};

export type CanonicalResidentEvent = {
  id: string;
  source: "RESIDENT_REPORT" | "RESPONDER_REPORT" | "ADMIN_CREATED";
  sourceRecordId: string;
  retrievedAt: string;
  observedAt: string;
  hazardType: string;
  title: string;
  description?: string;
  severity: string;
  confidence: string;
  location: {
    type: "POINT" | "UNKNOWN";
    latitude?: number;
    longitude?: number;
    addressText?: string;
    geocodingConfidence?: string;
  };
  vicinityRadiusMeters: number;
  status: "NEW" | "TRIAGING" | "ACTIVE";
  recommendedActions?: string[];
  tags: string[];
};

export type StoredIncidentCluster = {
  incident_id: string;
  status: IncidentLifecycleStatus;
  created_at: string;
  updated_at: string;
  extracted_incident: ExtractedIncident;
  reports: PublicIncidentReport[];
  recommendations: ResourceAllocationRecommendations;
  resource_allocation_status: ResourceAllocationStatus;
  canonical_event: CanonicalResidentEvent;
  priority_score: number;
  priority_reason: string;
  approved_agencies: string[];
  approved_by?: string;
  approved_at?: string;
  dispatch_decision?: DispatchDecision;
  responder_logs: ResponderIncidentLog[];
};

export type IncidentClusterResponse = Omit<StoredIncidentCluster, "reports"> & {
  queue_position?: number;
  reports: Array<
    Omit<PublicIncidentReport, "reporter_location"> & {
      reporter_location?: ReporterLocation;
      precise_location_redacted?: boolean;
    }
  >;
};

export type SimilarityBreakdown = {
  incident_type: number;
  location: number;
  time: number;
  description: number;
};

export type SimilarityResult = {
  is_similar: boolean;
  matched_incident_id?: string;
  confidence: number;
  reason: string;
  score_breakdown?: SimilarityBreakdown;
};

export type IncidentReportResult =
  | {
      status: "grouped_with_existing_incident";
      incident_id: string;
      similarity: SimilarityResult;
      resource_allocation_status: ResourceAllocationStatus;
      message: string;
    }
  | {
      status: "new_incident_created";
      incident_id: string;
      extracted_incident: ExtractedIncident;
      resource_allocation_status: ResourceAllocationStatus;
      recommendations: ResourceAllocationRecommendations;
      message?: string;
    }
  | {
      status: "needs_manual_review";
      incident_id: string;
      reason: string;
      extracted_incident: Partial<ExtractedIncident>;
      resource_allocation_status: "needs_manual_review";
      recommendations: ResourceAllocationRecommendations;
      message: string;
    };
