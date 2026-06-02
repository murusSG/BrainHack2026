import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Supabase browser client. Null when env vars are absent so the app can still
 * run in a local "demo" mode without auth configured.
 */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const isAuthConfigured = Boolean(supabase);
