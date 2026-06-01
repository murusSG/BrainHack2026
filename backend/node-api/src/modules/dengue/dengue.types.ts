import type { DengueClusterGeometry } from "../../../../shared/types/dengue";

/** A single GeoJSON feature from the NEA dengue clusters dataset. */
export interface DengueFeature {
  type: "Feature";
  properties: {
    LOCALITY?: string;
    CASE_SIZE?: number;
    [key: string]: unknown;
  };
  geometry: DengueClusterGeometry;
}

export interface DengueFeatureCollection {
  type: "FeatureCollection";
  features: DengueFeature[];
}
