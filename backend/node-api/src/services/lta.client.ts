import axios from "axios";
import { env } from "../config/env";

const BASE_URL = "https://datamall2.mytransport.sg/ltaodataservice";

export const ltaClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  headers: {
    AccountKey: env.LTA_API_KEY,
    Accept: "application/json",
  },
});
