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

/** Raw shape returned by NEA /uv-index */
export interface NeaUvIndexResponse {
  items: Array<{
    timestamp: string;
    index: Array<{ value: number; timestamp: string }>;
  }>;
  api_info: { status: string };
}

/** Raw shape returned by NEA /24-hour-weather-forecast */
export interface NeaWeatherForecast24hResponse {
  items: Array<{
    update_timestamp: string;
    timestamp: string;
    valid_period: { start: string; end: string };
    general: {
      forecast: string;
      relative_humidity: { low: number; high: number };
      temperature: { low: number; high: number };
      wind: { speed: { low: number; high: number }; direction: string };
    };
    periods: Array<{
      time: { start: string; end: string };
      regions: Record<string, string>;
    }>;
  }>;
  api_info: { status: string };
}

/** Raw shape returned by NEA /4-day-weather-forecast */
export interface NeaWeatherForecast4DayResponse {
  items: Array<{
    update_timestamp: string;
    timestamp: string;
    forecasts: Array<{
      timestamp: string;
      date: string;
      forecast: string;
      relative_humidity: { low: number; high: number };
      temperature: { low: number; high: number };
      wind: { speed: { low: number; high: number }; direction: string };
    }>;
  }>;
  api_info: { status: string };
}
