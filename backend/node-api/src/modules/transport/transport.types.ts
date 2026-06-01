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
