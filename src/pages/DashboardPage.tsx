// ============================================================
// DashboardPage.tsx — Phase 5: 6 KPI StatCards, Revenue chart, useCurrentWarehouse data.
// Uses WarehouseContext for warehouseId. useDashboardQuery + useDashboardSalesReport.
// ============================================================

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Package, Layers, AlertTriangle, Receipt, ShoppingCart, CheckCircle, Users, TrendingUp } from 'lucide-react';
import { useWarehouse } from '../contexts/WarehouseContext';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import { isValidWarehouseId } from '../lib/warehouseId';
import { useDashboardQuery, type DashboardLowStockItem } from '../hooks/useDashboardQuery';
import { useDashboardSalesReport } from '../hooks/useDashboardSalesReport';
import { StatCard } from '../components/ui/StatCard';
import { DashboardRevenueChart } from '../components/dashboard/DashboardRevenueChart';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatGHC(n: number): string {
  return 'GH₵' + n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Rounded/compact so large amounts fit in the stat card (e.g. GH₵585.5K, GH₵1.2M). */
function formatGHCCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}GH₵${v >= 10 ? Math.round(v) : v.toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}GH₵${v >= 100 ? Math.round(v) : v.toFixed(1)}K`;
  }
  return sign + 'GH₵' + abs.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Low stock table (uses pre-aggregated lowStockItems from API) ────────────

function LowStockTable({ items }: { items: DashboardLowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 px-4 text-emerald-600">
        <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden />
        <span className="text-[14px] font-semibold">All products are sufficiently stocked</span>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {items.map((p) => {
        const isOut = p.quantity === 0;
        return (
          <div key={p.id} className="flex items-center justify-between py-3.5 px-4">
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-slate-900 truncate">{p.name}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{p.category || 'Uncategorised'}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold
                ${isOut
                  ? 'bg-red-50 text-red-500 border border-red-100'
                  : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isOut ? 'bg-red-400' : 'bg-amber-400'}`}/>
                {isOut ? 'Out of stock' : `${p.quantity} left`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { currentWarehouseId, currentWarehouse, warehouses } = useWarehouse();
  const { hasRole } = useAuth();
  const { presenceList, isSubscribed } = usePresence();
  const warehouseId = currentWarehouseId ?? '';
  const warehouseName = currentWarehouse?.name ?? 'Warehouse';
  const isWarehouseValid = isValidWarehouseId(warehouseId);
  const canSeePresence = hasRole(['admin', 'super_admin']);

  const { dashboard, todayByWarehouse, isLoading: loading, error: queryError, refetch } = useDashboardQuery(warehouseId);
  const { salesByDay, todayRevenue, todayProfit, isLoading: salesLoading, refetch: refetchSales } = useDashboardSalesReport(warehouseId);
  const error = queryError?.message ?? null;
  const loadingAny = loading || (isWarehouseValid && salesLoading);

  // Refetch when Dashboard is opened so Stock Alerts and chart stay current.
  useEffect(() => {
    if (isWarehouseValid) {
      refetch();
      refetchSales();
    }
  }, [isWarehouseValid, refetch, refetchSales]);

  const stats = dashboard
    ? {
        totalStockValue: dashboard.totalStockValue,
        totalProducts: dashboard.totalProducts,
        totalUnits: dashboard.totalUnits,
        lowStockCount: dashboard.lowStockCount,
        outOfStockCount: dashboard.outOfStockCount,
        todaysSales: dashboard.todaySales,
      }
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-6 pb-24 lg:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header: Syne title, warehouse label, New sale (desktop) ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight"
              style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}
            >
              Dashboard
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'var(--text-3)' }}>
              {!isWarehouseValid ? (
                'Loading warehouse…'
              ) : (
                <>Stats for <span style={{ color: 'var(--text)', fontWeight: 600 }}>{warehouseName}</span></>
              )}
              {isWarehouseValid && loadingAny && (
                <span className="ml-2 animate-pulse">Loading…</span>
              )}
            </p>
          </div>
          <Link
            to="/pos"
            className="hidden lg:flex items-center gap-2 h-10 px-5 rounded-xl font-semibold text-sm transition-colors"
            style={{
              background: 'var(--blue)',
              color: '#0D1117',
              boxShadow: '0 4px 14px var(--blue-glow)',
            }}
          >
            <ShoppingCart className="w-5 h-5" aria-hidden />
            New sale
          </Link>
        </div>

        {/* ── Today's Sales by Location ── */}
        {warehouses.length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
                Today&apos;s Sales by Location
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>Sales total per warehouse for today</p>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {warehouses.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3.5 rounded-lg border" style={{ background: 'var(--elevated)', borderColor: 'var(--border)' }}>
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>{w.name}</span>
                  <span className="text-[15px] font-semibold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'var(--font-m)' }}>
                    {loading ? '—' : formatGHCCompact(todayByWarehouse[w.id] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Active cashiers (admin only, Supabase Realtime Presence) ── */}
        {canSeePresence && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <Users className="w-5 h-5" style={{ color: 'var(--text-3)' }} aria-hidden />
              <div>
                <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
                  {presenceList.length === 0 ? 'No other users active' : `${presenceList.length} cashier${presenceList.length !== 1 ? 's' : ''} active`}
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                  {isSubscribed ? 'Live — updates when someone opens or leaves the app' : 'Connecting…'}
                </p>
              </div>
            </div>
            {presenceList.length > 0 && (
              <ul className="p-5 space-y-2">
                {presenceList.map((entry) => (
                  <li key={entry.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border" style={{ background: 'var(--elevated)', borderColor: 'var(--border)' }}>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate">{entry.payload.displayName || entry.payload.email}</p>
                      <p className="text-[12px] text-slate-500">
                        {entry.payload.page} — {entry.payload.warehouseName}
                        {entry.isIdle && <span className="ml-2 text-amber-600 font-medium">Idle</span>}
                      </p>
                    </div>
                    {!entry.isIdle && <span className="text-[11px] text-slate-400 whitespace-nowrap">{entry.lastActivityAgo}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Soft notice when API returned 200 with empty stats (no circuit; sales/POS still work) ── */}
        {dashboard?.error && !loading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="text-[14px] font-bold text-amber-800">Stats temporarily unavailable</p>
              <p className="text-[12px] text-amber-700 mt-0.5">{dashboard.error}</p>
              <p className="text-[11px] text-slate-500 mt-1">Dashboard stats only — sales and inventory are unaffected.</p>
            </div>
            <button onClick={() => refetch()} className="ml-auto px-4 py-2 rounded-xl bg-amber-500 text-white text-[12px] font-bold hover:bg-amber-600">
              Retry
            </button>
          </div>
        )}

        {/* ── Hard error (query failed after retries or dashboard circuit open) ── */}
        {error && !loading && !dashboard?.error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertTriangle className="w-6 h-6 flex-shrink-0 text-red-500" aria-hidden />
            <div>
              <p className="text-[14px] font-bold text-red-700">Failed to load data</p>
              <p className="text-[12px] text-red-500 mt-0.5">{error}</p>
              <p className="text-[11px] text-slate-500 mt-1">Dashboard only — sales and POS still work. Click Retry to try again.</p>
            </div>
            <button onClick={() => refetch()} className="ml-auto px-4 py-2 rounded-xl bg-red-500 text-white text-[12px] font-bold hover:bg-red-600">
              Retry
            </button>
          </div>
        )}

        {/* ── Two-column: 6 KPIs (2×3 mobile) + Revenue chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <StatCard
              label="Total Stock Value"
              value={stats ? formatGHCCompact(stats.totalStockValue) : '—'}
              icon={DollarSign}
              variant="default"
              loading={!isWarehouseValid || (loading && !dashboard)}
            />
            <StatCard
              label="Total Products"
              value={stats?.totalProducts ?? '—'}
              icon={Package}
              variant="default"
              loading={!isWarehouseValid || (loading && !dashboard)}
            />
            <StatCard
              label="Total Units"
              value={stats?.totalUnits ?? '—'}
              icon={Layers}
              variant="default"
              loading={!isWarehouseValid || (loading && !dashboard)}
            />
            <StatCard
              label="Low Stock Items"
              value={stats != null ? stats.lowStockCount + stats.outOfStockCount : '—'}
              icon={AlertTriangle}
              variant={stats != null && stats.lowStockCount + stats.outOfStockCount > 0 ? 'amber' : 'default'}
              loading={!isWarehouseValid || (loading && !dashboard)}
            />
            <StatCard
              label="Today's Revenue"
              value={isWarehouseValid && (dashboard || salesByDay.length > 0) ? formatGHCCompact((todayRevenue || stats?.todaysSales) ?? 0) : '—'}
              icon={Receipt}
              variant="primary"
              loading={!isWarehouseValid || loadingAny}
            />
            <StatCard
              label="Today's Profit"
              value={isWarehouseValid ? formatGHCCompact(todayProfit) : '—'}
              icon={TrendingUp}
              variant="green"
              loading={!isWarehouseValid || salesLoading}
            />
          </div>
          <div className="min-h-0">
            <DashboardRevenueChart data={salesByDay} loading={isWarehouseValid && salesLoading} />
          </div>
        </div>

        {/* ── Low stock alerts (from API: GET /api/dashboard → lowStockItems) ── */}
        <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
                Stock Alerts
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {warehouseName} — products at or below reorder level
              </p>
            </div>
            {(() => {
              const items = dashboard?.lowStockItems ?? [];
              const outCount = items.filter((i) => i.quantity === 0).length;
              if (outCount === 0) return null;
              return (
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-500 text-[12px] font-bold border border-red-100">
                  {outCount} out of stock
                </span>
              );
            })()}
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse"/>
              ))}
            </div>
          ) : (
            <LowStockTable items={dashboard?.lowStockItems ?? []}/>
          )}
        </div>

        {/* ── Category breakdown ── */}
        {!loading && dashboard && dashboard.categorySummary && typeof dashboard.categorySummary === 'object' && Object.keys(dashboard.categorySummary).length > 0 && (
          <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-d)' }}>
                By Category
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{warehouseName}</p>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(dashboard.categorySummary)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([cat, { count, value }]) => (
                  <div key={cat} className="flex flex-col gap-1 p-3.5 rounded-lg border" style={{ background: 'var(--elevated)', borderColor: 'var(--border)' }}>
                    <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{cat}</span>
                    <span className="text-[18px] font-semibold" style={{ color: 'var(--text)', fontFamily: 'var(--font-m)' }}>{count} SKUs</span>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{formatGHC(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Mobile FAB: New sale (56px tap target; above bottom nav + safe-area) ── */}
        <Link
          to="/pos"
          className="lg:hidden fixed z-20 flex items-center justify-center w-14 h-14 rounded-full font-semibold text-sm shadow-lg border-2 border-white transition-transform active:scale-95 touch-manipulation"
          style={{
            bottom: 'calc(5rem + var(--safe-bottom))',
            right: 'max(1rem, var(--safe-right))',
            background: 'var(--blue)',
            color: '#0D1117',
            boxShadow: '0 4px 20px var(--blue-glow)',
          }}
          aria-label="New sale"
        >
          <ShoppingCart className="w-6 h-6" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
