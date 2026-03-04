/**
 * Dashboard stats: one server-side aggregation so the client gets a small payload
 * instead of loading all products. Used by GET /api/dashboard.
 */

import { getWarehouseProducts, type ProductRecord } from '@/lib/data/warehouseProducts';
import { getSupabase } from '@/lib/supabase';

const LOW_STOCK_ALERTS_LIMIT = 10;
/** Max products per warehouse for dashboard stats. If a warehouse has more, totalStockValue will be understated; consider DB-side aggregation (e.g. RPC) for very large catalogs. */
const PRODUCTS_LIMIT = 2000;

function getProductQty(p: ProductRecord): number {
  if (p.sizeKind === 'sized' && p.quantityBySize?.length > 0) {
    return p.quantityBySize.reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return p.quantity ?? 0;
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
 * Compute dashboard stats, low-stock list, and category summary for a warehouse.
 * Single products fetch on the server; response is small (no full product list to client).
 */
export async function getDashboardStats(
  warehouseId: string,
  options: { date?: string } = {}
): Promise<DashboardStatsResult> {
  const date = options.date ?? new Date().toISOString().split('T')[0];
  const [productsResult, todaySales] = await Promise.all([
    getWarehouseProducts(warehouseId, { limit: PRODUCTS_LIMIT }),
    getTodaySalesTotal(warehouseId, date),
  ]);
  const products = productsResult.data;

  let totalStockValue = 0;
  let totalUnits = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categorySummary: DashboardCategorySummary = {};
  const lowStockCandidates: ProductRecord[] = [];

  for (const p of products) {
    const qty = getProductQty(p);
    const reorder = p.reorderLevel ?? 0;
    const cost = p.costPrice ?? 0;
    const price = cost > 0 ? cost : (p.sellingPrice ?? 0);
    totalUnits += qty;
    totalStockValue += qty * price;
    if (qty === 0) outOfStockCount++;
    else if (qty <= reorder) lowStockCount++;
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
    totalStockValue,
    totalUnits,
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount,
    todaySales,
    lowStockItems,
    categorySummary,
  };
}
