/**
 * Dashboard stats: totals from DB (get_warehouse_stats RPC); low-stock list and category summary from product list.
 * Used by GET /api/dashboard. Single source of truth for total_units and total_stock_value.
 */

import { resolveWarehouseId, HUNNID_MAIN_WAREHOUSE_ID, LEGACY_HUNNID_MAIN_ID, isInvalidWarehouseId } from '@/lib/data/resolveWarehouseId';
import { getSupabase } from '@/lib/supabase';

const LOW_STOCK_ALERTS_LIMIT = 10;

async function getLowStockItemsFromDb(warehouseId: string): Promise<DashboardLowStockItem[]> {
  const supabase = getSupabase();
  const { data: invRows, error: invErr } = await supabase
    .from('warehouse_inventory')
    .select('product_id, quantity')
    .eq('warehouse_id', warehouseId)
    .order('quantity', { ascending: true })
    .limit(40);

  if (invErr || !invRows?.length) {
    if (invErr) console.warn('[dashboardStats] low stock inventory', invErr.message);
    return [];
  }

  const ids = invRows.map((r) => String((r as { product_id: string }).product_id));
  const { data: products, error: prodErr } = await supabase
    .from('warehouse_products')
    .select('id, name, category, reorder_level')
    .in('id', ids);

  if (prodErr || !products?.length) {
    if (prodErr) console.warn('[dashboardStats] low stock products', prodErr.message);
    return [];
  }

  const productById = new Map(
    products.map((p) => {
      const row = p as { id: string; name?: string; category?: string; reorder_level?: number };
      return [String(row.id), row];
    })
  );

  const items: DashboardLowStockItem[] = [];
  for (const inv of invRows) {
    const r = inv as { product_id: string; quantity?: number };
    const wp = productById.get(String(r.product_id));
    if (!wp) continue;
    const qty = Number(r.quantity ?? 0);
    const reorder = Number(wp.reorder_level ?? 0) || 3;
    if (qty > reorder) continue;
    items.push({
      id: String(wp.id),
      name: String(wp.name ?? ''),
      category: String(wp.category ?? '').trim() || 'Uncategorised',
      quantity: qty,
      quantityBySize: [],
      reorderLevel: reorder,
    });
    if (items.length >= LOW_STOCK_ALERTS_LIMIT) break;
  }
  return items;
}

export interface WarehouseStatsFromDb {
  total_units: number;
  total_stock_value: number;
  total_skus: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

async function getWarehouseStatsFromDb(warehouseId: string): Promise<WarehouseStatsFromDb> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_warehouse_stats', {
    p_warehouse_id: warehouseId,
  });
  if (error) {
    console.error('[dashboardStats] get_warehouse_stats', error);
    return {
      total_units: 0,
      total_stock_value: 0,
      total_skus: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
    };
  }
  const raw = data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    return {
      total_units: 0,
      total_stock_value: 0,
      total_skus: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
    };
  }
  return {
    total_units: Number(raw.total_units ?? 0) || 0,
    total_stock_value: Number(raw.total_stock_value ?? 0) || 0,
    total_skus: Number(raw.total_skus ?? 0) || 0,
    low_stock_count: Number(raw.low_stock_count ?? 0) || 0,
    out_of_stock_count: Number(raw.out_of_stock_count ?? 0) || 0,
  };
}

export interface DashboardLowStockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityBySize: { sizeCode: string; quantity: number }[];
  reorderLevel: number;
}

export interface DashboardCategorySummary {
  [category: string]: { count: number; value: number };
}

export interface DashboardStatsResult {
  totalStockValue: number;
  totalUnits: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySales: number;
  lowStockItems: DashboardLowStockItem[];
  categorySummary: DashboardCategorySummary;
}

/** Warehouse IDs used for "today by warehouse" summary (Main Jeff, Hunnid Main). */
const DEFAULT_WAREHOUSE_IDS = [
  '00000000-0000-0000-0000-000000000001',
  LEGACY_HUNNID_MAIN_ID,
  HUNNID_MAIN_WAREHOUSE_ID,
];

/**
 * Fetch today's sales total for a warehouse (sum of sale totals for the given date).
 */
async function getTodaySalesTotal(warehouseId: string, date: string): Promise<number> {
  const supabase = getSupabase();
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const { data, error } = await supabase
    .from('sales')
    .select('total')
    .eq('warehouse_id', warehouseId)
    .is('voided_at', null)
    .gte('created_at', start)
    .lt('created_at', end);
  if (error) {
    console.error('[dashboardStats] getTodaySalesTotal', error);
    return 0;
  }
  const total = (data ?? []).reduce((sum, row) => sum + Number((row as { total?: number }).total ?? 0), 0);
  return total;
}

/**
 * Today's sales total per warehouse (for super-admin "sales by location" summary).
 * Uses DEFAULT_WAREHOUSE_IDS; returns a map warehouseId -> total.
 */
export async function getTodaySalesByWarehouse(
  date: string
): Promise<Record<string, number>> {
  const totals = await Promise.all(
    DEFAULT_WAREHOUSE_IDS.map(async (id) => ({ id, total: await getTodaySalesTotal(id, date) }))
  );
  return Object.fromEntries(totals.map(({ id, total }) => [id, total]));
}

/**
 * Compute dashboard stats: totals from DB (single source of truth); low-stock list and category summary from product list.
 */
export async function getDashboardStats(
  warehouseId: string,
  options: { date?: string } = {}
): Promise<DashboardStatsResult> {
  const db = getSupabase();
  const resolvedWarehouseId = await resolveWarehouseId(db, warehouseId);
  if (isInvalidWarehouseId(resolvedWarehouseId)) {
    return {
      totalStockValue: 0,
      totalUnits: 0,
      totalProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      todaySales: 0,
      lowStockItems: [],
      categorySummary: {},
    };
  }
  const date = options.date ?? new Date().toISOString().split('T')[0];
  const [dbStats, todaySales, lowStockItems] = await Promise.all([
    getWarehouseStatsFromDb(resolvedWarehouseId),
    getTodaySalesTotal(resolvedWarehouseId, date),
    getLowStockItemsFromDb(resolvedWarehouseId),
  ]);

  return {
    totalStockValue: dbStats.total_stock_value,
    totalUnits: dbStats.total_units,
    totalProducts: dbStats.total_skus,
    lowStockCount: dbStats.low_stock_count,
    outOfStockCount: dbStats.out_of_stock_count,
    todaySales,
    lowStockItems,
    categorySummary: {},
  };
}
