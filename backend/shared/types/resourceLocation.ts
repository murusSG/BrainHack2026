export type ScdfResourceType = "FIRE_STATION" | "SHELTER" | "AED";

export interface ResourceLocation {
  id: string;
  source: "SCDF";
  resource_type: ScdfResourceType;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  operating_hours?: string;
  capacity?: number;
  contact?: string;
  raw_source_id?: string;
  updated_at?: string;
}

export interface NearestResourceLocation extends ResourceLocation {
  distance_meters: number;
}
