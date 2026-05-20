/**
 * Legacy placeholder UUIDs from early builds → real warehouse ids in production DB.
 */
export const LEGACY_MAIN_JEFF_ID = '00000000-0000-0000-0000-000000000001';
export const LEGACY_HUNNID_MAIN_ID = '00000000-0000-0000-0000-000000000002';

/** Hunnid Main in HunnidOfficial Supabase (warehouses.name = 'Hunnid Main'). */
export const HUNNID_MAIN_WAREHOUSE_ID = '99aa0b7b-a93d-4b5d-8b10-2854ed2da59f';

const LEGACY_TO_REAL: Record<string, string> = {
  [LEGACY_HUNNID_MAIN_ID]: HUNNID_MAIN_WAREHOUSE_ID,
};

export function remapLegacyWarehouseId(id: string | undefined | null): string {
  const raw = String(id ?? '').trim();
  if (!raw) return '';
  return LEGACY_TO_REAL[raw] ?? raw;
}
