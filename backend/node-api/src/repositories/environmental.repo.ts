import { supabase } from "../config/supabase";
import type { PsiRegionReading, Pm25RegionReading } from "../../../shared/types/environmental";

export const environmentalRepo = {
  async savePsi(readings: PsiRegionReading[]) {
    if (!supabase) return;
    const rows = readings.map((r) => ({
      fetched_at: r.timestamp,
      region: r.region,
      psi: r.psi,
      raw_data: r,
    }));
    const { error } = await supabase.from("environmental_readings").insert(rows);
    if (error) console.error("[environmentalRepo.savePsi]", error.message);
  },

  async savePm25(readings: Pm25RegionReading[]) {
    if (!supabase) return;
    const rows = readings.map((r) => ({
      fetched_at: r.timestamp,
      region: r.region,
      pm25: r.pm25,
      raw_data: r,
    }));
    const { error } = await supabase.from("environmental_readings").insert(rows);
    if (error) console.error("[environmentalRepo.savePm25]", error.message);
  },
};
