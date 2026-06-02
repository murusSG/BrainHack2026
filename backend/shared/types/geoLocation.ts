export interface OneMapLocation {
  query?: string;
  address: string;
  postal_code?: string;
  building?: string;
  road_name?: string;
  latitude: number;
  longitude: number;
  source: "ONEMAP";
}

export interface OneMapRoute {
  source: "ONEMAP";
  mode: "drive" | "walk" | "cycle" | "pt";
  distance_meters?: number;
  duration_seconds?: number;
  geometry?: string;
}
