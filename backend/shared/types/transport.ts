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

export interface TravelTimeSegment {
  name: string;
  startPoint: string;
  endPoint: string;
  estTime: number;
  /** 1 = normal, 2 = heavy */
  status: number;
}

export interface TrafficSpeedBand {
  linkId: string;
  roadName: string;
  roadCategory: string;
  /** 1 (slowest) – 8 (fastest) */
  speedBand: number;
  minimumSpeed: string;
  maximumSpeed: string;
  startLat: number;
  startLon: number;
  endLat: number;
  endLon: number;
}

export interface TrafficCamera {
  cameraId: string;
  latitude: number;
  longitude: number;
  /** Direct URL to the latest camera snapshot */
  imageUrl: string;
}

export interface FaultyTrafficLight {
  alarmId: string;
  nodeId: string;
  /** 4 = faulty, 13 = blackout, 14 = flashing yellow */
  type: number;
  startDate: string;
  endDate: string;
  message: string;
  latitude: number;
  longitude: number;
}

export interface CrowdDensityReading {
  station: string;
  startTime: string;
  endTime: string;
  /** "l" = low, "m" = medium, "h" = high */
  crowdLevel: string;
}

export interface BusNextArrival {
  originCode: string;
  destinationCode: string;
  estimatedArrival: string;
  latitude: string;
  longitude: string;
  visitNumber: string;
  /** "SEA" = seats available, "SDA" = standing available, "LSD" = limited standing */
  load: string;
  /** "WAB" = wheelchair accessible */
  feature: string;
  /** "SD" = single deck, "DD" = double deck, "BD" = bendy */
  type: string;
}

export interface BusServiceArrival {
  serviceNo: string;
  operator: string;
  nextBus: BusNextArrival | null;
  nextBus2: BusNextArrival | null;
  nextBus3: BusNextArrival | null;
}

export interface BusArrivalResponse {
  busStopCode: string;
  services: BusServiceArrival[];
}

export interface RoadWork {
  eventId: string;
  startDate: string;
  endDate: string;
  serviceDescription: string;
  otherInfo: string;
  latitude: number;
  longitude: number;
}

export interface RoadOpening {
  eventId: string;
  startDate: string;
  endDate: string;
  serviceDescription: string;
  otherInfo: string;
  latitude: number;
  longitude: number;
}

export interface CarparkAvailability {
  carparkId: string;
  area: string;
  development: string;
  latitude: number;
  longitude: number;
  availableLots: number;
  /** "C" = car, "H" = heavy vehicle, "Y" = motorcycle */
  lotType: string;
  agency: string;
}

export interface LtaFloodAlert {
  nodeId: string;
  linkId: string;
  latitude: number;
  longitude: number;
  alertMessage: string;
  alertLevel: string;
  previousAlertLevel: string;
}
