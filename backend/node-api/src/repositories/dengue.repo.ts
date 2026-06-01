import { supabase } from "../config/supabase";
import type { DengueCluster } from "../../../shared/types/dengue";

export const dengueRepo = {
  async saveClusters(clusters: DengueCluster[]) {
    const rows = clusters.map((c) => ({
      fetched_at: new Date().toISOString(),
      locality: c.locality,
      case_size: c.caseSize,
      geometry: c.geometry,
      raw_data: c,
    }));
    const { error } = await supabase.from("dengue_clusters").insert(rows);
    if (error) console.error("[dengueRepo.saveClusters]", error.message);
  },
};
