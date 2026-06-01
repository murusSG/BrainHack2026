/**
 * Raw shape returned by NEA /psi and /pm25 endpoints.
 * `readings` is an object keyed by metric (e.g. "psi_twenty_four_hourly"),
 * and each metric maps regions ("north"/"east"/...) to numeric values.
 */
export interface NeaReadingsResponse {
  items: Array<{
    timestamp: string;
    update_timestamp: string;
    readings: Record<string, Record<string, number>>;
  }>;
  api_info: { status: string };
}

/** Raw shape returned by NEA /rainfall and station-based endpoints */
export interface NeaStationReading {
  station_id: string;
  value: number;
}

export interface NeaStation {
  id: string;
  name: string;
  location: { latitude: number; longitude: number };
}

export interface NeaStationsResponse {
  items: Array<{
    timestamp: string;
    readings: NeaStationReading[];
  }>;
  metadata: { stations: NeaStation[] };
}

/** Raw shape returned by NEA /2-hour-weather-forecast */
export interface NeaWeatherForecastResponse {
  items: Array<{
    update_timestamp: string;
    timestamp: string;
    valid_period: { start: string; end: string };
    forecasts: Array<{
      area: string;
      forecast: string;
    }>;
  }>;
  area_metadata: Array<{
    name: string;
    label_location: { latitude: number; longitude: number };
  }>;
}
