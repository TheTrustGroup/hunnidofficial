/**
 * Centralized query keys for React Query.
 * Invalidate these on mutations so cache stays fresh.
 */
export const queryKeys = {
  products: (warehouseId: string) => ['products', warehouseId] as const,
  dashboard: (warehouseId: string, date?: string) =>
    ['dashboard', warehouseId, date ?? ''] as const,
  todayByWarehouse: (date: string) => ['dashboard', 'today-by-warehouse', date] as const,
  sales: (warehouseId: string, params?: { from?: string; to?: string; limit?: number }) =>
    ['sales', warehouseId, params ?? {}] as const,
  /** POS product list — same data as products but longer stale for instant POS load. */
  posProducts: (warehouseId: string) => ['pos-products', warehouseId] as const,
  /** Reports (sales/inventory). Invalidated on Realtime sales changes. */
  reports: (warehouseId: string) => ['reports', warehouseId] as const,
  /** Dashboard chart: last 7 days revenue/profit by day. */
  salesReportLast7: (warehouseId: string) => ['dashboard', 'sales-report-last7', warehouseId] as const,
  /** Dashboard: today's profit (revenue - COGS). */
  salesReportToday: (warehouseId: string) => ['dashboard', 'sales-report-today', warehouseId] as const,
};
