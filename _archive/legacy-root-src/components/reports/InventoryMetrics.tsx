import { Package, AlertTriangle, TrendingDown, DollarSign, Info } from 'lucide-react';
import { InventoryReport } from '../../services/reportService';
import { formatCurrency } from '../../lib/utils';

interface InventoryMetricsProps {
  report: InventoryReport;
}

const atCostDesc = 'Value of current inventory at what you paid (cost price × quantity). Used for accounting and margin.';
const atSellingDesc = 'Value of current inventory if sold at listed selling price (selling price × quantity).';
const potentialProfitDesc = 'Selling value minus cost value. Profit you would make if all stock sold at current prices.';

export function InventoryMetrics({ report }: InventoryMetricsProps) {
  // When from API: totalStockValue = at selling price, stockValueAtCost = at cost. When client-only: totalStockValue = at cost only.
  const hasBoth = report.stockValueAtCost != null;
  const atCost = hasBoth ? report.stockValueAtCost! : report.totalStockValue;
  const atSelling = hasBoth ? report.totalStockValue : null;
  const potentialProfitInStock = atSelling != null && report.stockValueAtCost != null ? atSelling - report.stockValueAtCost : null;

  const metrics: Array<{
    label: string;
    value: string;
    icon: typeof Package;
    bg: string;
    accent: string;
    tooltip?: string;
  }> = [
    { label: 'Total Products', value: report.totalProducts.toString(), icon: Package, bg: 'var(--blue-dim)', accent: 'var(--blue)' },
    { label: 'Stock value (at cost)', value: formatCurrency(atCost), icon: DollarSign, bg: 'var(--elevated)', accent: 'var(--text-2)', tooltip: atCostDesc },
    { label: 'Stock value (at selling price)', value: atSelling != null ? formatCurrency(atSelling) : '—', icon: DollarSign, bg: 'var(--green-dim)', accent: 'var(--green)', tooltip: atSellingDesc },
    { label: 'Potential profit in stock', value: potentialProfitInStock != null ? formatCurrency(potentialProfitInStock) : '—', icon: DollarSign, bg: 'var(--amber-dim)', accent: 'var(--amber)', tooltip: potentialProfitDesc },
    { label: 'Low Stock Items', value: report.lowStockItems.toString(), icon: AlertTriangle, bg: 'rgba(245,158,11,0.12)', accent: 'var(--amber)' },
    { label: 'Out of Stock', value: report.outOfStockItems.toString(), icon: TrendingDown, bg: 'rgba(239,68,68,0.12)', accent: 'var(--red-status)' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          className="rounded-xl border p-4 animate-fade-in-up transition-all duration-200 hover:-translate-y-0.5"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            animationDelay: `${idx * 50}ms`,
          }}
          title={metric.tooltip}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-b)' }}>
                {metric.label}
                {metric.tooltip && (
                  <span className="inline-flex text-slate-400 hover:text-slate-600" title={metric.tooltip} aria-label="Metric description">
                    <Info className="w-3.5 h-3.5" strokeWidth={2} />
                  </span>
                )}
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
