/**
 * Supabase client with anon (publishable) key for auth operations that require
 * validating a user's password (e.g. signInWithPassword). Do not use for DB access.
 * Returns null if anon key is not configured.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null | undefined = undefined;

export function getSupabaseAnon(): SupabaseClient | null {
  if (_client !== undefined) return _client ?? null;
  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    '';
  const key =
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    '';
  if (!url || !key) {
    _client = null;
    return null;
  }
  _client = createClient(url, key, {
    auth: { persistSession: false },
  });
  return _client;
}
