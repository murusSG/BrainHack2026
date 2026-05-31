import axios from "axios";

const BASE_URL = "https://api.data.gov.sg/v1";
const DATASTORE_URL = "https://data.gov.sg/api/action/datastore_search";

export const dataGovSgClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

/** Fetch from the CKAN datastore API on data.gov.sg */
export async function datastoreSearch(
  resourceId: string,
  params: Record<string, string | number> = {}
) {
  const response = await axios.get(DATASTORE_URL, {
    params: { resource_id: resourceId, ...params },
    timeout: 10_000,
  });
  return response.data;
}
