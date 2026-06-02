/** Raw shape from LTA /TrafficIncidents */
export interface LtaTrafficIncident {
  Type: string;
  Latitude: number;
  Longitude: number;
  Message: string;
}

export interface LtaResponse<T> {
  value: T[];
}

/** Raw shape from LTA /TrainServiceAlerts */
export interface LtaTrainAlertSegment {
  Line: string;
  Direction: string;
  Stations: string;
  FreePublicBus: string;
  FreeMRTShuttle: string;
  MRTShuttleDirection: string;
}

export interface LtaTrainServiceAlert {
  Status: number;
  AffectedSegments: LtaTrainAlertSegment[];
  Message: string;
}

export interface LtaTrainServiceAlertsResponse {
  value: LtaTrainServiceAlert[];
}

/** Raw shape from LTA /EstTravelTimes */
export interface LtaTravelTimeItem {
  Name: string;
  Status: number;
  Direction: number;
  FarEndPoint: string;
  StartPoint: string;
  EndPoint: string;
  EstTime: number;
}

/** Raw shape from LTA /TrafficSpeedBands */
export interface LtaSpeedBandItem {
  LinkID: string;
  RoadName: string;
  RoadCategory: string;
  SpeedBand: number;
  MinimumSpeed: string;
  MaximumSpeed: string;
  Location: string;
  StartLon: number;
  StartLat: number;
  EndLon: number;
  EndLat: number;
}

/** Raw shape from LTA /Traffic-Imagesv2 */
export interface LtaCameraItem {
  CameraID: string;
  Latitude: number;
  Longitude: number;
  ImageLink: string;
  VideoLink: string;
}

/** Raw shape from LTA /FaultyTrafficLights */
export interface LtaFaultyTrafficLightItem {
  AlarmID: string;
  NodeID: string;
  Type: number;
  StartDate: string;
  EndDate: string;
  Message: string;
  Latitude: number;
  Longitude: number;
}

/** Raw shape from LTA /PCDRealTime and /PCDForecast */
export interface LtaCrowdDensityItem {
  Station: string;
  StartTime: string;
  EndTime: string;
  CrowdLevel: string;
}

/** Raw shape from LTA /BusArrivalv2 */
export interface LtaBusNextArrival {
  OriginCode: string;
  DestinationCode: string;
  EstimatedArrival: string;
  Latitude: string;
  Longitude: string;
  VisitNumber: string;
  Load: string;
  Feature: string;
  Type: string;
}

export interface LtaBusService {
  ServiceNo: string;
  Operator: string;
  NextBus: LtaBusNextArrival;
  NextBus2: LtaBusNextArrival;
  NextBus3: LtaBusNextArrival;
}

export interface LtaBusArrivalResponse {
  BusStopCode: string;
  Services: LtaBusService[];
}

/** Raw shape from LTA /RoadWorks and /RoadOpenings */
export interface LtaRoadEventItem {
  EventID: string;
  StartDate: string;
  EndDate: string;
  SvcDescription: string;
  OtherInfo: string;
  svcdesc_url: string;
  lat: number;
  lon: number;
}

/** Raw shape from LTA /CarParkAvailabilityv2 */
export interface LtaCarparkItem {
  CarParkID: string;
  Area: string;
  Development: string;
  Location: string;
  AvailableLots: number;
  LotType: string;
  Agency: string;
}

/** Raw shape from LTA /Flood-Alerts */
export interface LtaFloodAlertItem {
  NodeID: string;
  LinkID: string;
  Latitude: number;
  Longitude: number;
  AlertMessage: string;
  AlertLevel: string;
  PreviousAlertLevel: string;
}
