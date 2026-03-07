/**
 * Supabase client for the frontend (Realtime only).
 * Loaded at runtime via dynamic import so the build never needs to resolve @supabase/supabase-js.
 * Used by useInventoryRealtime and PresenceContext for postgres_changes and presence.
 *
 * Requires env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 * Enable Replication in Supabase Dashboard for: warehouse_inventory_by_size, sales, warehouse_products.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient | null> | null = null;

/**
 * Returns the cached client if already loaded. Use getSupabaseClientAsync() to ensure the package is loaded.
 */
export function getSupabaseClient(): SupabaseClient | null {
  return client;
}

/**
 * Loads @supabase/supabase-js at runtime and returns the client (or null if env missing or load fails).
 * Use this in useEffect so the app builds even when the dependency is not installed (e.g. some CI/Vercel setups).
 */
export async function getSupabaseClientAsync(): Promise<SupabaseClient | null> {
  if (client != null) return client;
  if (!url?.trim() || !anonKey?.trim()) return null;
  if (clientPromise != null) return clientPromise;

  clientPromise = (async () => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      client = createClient(url!, anonKey!);
      return client;
    } catch (e) {
      if (typeof console !== 'undefined') {
        console.warn('[supabase] Failed to load @supabase/supabase-js:', e);
      }
      return null;
    }
  })();

  return clientPromise;
}
