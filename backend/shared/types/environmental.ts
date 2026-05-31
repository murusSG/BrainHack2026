export interface PsiRegionReading {
  region: "national" | "north" | "south" | "east" | "west" | "central";
  psi: number;
  /** ISO 8601 timestamp of the reading */
  timestamp: string;
}

export interface Pm25RegionReading {
  region: "north" | "south" | "east" | "west" | "central";
  pm25: number;
  timestamp: string;
}

export interface RainfallStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  /** mm of rainfall in last 5 minutes */
  value: number;
  timestamp: string;
}

export interface WeatherAreaForecast {
  area: string;
  forecast: string;
  latitude: number;
  longitude: number;
}

export interface WeatherForecast {
  validPeriod: { start: string; end: string };
  forecasts: WeatherAreaForecast[];
}
