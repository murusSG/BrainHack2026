import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { env } from "./env";

export const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        realtime: { transport: WebSocket as never },
      })
    : null;

// Separate client for verifying end-user JWTs. The anon/publishable key must be
// used here: the new-format secret key (sb_secret_*) is rejected by GoTrue's
// /auth/v1/user endpoint ("Forbidden use of secret API key in browser"), so the
// service-role client above cannot validate user tokens.
export const supabaseAuth =
  env.SUPABASE_URL && env.SUPABASE_ANON_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
    : null;
