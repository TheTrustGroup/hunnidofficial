import { getSupabase } from '@/lib/supabase';

export interface UserScope {
  allowedWarehouseIds: string[];
  allowedStoreIds: string[];
  allowedPosIds: string[];
}

const EMPTY_SCOPE: UserScope = { allowedWarehouseIds: [], allowedStoreIds: [], allowedPosIds: [] };

/**
 * Resolve allowed warehouses, stores, and POS for a user from the user_scopes table.
 * - If the user has no rows in user_scopes: returns empty arrays (legacy = unrestricted for non-admin).
 * - If the user has rows: returns distinct ids from those rows.
 * - Env ALLOWED_WAREHOUSE_IDS (comma-separated) can still override/restrict when set.
 */
export async function getScopeForUser(email: string): Promise<UserScope> {
  const normalizedEmail = email?.trim()?.toLowerCase();
  if (!normalizedEmail) return EMPTY_SCOPE;

  const envWarehouseIds = process.env.ALLOWED_WAREHOUSE_IDS?.trim();
  if (envWarehouseIds) {
    const allowedWarehouseIds = envWarehouseIds.split(',').map((id) => id.trim()).filter(Boolean);
    return { ...EMPTY_SCOPE, allowedWarehouseIds };
  }

  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from('user_scopes')
      .select('store_id, warehouse_id, pos_id')
      .eq('user_email', normalizedEmail);

    if (error) {
      console.warn('[userScopes] getScopeForUser query failed:', error.message);
      return EMPTY_SCOPE;
    }
    if (!rows?.length) return EMPTY_SCOPE;

    const allowedWarehouseIds = [...new Set(rows.map((r) => r.warehouse_id).filter(Boolean))].map(String);
    const allowedStoreIds = [...new Set(rows.map((r) => r.store_id).filter(Boolean))].map(String);
    const allowedPosIds = [...new Set(rows.map((r) => r.pos_id).filter(Boolean))].map(String);

    return {
      allowedWarehouseIds,
      allowedStoreIds,
      allowedPosIds,
    };
  } catch (e) {
    console.warn('[userScopes] getScopeForUser error:', e);
    return EMPTY_SCOPE;
  }
}

/** POS assignment for user (from user_scopes). */
export async function getAssignedPosForUser(email: string): Promise<{ posId?: string }> {
  const scope = await getScopeForUser(email);
  const posId = scope.allowedPosIds?.[0];
  return posId ? { posId } : {};
}

/** List scope rows for a user (store/warehouse pairs). Used by admin GET /api/user-scopes. */
export async function listScopesForEmail(email: string): Promise<Array<{ storeId: string; warehouseId: string }>> {
  const normalizedEmail = email?.trim()?.toLowerCase();
  if (!normalizedEmail) return [];

  try {
    const supabase = getSupabase();
    const { data: rows, error } = await supabase
      .from('user_scopes')
      .select('store_id, warehouse_id')
      .eq('user_email', normalizedEmail);

    if (error || !rows?.length) return [];
    return rows
      .filter((r) => r.store_id != null && r.warehouse_id != null)
      .map((r) => ({ storeId: String(r.store_id), warehouseId: String(r.warehouse_id) }));
  } catch {
    return [];
  }
}

/** Set scope rows for a user. Replaces all existing rows. Admin only via PUT /api/user-scopes. */
export async function setScopesForUser(
  email: string,
  scopes: Array<{ storeId: string; warehouseId: string }>
): Promise<void> {
  const normalizedEmail = email?.trim()?.toLowerCase();
  if (!normalizedEmail) return;

  const pairs = Array.isArray(scopes)
    ? scopes.filter((s) => s && typeof s.storeId === 'string' && typeof s.warehouseId === 'string')
    : [];

  const supabase = getSupabase();
  const { error: deleteErr } = await supabase.from('user_scopes').delete().eq('user_email', normalizedEmail);
  if (deleteErr) {
    console.error('[userScopes] setScopesForUser delete failed:', deleteErr);
    throw new Error('Failed to clear existing scopes');
  }

  if (pairs.length === 0) return;

  const toInsert = pairs.map(({ storeId, warehouseId }) => ({
    user_email: normalizedEmail,
    store_id: String(storeId).trim() || null,
    warehouse_id: String(warehouseId).trim() || null,
  }));

  const { error: insertErr } = await supabase.from('user_scopes').insert(toInsert);
  if (insertErr) {
    console.error('[userScopes] setScopesForUser insert failed:', insertErr);
    throw new Error('Failed to save scopes');
  }
}
