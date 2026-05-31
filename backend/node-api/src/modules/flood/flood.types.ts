export interface RawFloodAlertRecord {
  _id: number;
  [key: string]: unknown;
}

export interface RawSensorRecord {
  _id: number;
  [key: string]: unknown;
}

export interface DatastoreResponse<T> {
  result: {
    records: T[];
    total: number;
  };
  success: boolean;
}
