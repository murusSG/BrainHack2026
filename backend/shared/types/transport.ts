export interface TrafficIncident {
  type: string;
  message: string;
  latitude: number;
  longitude: number;
}

export interface TrainAlert {
  status: number;
  affectedSegments: TrainAlertSegment[];
  message: string;
}

export interface TrainAlertSegment {
  line: string;
  direction: string;
  stations: string;
  freePublicBus: string;
  freeMRTShuttle: string;
  mRTShuttleDirection: string;
}
