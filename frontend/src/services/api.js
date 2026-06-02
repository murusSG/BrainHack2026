import { supabase } from './supabaseClient';

export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';

/** GET /api/v1<path>, attaching the Supabase access token when signed in. */
export async function apiGet(path) {
  const headers = {};

  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, { headers });
  if (!response.ok) {
    throw new Error(`API ${path} failed with ${response.status}`);
  }
  return response.json();
}
