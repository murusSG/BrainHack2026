export interface ApiEnvelope<T> {
  data: T;
  source: string;
  fetchedAt: string;
}
