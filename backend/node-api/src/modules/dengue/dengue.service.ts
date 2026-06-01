import { downloadDatasetJson } from "../../services/dataGovSg.client";
import { dengueRepo } from "../../repositories/dengue.repo";
import type { DengueFeatureCollection } from "./dengue.types";
import type { DengueCluster } from "../../../../shared/types/dengue";

const DENGUE_CLUSTERS_DATASET_ID = "d_dbfabf16158d1b0e1c420627c0819168";

export async function getDengueClusters(): Promise<DengueCluster[]> {
  const fc = await downloadDatasetJson<DengueFeatureCollection>(DENGUE_CLUSTERS_DATASET_ID);

  const clusters: DengueCluster[] = (fc.features ?? []).map((feature) => ({
    locality: feature.properties.LOCALITY ?? "Unknown",
    caseSize: Number(feature.properties.CASE_SIZE ?? 0),
    geometry: feature.geometry,
  }));

  dengueRepo.saveClusters(clusters).catch(console.error);
  return clusters;
}
