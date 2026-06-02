import { ltaClient } from "../../services/lta.client";
import { transportRepo } from "../../repositories/transport.repo";
import type {
  LtaBusArrivalResponse,
  LtaCameraItem,
  LtaCarparkItem,
  LtaCrowdDensityItem,
  LtaFaultyTrafficLightItem,
  LtaFloodAlertItem,
  LtaRoadEventItem,
  LtaResponse,
  LtaSpeedBandItem,
  LtaTrafficIncident,
  LtaTrainServiceAlert,
  LtaTrainServiceAlertsResponse,
  LtaTravelTimeItem,
} from "./transport.types";
import type {
  BusArrivalResponse,
  BusNextArrival,
  BusServiceArrival,
  CarparkAvailability,
  CrowdDensityReading,
  FaultyTrafficLight,
  LtaFloodAlert,
  RoadOpening,
  RoadWork,
  TrafficCamera,
  TrafficIncident,
  TrafficSpeedBand,
  TrainAlert,
  TravelTimeSegment,
} from "../../../../shared/types/transport";

export async function getTrafficIncidents(): Promise<TrafficIncident[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaTrafficIncident>>("/TrafficIncidents");

  const incidents: TrafficIncident[] = data.value.map((item) => ({
    type: item.Type,
    message: item.Message,
    latitude: item.Latitude,
    longitude: item.Longitude,
  }));

  transportRepo.saveIncidents(incidents).catch(console.error);
  return incidents;
}

export async function getTrainAlerts(): Promise<TrainAlert[]> {
  const { data } = await ltaClient.get<LtaTrainServiceAlertsResponse>("/TrainServiceAlerts");

  return data.value.map((item: LtaTrainServiceAlert) => ({
    status: item.Status,
    message: item.Message,
    affectedSegments: item.AffectedSegments.map((seg) => ({
      line: seg.Line,
      direction: seg.Direction,
      stations: seg.Stations,
      freePublicBus: seg.FreePublicBus,
      freeMRTShuttle: seg.FreeMRTShuttle,
      mRTShuttleDirection: seg.MRTShuttleDirection,
    })),
  }));
}

export async function getTravelTimes(): Promise<TravelTimeSegment[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaTravelTimeItem>>("/EstTravelTimes");
  return data.value.map((item) => ({
    name: item.Name,
    startPoint: item.StartPoint,
    endPoint: item.EndPoint,
    estTime: item.EstTime,
    status: item.Status,
  }));
}

export async function getTrafficSpeedBands(): Promise<TrafficSpeedBand[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaSpeedBandItem>>("/TrafficSpeedBands");
  return data.value.map((item) => ({
    linkId: item.LinkID,
    roadName: item.RoadName,
    roadCategory: item.RoadCategory,
    speedBand: item.SpeedBand,
    minimumSpeed: item.MinimumSpeed,
    maximumSpeed: item.MaximumSpeed,
    startLat: item.StartLat,
    startLon: item.StartLon,
    endLat: item.EndLat,
    endLon: item.EndLon,
  }));
}

export async function getTrafficCameras(): Promise<TrafficCamera[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaCameraItem>>("/Traffic-Imagesv2");
  return data.value.map((item) => ({
    cameraId: item.CameraID,
    latitude: item.Latitude,
    longitude: item.Longitude,
    imageUrl: item.ImageLink,
  }));
}

export async function getFaultyTrafficLights(): Promise<FaultyTrafficLight[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaFaultyTrafficLightItem>>("/FaultyTrafficLights");
  return data.value.map((item) => ({
    alarmId: item.AlarmID,
    nodeId: item.NodeID,
    type: item.Type,
    startDate: item.StartDate,
    endDate: item.EndDate,
    message: item.Message,
    latitude: item.Latitude,
    longitude: item.Longitude,
  }));
}

