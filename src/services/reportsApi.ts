/**
 * Reports API — sales metrics from GET /api/reports/sales (SQL aggregation from sales + sale_lines).
 * Single source of truth for revenue, COGS, profit; cost at time of sale.
 */

import { getApiHeaders } from '../lib/api';

export interface SalesReportApiResponse {
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  transactionCount: number;
  unitsSold: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId?: string;
    productName?: string;
    unitsSold?: number;
    revenue?: number;
    cogs?: number;
    profit?: number;
    marginPct?: number;
  }>;
  salesByDay: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

export interface FetchSalesReportParams {
  warehouseId: string;
  from?: string;
  to?: string;
  period?: 'today' | 'week' | 'month' | 'last_month' | 'quarter' | 'year';
}

/** Raw API response (snake_case from RPC). */
interface SalesReportRaw {
  revenue?: number;
  cogs?: number;
  profit?: number;
  transaction_count?: number;
  total_items_sold?: number;
  average_order_value?: number;
  top_products?: unknown[];
  sales_by_day?: Array<{ date?: string; revenue?: number; transactions?: number }>;
  sales_by_category?: unknown[];
}

function normalizeSalesReport(raw: SalesReportRaw): SalesReportApiResponse {
  const byDay = (raw.sales_by_day ?? []).map((d) => ({
    date: d.date ?? '',
    revenue: Number(d.revenue ?? 0),
    transactions: Number(d.transactions ?? 0),
  }));
  const revenue = Number(raw.revenue ?? 0);
  const profit = Number(raw.profit ?? 0);
  const marginPct = revenue > 0 ? (100 * profit) / revenue : 0;
  return {
    revenue,
    cogs: Number(raw.cogs ?? 0),
    grossProfit: profit,
    marginPct,
    transactionCount: Number(raw.transaction_count ?? 0),
    unitsSold: Number(raw.total_items_sold ?? 0),
    averageOrderValue: Number(raw.average_order_value ?? 0),
    topProducts: Array.isArray(raw.top_products) ? (raw.top_products as SalesReportApiResponse['topProducts']) : [],
    salesByDay: byDay,
  };
}

/**
 * Fetch sales report from GET /api/reports/sales. All metrics computed in SQL.
 * Returns null on non-2xx or when get_sales_report RPC is not available.
 * Normalizes snake_case response to camelCase.
 */
export async function fetchSalesReport(
  baseUrl: string,
  params: FetchSalesReportParams
): Promise<SalesReportApiResponse | null> {
  const search = new URLSearchParams();
  search.set('warehouse_id', params.warehouseId);
  if (params.period) search.set('period', params.period);
  if (params.from) search.set('from', params.from);
  if (params.to) search.set('to', params.to);
  const url = `${baseUrl.replace(/\/$/, '')}/api/reports/sales?${search.toString()}`;
  try {
    const res = await fetch(url, { headers: getApiHeaders(), credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as SalesReportRaw;
    if (data == null || typeof data !== 'object') return null;
    return normalizeSalesReport(data);
  } catch {
    return null;
  }
}
