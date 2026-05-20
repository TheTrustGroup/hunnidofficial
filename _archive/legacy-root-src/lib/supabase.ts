/**
 * Supabase client for the frontend (Realtime only).
 * Used by useInventoryRealtime and PresenceContext for postgres_changes and presence.
 *
 * Requires env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 * Enable Replication in Supabase Dashboard for: warehouse_inventory_by_size, sales, warehouse_products.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

/**
 * Returns the cached client if already created.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return client;
}

/**
 * Returns the Supabase client, creating it on first call when env is set. Use in useEffect.
 */
export async function getSupabaseClientAsync(): Promise<SupabaseClient | null> {
  if (client != null) return client;
  if (!url?.trim() || !anonKey?.trim()) return null;
  try {
    client = createClient(url, anonKey);
    return client;
  } catch (e) {
    if (typeof console !== 'undefined') {
      console.warn('[supabase] Failed to create Supabase client:', e);
    }
    return null;
  }
}
