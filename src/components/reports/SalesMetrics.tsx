import { TrendingUp, DollarSign, ShoppingBag, Package, CreditCard } from 'lucide-react';
import { SalesReport } from '../../services/reportService';
import { formatCurrency } from '../../lib/utils';

interface SalesMetricsProps {
  report: SalesReport;
}

type MetricVariant = 'primary' | 'green' | 'amber' | 'default';

const variantStyles: Record<MetricVariant, { bg: string; accent: string }> = {
  primary: { bg: 'var(--blue-dim)', accent: 'var(--blue)' },
  green: { bg: 'var(--green-dim)', accent: 'var(--green)' },
  amber: { bg: 'var(--amber-dim)', accent: 'var(--amber)' },
  default: { bg: 'var(--elevated)', accent: 'var(--text-2)' },
};

export function SalesMetrics({ report }: SalesMetricsProps) {
  const metrics: Array<{ label: string; value: string; icon: typeof DollarSign; variant: MetricVariant }> = [
    { label: 'Total Revenue', value: formatCurrency(report.totalRevenue), icon: DollarSign, variant: 'primary' },
    { label: 'Total Profit', value: formatCurrency(report.totalProfit), icon: TrendingUp, variant: 'green' },
    {
      label: 'Transactions',
      value: (report.totalVoided ?? 0) > 0
        ? `${report.totalTransactions} (${report.totalVoided ?? 0} voided)`
        : report.totalTransactions.toString(),
      icon: ShoppingBag,
      variant: 'default',
    },
    { label: 'Items Sold', value: report.totalItemsSold.toString(), icon: Package, variant: 'amber' },
    { label: 'Avg Order Value', value: formatCurrency(report.averageOrderValue), icon: CreditCard, variant: 'default' },
    {
      label: 'Profit Margin',
      value: `${report.totalRevenue > 0 ? ((report.totalProfit / report.totalRevenue) * 100).toFixed(1) : '0.0'}%`,
      icon: TrendingUp,
      variant: 'green',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, idx) => {
        const style = variantStyles[metric.variant];
        return (
          <div
            key={idx}
            className="rounded-xl border p-4 animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: metric.variant === 'primary' ? 'linear-gradient(135deg, var(--surface) 0%, var(--blue-dim) 100%)' : 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: metric.variant === 'primary' ? '0 4px 14px var(--blue-glow)' : undefined,
              animationDelay: `${idx * 50}ms`,
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-b)' }}>
                  {metric.label}
                </p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums" style={{ color: 'var(--text)', fontFamily: 'var(--font-m)' }}>
                  {metric.value}
                </p>
              </div>
              <div
                className="p-3 rounded-xl flex-shrink-0 ml-4"
                style={{ background: style.bg, color: style.accent }}
              >
                <metric.icon className="w-5 h-5" strokeWidth={2} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
