/**
 * Dashboard sales report: last 7 days (chart) and today (profit).
 * Uses GET /api/reports/sales with from/to. Normalized via reportsApi.
 */
import { useQueries } from '@tanstack/react-query';
import { API_BASE_URL } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { fetchSalesReport, type SalesReportApiResponse } from '../services/reportsApi';
import { isValidWarehouseId } from '../lib/warehouseId';

function toISO(date: Date): string {
  return date.toISOString();
}

function getTodayRange(): { from: string; to: string } {
  const d = new Date();
  const from = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const to = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  return { from: toISO(from), to: toISO(to) };
}

function getLast7DaysRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 6);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from: toISO(from), to: toISO(to) };
}

export interface DashboardSalesReportResult {
  salesByDay: SalesReportApiResponse['salesByDay'];
  todayRevenue: number;
  todayProfit: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useDashboardSalesReport(warehouseId: string): DashboardSalesReportResult {
  const today = getTodayRange();
  const last7 = getLast7DaysRange();

  const [last7Result, todayResult] = useQueries({
    queries: [
      {
        queryKey: queryKeys.salesReportLast7(warehouseId),
        queryFn: async (): Promise<SalesReportApiResponse | null> =>
          fetchSalesReport(API_BASE_URL, {
            warehouseId,
            from: last7.from,
            to: last7.to,
          }),
        staleTime: 60 * 1000,
        enabled: isValidWarehouseId(warehouseId),
      },
      {
        queryKey: queryKeys.salesReportToday(warehouseId),
        queryFn: async (): Promise<SalesReportApiResponse | null> =>
          fetchSalesReport(API_BASE_URL, {
            warehouseId,
            from: today.from,
            to: today.to,
          }),
        staleTime: 60 * 1000,
        enabled: isValidWarehouseId(warehouseId),
      },
    ],
  });

  const reportLast7 = last7Result.data ?? null;
  const reportToday = todayResult.data ?? null;

  const salesByDay = reportLast7?.salesByDay ?? [];
  const todayRevenue = reportToday?.revenue ?? 0;
  const todayProfit = reportToday?.grossProfit ?? 0;

  const isLoading = last7Result.isLoading || todayResult.isLoading;
  const rawError = last7Result.error ?? todayResult.error;
  const error = rawError instanceof Error ? rawError : rawError != null ? new Error(String(rawError)) : null;

  const refetch = () => {
    last7Result.refetch();
    todayResult.refetch();
  };

  return {
    salesByDay,
    todayRevenue,
    todayProfit,
    isLoading,
    error,
    refetch,
  };
}
