import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { SalesReport } from '../../services/reportService';
import { formatCurrency } from '../../lib/utils';

interface SalesChartProps {
  report: SalesReport;
}

/** Hunnid design tokens: blue primary, then green, amber, red, purple. */
const CHART_COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red-status)', '#8b5cf6', '#ec4899'];

export function SalesChart({ report }: SalesChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Sales — Hunnid blue bar */}
      <div
        className="rounded-xl border overflow-hidden animate-fade-in-up"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
            Daily Sales
          </h3>
        </div>
        <div className="px-2 pb-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report.salesByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="date" stroke="var(--text-3)" style={{ fontSize: 12 }} tick={{ fill: 'var(--text-3)' }} />
              <YAxis stroke="var(--text-3)" style={{ fontSize: 12 }} tick={{ fill: 'var(--text-3)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: 12,
                }}
                labelStyle={{ color: 'var(--text-2)', fontFamily: 'var(--font-d)' }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="revenue" fill="var(--blue)" name="Revenue (GH₵)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales by Category — blue/green/amber palette */}
      <div
        className="rounded-xl border overflow-hidden animate-fade-in-up"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
            Sales by Category
          </h3>
        </div>
        <div className="px-2 pb-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={report.salesByCategory}
                dataKey="revenue"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, revenue }: { category: string; revenue: number }) => `${category}: ${formatCurrency(revenue)}`}
              >
                {report.salesByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
