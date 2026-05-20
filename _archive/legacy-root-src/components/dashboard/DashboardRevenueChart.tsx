/**
 * Phase 5: Revenue vs activity (last 7 days). Blue = Revenue, Green = Transactions.
 * Uses design tokens (--blue, --green). Syne for title.
 */
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface ChartDay {
  date: string;
  revenue: number;
  transactions: number;
}

interface DashboardRevenueChartProps {
  data: ChartDay[];
  loading?: boolean;
}

function formatGHC(n: number): string {
  if (n >= 1_000_000) return `GH₵${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `GH₵${(n / 1_000).toFixed(1)}K`;
  return 'GH₵' + n.toLocaleString('en-GH', { maximumFractionDigits: 0 });
}

function formatShortDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'Z');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

export function DashboardRevenueChart({ data, loading }: DashboardRevenueChartProps) {
  if (loading) {
    return (
      <div
        className="rounded-xl border p-5 h-[280px] flex items-center justify-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="h-6 w-32 rounded skeleton-shimmer" aria-hidden />
      </div>
    );
  }

  const chartData = data.length > 0 ? data : [];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="px-5 pt-4 pb-1">
        <h3
          className="text-base font-semibold tracking-tight"
          style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}
        >
          Revenue & activity (last 7 days)
        </h3>
      </div>
      <div className="h-[260px] px-2 pb-4">
        {chartData.length === 0 ? (
          <div
            className="h-full flex items-center justify-center text-sm"
            style={{ color: 'var(--text-3)' }}
          >
            No sales in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                stroke="var(--text-3)"
                style={{ fontSize: 11 }}
                tick={{ fill: 'var(--text-3)' }}
              />
              <YAxis
                yAxisId="revenue"
                stroke="var(--text-3)"
                style={{ fontSize: 11 }}
                tick={{ fill: 'var(--text-3)' }}
                tickFormatter={formatGHC}
              />
              <YAxis
                yAxisId="transactions"
                orientation="right"
                stroke="var(--text-3)"
                style={{ fontSize: 11 }}
                tick={{ fill: 'var(--text-3)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px',
                }}
                labelStyle={{ color: 'var(--text-2)', fontFamily: 'var(--font-d)' }}
                labelFormatter={formatShortDate}
                formatter={(value: number, name: string) => [
                  name === 'revenue' ? formatGHC(value) : String(value),
                  name === 'revenue' ? 'Revenue' : 'Transactions',
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{value}</span>
                )}
              />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--blue)"
                fill="var(--blue)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Area
                yAxisId="transactions"
                type="monotone"
                dataKey="transactions"
                name="Transactions"
                stroke="var(--green)"
                fill="var(--green)"
                fillOpacity={0.15}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
