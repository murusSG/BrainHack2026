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

export interface AirTemperatureStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  /** Temperature in °C */
  value: number;
  timestamp: string;
}

export interface HumidityStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  /** Relative humidity in % */
  value: number;
  timestamp: string;
}

export interface WindDirectionStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  /** Wind direction in degrees (0–360) */
  value: number;
  timestamp: string;
}

export interface WindSpeedStationReading {
  stationId: string;
  stationName: string;
  latitude: number;
  longitude: number;
  /** Wind speed in knots */
  value: number;
  timestamp: string;
}

export interface UvIndexReading {
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

export interface WeatherForecast24h {
  timestamp: string;
  validPeriod: { start: string; end: string };
  general: {
    forecast: string;
    relativeHumidity: { low: number; high: number };
    temperature: { low: number; high: number };
    wind: { speed: { low: number; high: number }; direction: string };
  };
  periods: Array<{
    time: { start: string; end: string };
    regions: Record<string, string>;
  }>;
}

export interface WeatherForecast4DayEntry {
  date: string;
  timestamp: string;
  forecast: string;
  relativeHumidity: { low: number; high: number };
  temperature: { low: number; high: number };
  wind: { speed: { low: number; high: number }; direction: string };
}

export interface WeatherForecast4Day {
  updatedTimestamp: string;
  forecasts: WeatherForecast4DayEntry[];
}