export async function getCrowdDensityRealtime(): Promise<CrowdDensityReading[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaCrowdDensityItem>>("/PCDRealTime");
  return data.value.map((item) => ({
    station: item.Station,
    startTime: item.StartTime,
    endTime: item.EndTime,
    crowdLevel: item.CrowdLevel,
  }));
}

export async function getCrowdDensityForecast(): Promise<CrowdDensityReading[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaCrowdDensityItem>>("/PCDForecast");
  return data.value.map((item) => ({
    station: item.Station,
    startTime: item.StartTime,
    endTime: item.EndTime,
    crowdLevel: item.CrowdLevel,
  }));
}

function mapBusNextArrival(raw: LtaBusArrivalResponse["Services"][number]["NextBus"]): BusNextArrival | null {
  if (!raw?.EstimatedArrival) return null;
  return {
    originCode: raw.OriginCode,
    destinationCode: raw.DestinationCode,
    estimatedArrival: raw.EstimatedArrival,
    latitude: raw.Latitude,
    longitude: raw.Longitude,
    visitNumber: raw.VisitNumber,
    load: raw.Load,
    feature: raw.Feature,
    type: raw.Type,
  };
}

export async function getBusArrivals(busStopCode: string): Promise<BusArrivalResponse> {
  const { data } = await ltaClient.get<LtaBusArrivalResponse>("/BusArrivalv2", {
    params: { BusStopCode: busStopCode },
  });

  const services: BusServiceArrival[] = (data.Services ?? []).map((svc) => ({
    serviceNo: svc.ServiceNo,
    operator: svc.Operator,
    nextBus: mapBusNextArrival(svc.NextBus),
    nextBus2: mapBusNextArrival(svc.NextBus2),
    nextBus3: mapBusNextArrival(svc.NextBus3),
  }));

  return { busStopCode: data.BusStopCode, services };
}

export async function getRoadWorks(): Promise<RoadWork[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaRoadEventItem>>("/RoadWorks");
  return data.value.map((item) => ({
    eventId: item.EventID,
    startDate: item.StartDate,
    endDate: item.EndDate,
    serviceDescription: item.SvcDescription,
    otherInfo: item.OtherInfo,
    latitude: item.lat,
    longitude: item.lon,
  }));
}

export async function getRoadOpenings(): Promise<RoadOpening[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaRoadEventItem>>("/RoadOpenings");
  return data.value.map((item) => ({
    eventId: item.EventID,
    startDate: item.StartDate,
    endDate: item.EndDate,
    serviceDescription: item.SvcDescription,
    otherInfo: item.OtherInfo,
    latitude: item.lat,
    longitude: item.lon,
  }));
}

function parseCarparkLocation(location: string): { latitude: number; longitude: number } {
  const parts = location.trim().split(/\s+/);
  return {
    latitude: parseFloat(parts[0] ?? "0") || 0,
    longitude: parseFloat(parts[1] ?? "0") || 0,
  };
}

export async function getCarparkAvailability(): Promise<CarparkAvailability[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaCarparkItem>>("/CarParkAvailabilityv2");
  return data.value.map((item) => {
    const { latitude, longitude } = parseCarparkLocation(item.Location);
    return {
      carparkId: item.CarParkID,
      area: item.Area,
      development: item.Development,
      latitude,
      longitude,
      availableLots: item.AvailableLots,
      lotType: item.LotType,
      agency: item.Agency,
    };
  });
}

export async function getLtaFloodAlerts(): Promise<LtaFloodAlert[]> {
  const { data } = await ltaClient.get<LtaResponse<LtaFloodAlertItem>>("/Flood-Alerts");
  return data.value.map((item) => ({
    nodeId: item.NodeID,
    linkId: item.LinkID,
    latitude: item.Latitude,
    longitude: item.Longitude,
    alertMessage: item.AlertMessage,
    alertLevel: item.AlertLevel,
    previousAlertLevel: item.PreviousAlertLevel,
  }));
}
