import { supabase } from "../config/supabase";
import type { TrafficIncident } from "../../../shared/types/transport";

export const transportRepo = {
  async saveIncidents(incidents: TrafficIncident[]) {
    const rows = incidents.map((i) => ({
      fetched_at: new Date().toISOString(),
      type: i.type,
      message: i.message,
      lat: i.latitude,
      lng: i.longitude,
      raw_data: i,
    }));
    const { error } = await supabase.from("transport_incidents").insert(rows);
    if (error) console.error("[transportRepo.saveIncidents]", error.message);
  },
};
