import { createClient } from '@supabase/supabase-js';
import { api } from './api';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[auth] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from .env');
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function signIn(email, password) {
  if (!supabase) throw new Error('Authentication is unavailable: Supabase is not configured.');

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('Sign-in succeeded but no session was returned. Check that your email is confirmed.');

  const token = data.session.access_token;
  const profile = await api.authedGet('/auth/me', token).catch(err => { console.error('[auth] /auth/me failed, defaulting to public role:', err.message); return null; });

  return {
    identity: data.user.email,
    role: profile?.role ?? 'public',
    token,
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
  const profile = await api.authedGet('/auth/me', token).catch(err => { console.error('[auth] /auth/me failed, defaulting to public role:', err.message); return null; });

  return {
    identity: data.session.user.email,
    role: profile?.role ?? 'public',
    token,
  };
}
