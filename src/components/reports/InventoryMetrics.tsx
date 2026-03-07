import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';
import { InventoryReport } from '../../services/reportService';
import { formatCurrency } from '../../lib/utils';

interface InventoryMetricsProps {
  report: InventoryReport;
}

export function InventoryMetrics({ report }: InventoryMetricsProps) {
  const metrics: Array<{ label: string; value: string; icon: typeof Package; bg: string; accent: string }> = [
    { label: 'Total Products', value: report.totalProducts.toString(), icon: Package, bg: 'var(--blue-dim)', accent: 'var(--blue)' },
    { label: 'Total Stock Value', value: formatCurrency(report.totalStockValue), icon: DollarSign, bg: 'var(--green-dim)', accent: 'var(--green)' },
    { label: 'Low Stock Items', value: report.lowStockItems.toString(), icon: AlertTriangle, bg: 'var(--amber-dim)', accent: 'var(--amber)' },
    { label: 'Out of Stock', value: report.outOfStockItems.toString(), icon: TrendingDown, bg: 'rgba(239,68,68,0.12)', accent: 'var(--red-status)' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="rounded-xl border p-4 animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
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
            <div className="p-3 rounded-xl flex-shrink-0 ml-4" style={{ background: metric.bg, color: metric.accent }}>
              <metric.icon className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
