import { dataGovSgClient } from "../../services/dataGovSg.client";
import { environmentalRepo } from "../../repositories/environmental.repo";
import type {
  NeaReadingsResponse,
  NeaStation,
  NeaStationReading,
  NeaStationsResponse,
  NeaUvIndexResponse,
  NeaWeatherForecast24hResponse,
  NeaWeatherForecast4DayResponse,
  NeaWeatherForecastResponse,
} from "./environmental.types";
import type {
  AirTemperatureStationReading,
  HumidityStationReading,
  Pm25RegionReading,
  PsiRegionReading,
  RainfallStationReading,
  UvIndexReading,
  WeatherForecast,
  WeatherForecast24h,
  WeatherForecast4Day,
  WindDirectionStationReading,
  WindSpeedStationReading,
} from "../../../../shared/types/environmental";

export async function getPsi(): Promise<PsiRegionReading[]> {
  const { data } = await dataGovSgClient.get<NeaReadingsResponse>("/environment/psi");
  const item = data.items[0];
  if (!item) return [];

  const psiByRegion = item.readings["psi_twenty_four_hourly"] ?? {};
  const readings: PsiRegionReading[] = Object.entries(psiByRegion).map(([region, psi]) => ({
    region: region as PsiRegionReading["region"],
    psi,
    timestamp: item.timestamp,
  }));

  environmentalRepo.savePsi(readings).catch(console.error);
  return readings;
}

export async function getPm25(): Promise<Pm25RegionReading[]> {
  const { data } = await dataGovSgClient.get<NeaReadingsResponse>("/environment/pm25");
  const item = data.items[0];
  if (!item) return [];

  const pm25ByRegion = item.readings["pm25_one_hourly"] ?? {};
  const readings: Pm25RegionReading[] = Object.entries(pm25ByRegion).map(([region, pm25]) => ({
    region: region as Pm25RegionReading["region"],
    pm25,
    timestamp: item.timestamp,
  }));

  environmentalRepo.savePm25(readings).catch(console.error);
  return readings;
}

export async function getRainfall(): Promise<RainfallStationReading[]> {
  const { data } = await dataGovSgClient.get<NeaStationsResponse>("/environment/rainfall");
  const item = data.items[0];
  if (!item) return [];

  const stationMap = new Map(data.metadata.stations.map((s) => [s.id, s]));

  const readings: RainfallStationReading[] = item.readings.map((r) => {
    const station = stationMap.get(r.station_id);
    return {
      stationId: r.station_id,
      stationName: station?.name ?? r.station_id,
      latitude: station?.location.latitude ?? 0,
      longitude: station?.location.longitude ?? 0,
      value: r.value,
      timestamp: item.timestamp,
    };
  });

  return readings;
}

export async function getWeatherForecast(): Promise<WeatherForecast | null> {
  const { data } = await dataGovSgClient.get<NeaWeatherForecastResponse>(
    "/environment/2-hour-weather-forecast"
  );
  const item = data.items[0];
  if (!item) return null;

  const locationMap = new Map(
    data.area_metadata.map((m) => [m.name, m.label_location])
  );

  return {
    validPeriod: item.valid_period,
    forecasts: item.forecasts.map((f) => ({
      area: f.area,
      forecast: f.forecast,
      latitude: locationMap.get(f.area)?.latitude ?? 0,
      longitude: locationMap.get(f.area)?.longitude ?? 0,
    })),
  };
}

function mapStationReadings(
  readings: NeaStationReading[],
  stationMap: Map<string, NeaStation>,
  timestamp: string
) {
  return readings.map((r) => {
    const station = stationMap.get(r.station_id);
    return {
      stationId: r.station_id,
      stationName: station?.name ?? r.station_id,
      latitude: station?.location.latitude ?? 0,
      longitude: station?.location.longitude ?? 0,
      value: r.value,
      timestamp,
    };
  });
}

export async function getAirTemperature(): Promise<AirTemperatureStationReading[]> {
  const { data } = await dataGovSgClient.get<NeaStationsResponse>("/environment/air-temperature");
  const item = data.items[0];
  if (!item) return [];
  const stationMap = new Map(data.metadata.stations.map((s) => [s.id, s]));
  return mapStationReadings(item.readings, stationMap, item.timestamp);
}

export async function getHumidity(): Promise<HumidityStationReading[]> {
  const { data } = await dataGovSgClient.get<NeaStationsResponse>("/environment/relative-humidity");
  const item = data.items[0];
  if (!item) return [];
  const stationMap = new Map(data.metadata.stations.map((s) => [s.id, s]));
  return mapStationReadings(item.readings, stationMap, item.timestamp);
}

export async function getWindDirection(): Promise<WindDirectionStationReading[]> {
  const { data } = await dataGovSgClient.get<NeaStationsResponse>("/environment/wind-direction");
  const item = data.items[0];
  if (!item) return [];
  const stationMap = new Map(data.metadata.stations.map((s) => [s.id, s]));
  return mapStationReadings(item.readings, stationMap, item.timestamp);
}

export async function getWindSpeed(): Promise<WindSpeedStationReading[]> {
  const { data } = await dataGovSgClient.get<NeaStationsResponse>("/environment/wind-speed");
  const item = data.items[0];
  if (!item) return [];
  const stationMap = new Map(data.metadata.stations.map((s) => [s.id, s]));
  return mapStationReadings(item.readings, stationMap, item.timestamp);
}

export async function getUvIndex(): Promise<UvIndexReading | null> {
  const { data } = await dataGovSgClient.get<NeaUvIndexResponse>("/environment/uv-index");
  const item = data.items[0];
  if (!item) return null;
  const latest = item.index[item.index.length - 1];
  if (!latest) return null;
  return { value: latest.value, timestamp: latest.timestamp };
}

export async function getWeatherForecast24h(): Promise<WeatherForecast24h | null> {
  const { data } = await dataGovSgClient.get<NeaWeatherForecast24hResponse>(
    "/environment/24-hour-weather-forecast"
  );
  const item = data.items[0];
  if (!item) return null;

  return {
    timestamp: item.timestamp,
    validPeriod: item.valid_period,
    general: {
      forecast: item.general.forecast,
      relativeHumidity: item.general.relative_humidity,
      temperature: item.general.temperature,
      wind: item.general.wind,
    },
    periods: item.periods,
  };
}

export async function getWeatherForecast4Day(): Promise<WeatherForecast4Day | null> {
  const { data } = await dataGovSgClient.get<NeaWeatherForecast4DayResponse>(
    "/environment/4-day-weather-forecast"
  );
  const item = data.items[0];
  if (!item) return null;

  return {
    updatedTimestamp: item.update_timestamp,
    forecasts: item.forecasts.map((f) => ({
      date: f.date,
      timestamp: f.timestamp,
      forecast: f.forecast,
      relativeHumidity: f.relative_humidity,
      temperature: f.temperature,
      wind: f.wind,
    })),
  };
}
