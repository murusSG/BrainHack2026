import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "./env";

export const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        realtime: { transport: WebSocket as never },
      })
    : null;
