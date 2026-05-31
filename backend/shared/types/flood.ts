export interface FloodAlert {
  id: string;
  location: string;
  severity: string;
  source: string;
  timestamp: string;
  /** Raw fields from the API response */
  raw: Record<string, unknown>;
}

export interface WaterSensorLocation {
  sensorId: string;
  name: string;
  latitude: number;
  longitude: number;
}
