/** Raw shape from NEA dengue clusters CKAN datastore */
export interface RawDengueRecord {
  _id: number;
  LOCALITY: string;
  CASE_SIZE: string;
  geometry: string | { type: string; coordinates: unknown };
}

export interface DatastoreResponse {
  result: {
    records: RawDengueRecord[];
    total: number;
  };
  success: boolean;
}
