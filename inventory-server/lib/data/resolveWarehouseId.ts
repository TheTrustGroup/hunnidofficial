/**
 * Map legacy placeholder warehouse UUIDs to real rows in `warehouses`.
 * Frontend/POS used ...0001 (Main Jeff) and ...0002 (Hunnid Main); DB may use different ids.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Legacy ids shipped in early app builds — resolve via warehouses.name. */
export const LEGACY_MAIN_JEFF_ID = '00000000-0000-0000-0000-000000000001';
export const LEGACY_HUNNID_MAIN_ID = '00000000-0000-0000-0000-000000000002';

/** Real Hunnid Main id in production (HunnidOfficial project). */
export const HUNNID_MAIN_WAREHOUSE_ID = '99aa0b7b-a93d-4b5d-8b10-2854ed2da59f';

export const NULL_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000000';

export function isInvalidWarehouseId(value: string | undefined | null): boolean {
  const w = String(value ?? '').trim();
  return !w || w === NULL_WAREHOUSE_ID;
}

let cache: { at: number; byLegacy: Record<string, string>; byReal: Set<string> } | null = null;
const CACHE_MS = 60_000;

async function loadWarehouseIdMap(db: SupabaseClient): Promise<{
  byLegacy: Record<string, string>;
  byReal: Set<string>;
}> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) {
    return { byLegacy: cache.byLegacy, byReal: cache.byReal };
  }

  const { data, error } = await db.from('warehouses').select('id, name');
  if (error) throw new Error(`Failed to load warehouses: ${error.message}`);

  const byLegacy: Record<string, string> = {};
  const byReal = new Set<string>();

  for (const row of data ?? []) {
    const id = String((row as { id: string }).id ?? '').trim();
    const name = String((row as { name: string }).name ?? '').trim().toLowerCase();
    if (!id) continue;
    byReal.add(id);
    if (name.includes('main jeff') || name === 'main jeff') {
      byLegacy[LEGACY_MAIN_JEFF_ID] = id;
    }
    if (name.includes('hunnid main') || name === 'hunnid main') {
      byLegacy[LEGACY_HUNNID_MAIN_ID] = id;
    }
  }

  // Hard fallback when name match fails but we know production ids
  if (!byLegacy[LEGACY_MAIN_JEFF_ID]) {
    byLegacy[LEGACY_MAIN_JEFF_ID] = LEGACY_MAIN_JEFF_ID;
    byReal.add(LEGACY_MAIN_JEFF_ID);
  }
  if (!byLegacy[LEGACY_HUNNID_MAIN_ID]) {
    byLegacy[LEGACY_HUNNID_MAIN_ID] = HUNNID_MAIN_WAREHOUSE_ID;
    byReal.add(HUNNID_MAIN_WAREHOUSE_ID);
  }

  cache = { at: now, byLegacy, byReal };
  return { byLegacy, byReal };
}

/** Resolve client warehouse id to the id used in warehouse_inventory / warehouse_products. */
export async function resolveWarehouseId(db: SupabaseClient, warehouseId: string | undefined): Promise<string> {
  const raw = String(warehouseId ?? '').trim();
  if (isInvalidWarehouseId(raw)) return '';
  if (raw === LEGACY_MAIN_JEFF_ID) return LEGACY_MAIN_JEFF_ID;
  if (raw === LEGACY_HUNNID_MAIN_ID) return HUNNID_MAIN_WAREHOUSE_ID;
  if (raw === HUNNID_MAIN_WAREHOUSE_ID) return HUNNID_MAIN_WAREHOUSE_ID;
  const { byLegacy, byReal } = await loadWarehouseIdMap(db);
  if (byReal.has(raw)) return raw;
  return byLegacy[raw] ?? raw;
}
