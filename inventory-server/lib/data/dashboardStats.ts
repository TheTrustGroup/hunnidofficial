/**
 * Dashboard stats: totals from DB (get_warehouse_stats RPC); low-stock list and category summary from product list.
 * Used by GET /api/dashboard. Single source of truth for total_units and total_stock_value. Cost-only for value.
 */

import { getWarehouseProducts, type ProductRecord } from '@/lib/data/warehouseProducts';
import { getSupabase } from '@/lib/supabase';

const LOW_STOCK_ALERTS_LIMIT = 10;
const PRODUCTS_LIMIT_FOR_LIST = 2000;

function getProductQty(p: ProductRecord): number {
  if (p.sizeKind === 'sized' && p.quantityBySize?.length > 0) {
    return p.quantityBySize.reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return p.quantity ?? 0;
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

/** Warehouse IDs used for "today by warehouse" summary (match frontend Main Store / Main Town). */
const DEFAULT_WAREHOUSE_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
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
 * Stock value is cost-only; null/0 cost contributes 0.
 */
export async function getDashboardStats(
  warehouseId: string,
  options: { date?: string } = {}
): Promise<DashboardStatsResult> {
  const date = options.date ?? new Date().toISOString().split('T')[0];
  const [dbStats, productsResult, todaySales] = await Promise.all([
    getWarehouseStatsFromDb(warehouseId),
    getWarehouseProducts(warehouseId, { limit: PRODUCTS_LIMIT_FOR_LIST }),
    getTodaySalesTotal(warehouseId, date),
  ]);

  const products = productsResult.data;
  const categorySummary: DashboardCategorySummary = {};
  const lowStockCandidates: ProductRecord[] = [];

  for (const p of products) {
    const qty = getProductQty(p);
    const reorder = p.reorderLevel ?? 0;
    const cost = p.costPrice ?? 0;
    const price = cost > 0 ? cost : 0;
    if (qty <= reorder) lowStockCandidates.push(p);
    const cat = p.category?.trim() || 'Uncategorised';
    if (!categorySummary[cat]) categorySummary[cat] = { count: 0, value: 0 };
    categorySummary[cat].count++;
    categorySummary[cat].value += qty * price;
  }

  const lowStockItems: DashboardLowStockItem[] = lowStockCandidates
    .sort((a, b) => getProductQty(a) - getProductQty(b))
    .slice(0, LOW_STOCK_ALERTS_LIMIT)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category?.trim() || 'Uncategorised',
      quantity: getProductQty(p),
      quantityBySize: (p.quantityBySize ?? []).map((s) => ({ sizeCode: s.sizeCode, quantity: s.quantity })),
      reorderLevel: p.reorderLevel ?? 0,
    }));

  return {
    totalStockValue: dbStats.total_stock_value,
    totalUnits: dbStats.total_units,
    totalProducts: dbStats.total_skus,
    lowStockCount: dbStats.low_stock_count,
    outOfStockCount: dbStats.out_of_stock_count,
    todaySales,
    lowStockItems,
    categorySummary,
  };
}
