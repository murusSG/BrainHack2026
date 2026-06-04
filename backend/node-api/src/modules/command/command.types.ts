export type AllocationAgencyStatus = "pending_approval" | "approved" | "contacted" | "rejected";

export type AllocationSeverity = "critical" | "high" | "medium" | "low";

export interface CommandAllocationAgency {
  id: string;
  agency: string;
  channel: string;
  confidence: number;
  reason: string;
  suggestedAction: string;
  status: AllocationAgencyStatus;
}

export interface CommandAllocationRecommendation {
  id: string;
  incidentId: string;
  incidentTitle: string;
  severity: AllocationSeverity;
  confidence: number;
  generatedAt: string;
  generatedFrom?: string;
  linkedPrediction?: string;
  modelVersion: string;
  triggerSignals: string[];
  draftMessage: string;
  agencies: CommandAllocationAgency[];
  createdAt: string;
  updatedAt: string;
}

export interface CommandTimelineEntry {
  id: string;
  time: string;
  title: string;
  detail: string;
  location: string;
  severity: "critical" | "warning" | "normal";
  source: "command";
  recommendationId?: string;
  createdAt: string;
}

export type CreateCommandAllocationInput = Partial<
  Omit<CommandAllocationRecommendation, "agencies" | "createdAt" | "updatedAt">
> & {
  agencies?: Partial<CommandAllocationAgency>[];
};

export interface UpdateAgencyStatusInput {
  agencyIds?: string[];
  status?: string;
  note?: string;
}
