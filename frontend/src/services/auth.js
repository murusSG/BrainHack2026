import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[auth] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from .env');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

async function fetchProfile(token) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api/v1';
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`/auth/me failed: ${res.status}`);
    const json = await res.json();
    return json.data ?? json;
  } catch (err) {
    console.error('[auth] /auth/me failed, defaulting to public role:', err.message);
    return null;
  }
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Authentication is unavailable: Supabase is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);

  const token = data.session.access_token;
  const profile = await fetchProfile(token);

  return {
    identity: data.user.email,
    role: profile?.role ?? 'public',
  };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const token = data.session.access_token;
  const profile = await fetchProfile(token);

  return {
    identity: data.session.user.email,
    role: profile?.role ?? 'public',
  };
}
