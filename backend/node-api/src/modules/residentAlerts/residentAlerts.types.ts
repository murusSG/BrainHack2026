import type { Severity } from "../../../../shared/types/crisisEvent";

export type ResidentAlertSourceType = "incident_activated" | "command_broadcast";
export type ResidentAlertStatus = "active" | "updated" | "resolved" | "expired";

export interface ResidentAlertAudience {
  type: "nearby" | "all";
  radiusMeters?: number;
}

export interface ResidentAlert {
  id: string;
  sourceType: ResidentAlertSourceType;
  title: string;
  body: string;
  publicAction: string;
  severity: Severity;
  locationLabel: string;
  lat: number | null;
  lng: number | null;
  radiusMeters: number;
  relatedEventId?: string;
  issuedAt: string;
  expiresAt?: string;
  status: ResidentAlertStatus;
  channels: Array<"in_app" | "sms" | "web" | "whatsapp" | "telegram">;
  audience: ResidentAlertAudience;
}

export interface ResidentAlertFilter {
  lat?: number;
  lng?: number;
  radiusMeters?: number;
}

export interface CreateResidentAlertInput {
  title?: string;
  body?: string;
  publicAction?: string;
  severity?: Severity;
  locationLabel?: string;
  lat?: number;
  lng?: number;
  radiusMeters?: number;
  relatedEventId?: string;
  expiresInMinutes?: number;
  smsEnabled?: boolean;
  whatsappEnabled?: boolean;
  telegramEnabled?: boolean;
}

export interface UpdateResidentAlertInput {
  title?: string;
  body?: string;
  publicAction?: string;
  severity?: Severity;
  status?: ResidentAlertStatus;
  expiresInMinutes?: number;
}
