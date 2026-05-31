export interface DengueClusterGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface DengueCluster {
  locality: string;
  caseSize: number;
  geometry: DengueClusterGeometry;
}
