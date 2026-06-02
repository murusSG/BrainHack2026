export type HealthSignalType = "INFECTIOUS_DISEASE" | "COVID" | "HEALTH_CAPACITY";
export type TrendDirection = "UP" | "DOWN" | "STABLE" | "UNKNOWN";
export type SignalSeverity = "INFO" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface HealthSignal {
  id: string;
  source: "MOH" | "CDA";
  health_signal_type: HealthSignalType;
  disease?: string;
  epi_week?: string;
  year?: number;
  value: number;
  unit: string;
  trend_direction?: TrendDirection;
  severity?: SignalSeverity;
  updated_at?: string;
}
