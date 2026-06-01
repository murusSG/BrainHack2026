import { z } from "zod";
import dotenv from "dotenv";

// Load .env.local first (takes precedence), then fall back to .env.
// dotenv does not overwrite already-set vars, so the earlier call wins.
dotenv.config({ path: ".env.local" });
dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  // Optional so the API can boot with only Supabase configured.
  // LTA transport endpoints will fail until a key is supplied.
  LTA_API_KEY: z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
