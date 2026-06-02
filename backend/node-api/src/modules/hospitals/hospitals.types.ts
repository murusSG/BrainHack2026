export type HospitalResponseStatus = "success" | "partial" | "unavailable" | "error";

export interface HospitalMetric {
  metric_name: string;
  facility_name?: string;
  value?: string;
  unit?: string;
  source_name: string;
  source_url: string;
  dataset_id?: string;
  last_updated?: string;
  notes?: string;
}

export interface HospitalSourceMetadata {
  source_name: string;
  source_url: string;
  dataset_id?: string;
  fetch_mode?: "datastore" | "download" | "web-page-download";
  last_checked?: string;
  notes?: string;
}

export interface HospitalSourceError {
  source_name: string;
  code: string;
  message: string;
  dataset_id?: string;
}

export interface HospitalApiResponse {
  status: HospitalResponseStatus;
  data: HospitalMetric[];
  sources: HospitalSourceMetadata[];
  errors: HospitalSourceError[];
}

