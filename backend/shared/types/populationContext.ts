export interface PopulationContext {
  id: string;
  source: "HDB" | "DOS" | "DATA_GOV_SG";
  area_name: string;
  subzone?: string;
  dwelling_type?: string;
  population?: number;
  household_count?: number;
  block?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  updated_at?: string;
}

export interface NearbyPopulationContext extends PopulationContext {
  distance_meters?: number;
}
