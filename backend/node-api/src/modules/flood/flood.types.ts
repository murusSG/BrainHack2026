/** A single flood reading inside a record (shape is sparse; kept open). */
export interface FloodAlertReading {
  [key: string]: unknown;
}

export interface FloodAlertRecord {
  datetime: string;
  updatedTimestamp: string;
  item: {
    type: string;
    isStationData: boolean;
    readings: FloodAlertReading[];
  };
}

/** Unwrapped `data` from the v2 real-time flood-alerts endpoint. */
export interface FloodAlertsV2Data {
  records: FloodAlertRecord[];
}

/** GeoJSON feature from the PUB water-level sensor locations dataset. */
export interface WaterSensorFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
}

export interface WaterSensorFeatureCollection {
  type: "FeatureCollection";
  features: WaterSensorFeature[];
}
