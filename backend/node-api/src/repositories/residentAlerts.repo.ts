import { supabase } from "../config/supabase";
import type { ResidentAlertSmsDelivery } from "../modules/residentAlerts/residentAlertSms.service";
import type { ResidentAlert } from "../modules/residentAlerts/residentAlerts.types";

type ResidentAlertRow = {
  id: string;
  source_type: ResidentAlert["sourceType"];
  title: string;
  body: string;
  public_action: string;
  severity: ResidentAlert["severity"];
  location_label: string;
  lat: number | null;
  lng: number | null;
  radius_meters: number;
  related_event_id: string | null;
  issued_at: string;
  expires_at: string | null;
  status: ResidentAlert["status"];
  channels: unknown;
  audience: unknown;
  created_at: string;
  updated_at: string;
};

export const residentAlertsRepo = {
  async listBroadcasts(limit = 50): Promise<ResidentAlert[] | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("resident_alerts")
      .select("*")
      .in("status", ["active", "updated", "resolved"])
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("issued_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[residentAlertsRepo.listBroadcasts]", error.message);
      return null;
    }

    return ((data ?? []) as ResidentAlertRow[]).map(mapResidentAlert);
  },

  async saveBroadcast(alert: ResidentAlert): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase.from("resident_alerts").upsert({
      id: alert.id,
      source_type: alert.sourceType,
      title: alert.title,
      body: alert.body,
      public_action: alert.publicAction,
      severity: alert.severity,
      location_label: alert.locationLabel,
      lat: alert.lat,
      lng: alert.lng,
      radius_meters: alert.radiusMeters,
      related_event_id: alert.relatedEventId ?? null,
      issued_at: alert.issuedAt,
      expires_at: alert.expiresAt ?? null,
      status: alert.status,
      channels: alert.channels,
      audience: alert.audience,
      created_at: alert.issuedAt,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[residentAlertsRepo.saveBroadcast]", error.message);
      return false;
    }

    return true;
  },

  async updateBroadcast(alert: ResidentAlert): Promise<boolean> {
    if (!supabase) return false;

    const { error } = await supabase
      .from("resident_alerts")
      .update({
        title: alert.title,
        body: alert.body,
        public_action: alert.publicAction,
        severity: alert.severity,
        expires_at: alert.expiresAt ?? null,
        status: alert.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", alert.id);

    if (error) {
      console.error("[residentAlertsRepo.updateBroadcast]", error.message);
      return false;
    }

    return true;
  },

  async saveSmsDeliveries(deliveries: ResidentAlertSmsDelivery[]): Promise<boolean> {
    if (!supabase || deliveries.length === 0) return false;

    const { error } = await supabase.from("resident_alert_deliveries").insert(
      deliveries.map((delivery) => ({
        alert_id: delivery.alertId,
        channel: delivery.channel,
        recipient: delivery.recipient,
        status: delivery.status,
        provider: delivery.provider,
        provider_message_id: delivery.providerMessageId ?? null,
        error_message: delivery.errorMessage ?? null,
      }))
    );

    if (error) {
      console.error("[residentAlertsRepo.saveSmsDeliveries]", error.message);
      return false;
    }

    return true;
  },
};

function mapResidentAlert(row: ResidentAlertRow): ResidentAlert {
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    body: row.body,
    publicAction: row.public_action,
    severity: row.severity,
    locationLabel: row.location_label,
    lat: row.lat,
    lng: row.lng,
    radiusMeters: row.radius_meters,
    relatedEventId: row.related_event_id ?? undefined,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at ?? undefined,
    status: row.status,
    channels: normaliseChannels(row.channels),
    audience: normaliseAudience(row.audience, row.radius_meters),
  };
}

function normaliseChannels(value: unknown): ResidentAlert["channels"] {
  if (!Array.isArray(value)) return ["in_app", "web"];
  return value.filter((channel): channel is ResidentAlert["channels"][number] =>
    ["in_app", "sms", "web", "whatsapp", "telegram"].includes(String(channel))
  );
}

function normaliseAudience(value: unknown, radiusMeters: number): ResidentAlert["audience"] {
  if (value && typeof value === "object" && "type" in value) {
    const type = String((value as { type?: unknown }).type);
    if (type === "all") return { type: "all" };
  }
  return { type: "nearby", radiusMeters };
}
