import { supabase } from "../config/supabase";
import type { FloodAlert } from "../../../shared/types/flood";

export const floodRepo = {
  async saveAlerts(alerts: FloodAlert[]) {
    if (!supabase) return;
    const rows = alerts.map((a) => ({
      fetched_at: new Date().toISOString(),
      location: a.location,
      severity: a.severity,
      source: a.source,
      raw_data: a.raw,
    }));
    const { error } = await supabase.from("flood_alerts").insert(rows);
    if (error) console.warn("[floodRepo.saveAlerts]", error.message);
  },
};
