import { datastoreSearch } from "../../services/dataGovSg.client";
import { dengueRepo } from "../../repositories/dengue.repo";
import type { DatastoreResponse, RawDengueRecord } from "./dengue.types";
import type { DengueCluster } from "../../../../shared/types/dengue";

const DENGUE_CLUSTERS_RESOURCE_ID = "d_dbfabf16158d1b0e1c420627c0819168";

export async function getDengueClusters(): Promise<DengueCluster[]> {
  const raw = (await datastoreSearch(DENGUE_CLUSTERS_RESOURCE_ID, { limit: 200 })) as DatastoreResponse;

  const clusters: DengueCluster[] = raw.result.records.map((record: RawDengueRecord) => {
    const geometry =
      typeof record.geometry === "string"
        ? (JSON.parse(record.geometry) as DengueCluster["geometry"])
        : (record.geometry as DengueCluster["geometry"]);

    return {
      locality: record.LOCALITY,
      caseSize: parseInt(record.CASE_SIZE, 10) || 0,
      geometry,
    };
  });

  dengueRepo.saveClusters(clusters).catch(console.error);
  return clusters;
}
