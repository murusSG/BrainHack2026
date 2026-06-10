import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

const envDir = path.resolve(__dirname, "../..");

// Tests use explicit process variables and defaults so they never inherit live local credentials.
// Outside tests, load ignored secrets first, then .env.local, then fall back to .env.
// dotenv does not overwrite already-set vars, so the earlier call wins.
if (process.env.NODE_ENV !== "test") {
  dotenv.config({ path: path.join(envDir, ".env.secrets") });
  dotenv.config({ path: path.join(envDir, ".env.local") });
  dotenv.config({ path: path.join(envDir, ".env") });
}

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalString = z.preprocess(blankToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(blankToUndefined, z.string().url().optional());
const fetchMode = (defaultValue: "datastore" | "download") =>
  z.preprocess(blankToUndefined, z.enum(["datastore", "download"]).default(defaultValue));
const envBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === undefined || value === "") return defaultValue;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
    return value;
  }, z.boolean());

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_URL: optionalUrl,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  // Optional so the API can boot with only Supabase configured.
  // LTA transport endpoints will fail until a key is supplied.
  LTA_API_KEY: optionalString,
  DATA_GOV_BASE_URL: z.string().url().default("https://api-open.data.gov.sg"),
  DATA_GOV_LEGACY_BASE_URL: z.string().url().default("https://api.data.gov.sg/v1"),
  ONEMAP_API_BASE_URL: z.string().url().default("https://www.onemap.gov.sg"),
  ONEMAP_EMAIL: optionalString,
  ONEMAP_PASSWORD: optionalString,
  ONEMAP_TOKEN_CACHE_PATH: z.string().min(1).default(".cache/onemap-token.json"),
  LLM_API_KEY: optionalString,
  LLM_API_BASE_URL: z.string().url().default("https://api.vectorengine.ai/v1"),
  LLM_MODEL: z.string().min(1).default("gpt-5.5:stable"),
  ASK_MURUS_LLM_API_KEY: optionalString,
  ASK_MURUS_LLM_API_BASE_URL: z.string().url().default("https://vectorengine.ai/v1"),
  ASK_MURUS_LLM_MODEL: z.string().min(1).default("deepseek-v4-pro:stable"),
  LLM_TIMEOUT_MS: z.coerce.number().positive().default(90000),
  ASK_MURUS_TIMEOUT_MS: z.coerce.number().positive().default(90000),
  FLASK_AI_URL: z.string().url().default("http://localhost:5001"),
  INCIDENT_SIMILARITY_TIME_WINDOW_MINUTES: z.coerce.number().positive().default(60),
  INCIDENT_SIMILARITY_THRESHOLD: z.coerce.number().min(0).max(1).default(0.75),
  AI_SERVICE_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  EXTERNAL_API_TIMEOUT_SECONDS: z.coerce.number().positive().default(30),
  CACHE_TTL_SECONDS: z.coerce.number().positive().default(3600),
  SMS_ENABLED: envBoolean(false),
  SMS_PROVIDER: z.preprocess(blankToUndefined, z.enum(["twilio"]).default("twilio")),
  SMS_DEMO_RECIPIENTS: optionalString,
  TWILIO_ACCOUNT_SID: optionalString,
  TWILIO_AUTH_TOKEN: optionalString,
  TWILIO_FROM_NUMBER: optionalString,
  TWILIO_MESSAGING_SERVICE_SID: optionalString,
  WHATSAPP_ENABLED: envBoolean(false),
  WHATSAPP_DEMO_RECIPIENTS: optionalString,
  WHATSAPP_PHONE_NUMBER_ID: optionalString,
  WHATSAPP_ACCESS_TOKEN: optionalString,
  WHATSAPP_GRAPH_VERSION: z.string().min(1).default("v23.0"),
  TELEGRAM_ENABLED: envBoolean(false),
  TELEGRAM_DEMO_CHAT_IDS: optionalString,
  TELEGRAM_BOT_TOKEN: optionalString,
  ENABLE_MOCK_SCDF_INCIDENTS: envBoolean(false),
  ENABLE_MOCK_DORSCON: envBoolean(true),
  SCDF_FIRE_STATIONS_RESOURCE_ID: z
    .string()
    .min(1)
    .default("d_5d3d2c4f3556edb5d8c995f42e603b24"),
  SCDF_FIRE_STATIONS_FETCH_MODE: fetchMode("download"),
  SCDF_SHELTERS_RESOURCE_ID: z
    .string()
    .min(1)
    .default("d_291795a678b8cf82f108780a6235ce18"),
  SCDF_SHELTERS_FETCH_MODE: fetchMode("download"),
  SCDF_AEDS_RESOURCE_ID: z
    .string()
    .min(1)
    .default("d_e8934d28896a1eceecfe86f42dd3c077"),
  SCDF_AEDS_FETCH_MODE: fetchMode("download"),
  MOH_INFECTIOUS_DISEASES_RESOURCE_ID: optionalString,
  MOH_INFECTIOUS_DISEASES_FETCH_MODE: fetchMode("datastore"),
  MOH_COVID_WEEKLY_RESOURCE_ID: optionalString,
  MOH_COVID_WEEKLY_FETCH_MODE: fetchMode("datastore"),
  MOH_HEALTH_CAPACITY_RESOURCE_ID: optionalString,
  MOH_HEALTH_CAPACITY_FETCH_MODE: fetchMode("datastore"),
  MOH_BEDS_OCCUPANCY_URL: z
    .string()
    .url()
    .default("https://www.moh.gov.sg/others/resources-and-statistics/healthcare-institution-statistics-beds-occupancy-rate-(bor)/"),
  MOH_WAITING_TIME_ADMISSION_URL: z
    .string()
    .url()
    .default("https://www.moh.gov.sg/others/resources-and-statistics/healthcare-institution-statistics-waiting-time-for-admission-to-ward/"),
  DATA_GOV_ED_WAITING_TIMES_RESOURCE_ID: optionalString,
  DATA_GOV_ED_WAITING_TIMES_FETCH_MODE: fetchMode("datastore"),
  HDB_BUILDINGS_RESOURCE_ID: optionalString,
  HDB_BUILDINGS_FETCH_MODE: fetchMode("datastore"),
  POPULATION_PLANNING_AREAS_RESOURCE_ID: optionalString,
  POPULATION_PLANNING_AREAS_FETCH_MODE: fetchMode("datastore"),
  POPULATION_HOUSEHOLDS_RESOURCE_ID: optionalString,
  POPULATION_HOUSEHOLDS_FETCH_MODE: fetchMode("datastore"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
