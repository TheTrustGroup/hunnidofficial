// ============================================================
// DashboardPage.tsx
// File: warehouse-pos/src/pages/DashboardPage.tsx
//
// THE FIX: This replaces whatever Dashboard component was using
// "apiClient.ts:138" with a hardcoded Main Store warehouse_id.
//
// ROOT CAUSE OF THE BUG (confirmed from network tab):
//   Old dashboard: warehouse_id = hardcoded or stale ...0001 (Main Store)
//   UI label showed "Main Town" but data was still Main Store.
//
// HOW THIS FILE FIXES IT:
//   Reads warehouseId from WarehouseContext.
//   Every time warehouse changes → useEffect re-runs → fetches correct data.
//   Stats are computed from the fetched products (accurate, real numbers).
//   Today's sales are fetched from /api/sales filtered by warehouse + date.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { DollarSign, Package, AlertTriangle, Receipt, ShoppingCart, CheckCircle, RefreshCw } from 'lucide-react';
import { useWarehouse, KNOWN_WAREHOUSE_NAMES } from '../contexts/WarehouseContext';
import { getApiHeaders, API_BASE_URL } from '../lib/api';
import { INVENTORY_UPDATED_EVENT } from '../lib/inventoryEvents';

// ── Types (match GET /api/dashboard response) ──────────────────────────────

interface DashboardLowStockItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  quantityBySize: { sizeCode: string; quantity: number }[];
  reorderLevel: number;
}

interface DashboardCategorySummary {
  [category: string]: { count: number; value: number };
}

interface DashboardData {
  totalStockValue: number;
  totalUnits?: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todaySales: number;
  lowStockItems: DashboardLowStockItem[];
  categorySummary: DashboardCategorySummary;
}

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

// ── apiFetch (with retry for transient network failures) ───────────────────

const FETCH_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [1_000, 2_000];

/** Do not retry 401 — session expired; user must re-login. */
const SESSION_EXPIRED_MSG = 'Session expired. Please log in again.';

function isRetryableError(e: unknown): boolean {
  if (e instanceof Error) {
    const msg = e.message;
    if (msg.includes(SESSION_EXPIRED_MSG) || msg.includes('401') || msg.includes('Session expired')) return false;
    const lower = msg.toLowerCase();
    if (e.name === 'AbortError' || lower.includes('timeout')) return true;
    if (lower.includes('network') || lower.includes('connection') || lower.includes('failed to fetch')) return true;
  }
  return false;
}

async function apiFetchOnce<T = unknown>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const t    = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: getApiHeaders() as HeadersInit,
      signal:  ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) {
      if (res.status === 401) throw new Error(SESSION_EXPIRED_MSG);
      const b = await res.json().catch(() => ({}));
      throw new Error((b as { error?: string; message?: string }).error ?? (b as { error?: string; message?: string }).message ?? `HTTP ${res.status}`);
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : {}) as T;
  } catch (e: unknown) {
    clearTimeout(t);
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out');
    throw e;
  }
}

async function apiFetch<T = unknown>(path: string): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= RETRY_DELAYS_MS.length; i++) {
    try {
      return await apiFetchOnce<T>(path);
    } catch (e) {
      lastErr = e;
      if (i < RETRY_DELAYS_MS.length && isRetryableError(e)) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[i]));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

// ── Stat card (design system: white, 0.5px border, Bebas Neue value) ───

function DashboardStatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'green' | 'amber';
}) {
  const valueColor = variant === 'primary' ? 'var(--h-blue)' : variant === 'amber' ? 'var(--h-red)' : variant === 'green' ? 'var(--h-green)' : 'var(--h-gray-900)';
  return (
    <div
      className="relative rounded-[var(--radius-lg)] border overflow-hidden"
      style={{
        background: 'var(--h-white)',
        border: '0.5px solid var(--h-gray-200)',
        padding: '20px 24px',
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--h-gray-400)',
          fontFamily: 'var(--font-body)',
          marginBottom: 8,
        }}
      >
        {label}
      </p>
      <p
        className="tabular-nums leading-none min-w-0 truncate"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 36,
          color: valueColor,
        }}
        title={typeof value === 'string' ? value : String(value)}
      >
        {value}
      </p>
      {Icon && (
        <span className="absolute top-5 right-5 opacity-60" style={{ color: valueColor }} aria-hidden>
          <Icon size={20} strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

// ── Low stock table (uses pre-aggregated lowStockItems from API) ────────────

function LowStockTable({ items }: { items: DashboardLowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 px-3" style={{ color: 'var(--green)' }}>
        <CheckCircle className="w-5 h-5 flex-shrink-0" aria-hidden />
        <span className="text-[13px] font-semibold">All products are sufficiently stocked</span>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--h-gray-200)' }}>
      {items.map((p) => {
        const isOut = p.quantity === 0;
        return (
          <div
            key={p.id}
            className="flex items-center justify-between py-2.5 px-3 transition-colors hover:bg-[var(--h-gray-50)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}>{p.name}</p>
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>{p.category || 'Uncategorised'}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={
                  isOut
                    ? { background: 'var(--h-red-light)', color: 'var(--h-red)', letterSpacing: '0.04em' }
                    : { background: 'var(--h-amber-light)', color: 'var(--h-amber)', letterSpacing: '0.04em' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
                {isOut ? 'Out of stock' : `${p.quantity} left`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Warehouse IDs for "today by location" (match server DEFAULT_WAREHOUSE_IDS). Names from same source as dropdown. ───────

const WAREHOUSE_IDS_FOR_SUMMARY = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
] as const;

// ── Main component ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentWarehouseId, currentWarehouse, warehouses } = useWarehouse();
  const warehouseId   = currentWarehouseId;
  const warehouseName = currentWarehouse?.name ?? 'Warehouse';

  /** Name for "sales by location" — same source as sidebar/dropdown (warehouses from API, then KNOWN_WAREHOUSE_NAMES). */
  const locationNameForId = (wid: string) =>
    warehouses.find((w) => w.id === wid)?.name ?? KNOWN_WAREHOUSE_NAMES[wid] ?? wid;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayByWarehouse, setTodayByWarehouse] = useState<Record<string, number> | null>(null);
  const loadIdRef = useRef(0);

  const loadData = useCallback(async (wid: string, options?: { silent?: boolean; refresh?: boolean }) => {
    const silent = options?.silent === true;
    const refresh = options?.refresh === true;
    const myId = ++loadIdRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
      setDashboard(null);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const qs = `warehouse_id=${encodeURIComponent(wid)}&date=${today}${refresh ? '&refresh=1' : ''}`;
      const data = await apiFetch<DashboardData>(
        `/api/dashboard?${qs}`
      );
      if (myId !== loadIdRef.current) return;
      setDashboard(data);
    } catch (e: unknown) {
      if (myId !== loadIdRef.current) return;
      const msg = e instanceof Error ? e.message : 'Failed to load dashboard data';
      if (msg === SESSION_EXPIRED_MSG) {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('current_user');
          localStorage.removeItem('auth_token');
        }
        navigate('/login?session_expired=1', { replace: true });
        return;
      }
      setError(msg);
    } finally {
      if (myId === loadIdRef.current) setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData(warehouseId);
  }, [warehouseId, loadData]);

  // Refetch when inventory changes (e.g. POS sale, order deduct). Silent = keep showing current digits until new data arrives.
  useEffect(() => {
    const onInventoryUpdated = () => loadData(warehouseId, { silent: true });
    window.addEventListener(INVENTORY_UPDATED_EVENT, onInventoryUpdated);
    return () => window.removeEventListener(INVENTORY_UPDATED_EVENT, onInventoryUpdated);
  }, [warehouseId, loadData]);

  // When user switches back to this tab, refetch at most once per 5s. Silent = no flash of loading or old digits.
  const lastVisibilityRefetchRef = useRef<number>(0);
  const VISIBILITY_REFETCH_MS = 5000;
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRefetchRef.current < VISIBILITY_REFETCH_MS) return;
      lastVisibilityRefetchRef.current = now;
      loadData(warehouseId, { silent: true });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [warehouseId, loadData]);

  // Today's sales per warehouse (super-admin at-a-glance; one lightweight request).
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    let cancelled = false;
    apiFetch<Record<string, number>>(`/api/dashboard/today-by-warehouse?date=${today}`)
      .then((data) => { if (!cancelled) setTodayByWarehouse(data); })
      .catch(() => { if (!cancelled) setTodayByWarehouse(null); });
    return () => { cancelled = true; };
  }, []);

  const stats = dashboard
    ? {
        totalStockValue: dashboard.totalStockValue,
        totalProducts: dashboard.totalProducts,
        lowStockCount: dashboard.lowStockCount,
        outOfStockCount: dashboard.outOfStockCount,
        todaysSales: dashboard.todaySales,
      }
    : null;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-3 sm:p-4" style={{ background: 'var(--h-cream)' }}>
      <div className="max-w-5xl mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1
                className="tracking-[0.04em]"
                style={{ fontFamily: 'var(--font-display)', fontSize: 30, color: 'var(--h-gray-900)' }}
              >
                DASHBOARD
              </h1>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--h-blue-light)', color: 'var(--h-blue)', letterSpacing: '0.04em' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--h-blue)]" aria-hidden />
                Super Admin
              </span>
            </div>
            <p className="text-[13px] mb-5" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
              Full system access — inventory, POS, records, users &amp; settings.
            </p>
          </div>

          <a
            href="/pos"
            className="flex items-center gap-1.5 h-10 px-5 rounded-[var(--radius-md)] text-white text-[14px] font-medium transition-colors hover:opacity-95"
            style={{ background: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}
          >
            <ShoppingCart className="w-4 h-4" aria-hidden />
            New sale
          </a>
        </div>

        {/* ── Warehouse label + Recalculate ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--h-green)]" aria-hidden />
            <p className="text-[12px] font-medium" style={{ color: 'var(--h-gray-500)', fontFamily: 'var(--font-body)' }}>
              Inventory stats for:{' '}
              <span className="font-semibold" style={{ color: 'var(--h-gray-900)' }}>{warehouseName}</span>
            </p>
            {loading && (
              <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
                <span className="loading-spinner-ring loading-spinner-ring-sm shrink-0" aria-hidden />
                Loading…
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => loadData(warehouseId, { refresh: true })}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors disabled:opacity-50"
            style={{ border: '0.5px solid var(--h-gray-300)', background: 'transparent', color: 'var(--h-gray-700)', fontFamily: 'var(--font-body)' }}
            title="Recalculate totals from database (bypasses cache)"
          >
            <RefreshCw className="w-3 h-3" aria-hidden />
            Recalculate stats
          </button>
        </div>

        {/* ── Today's sales by location ── */}
        <div
          className="rounded-[var(--radius-lg)] border p-4"
          style={{ background: 'var(--h-white)', border: '0.5px solid var(--h-gray-200)' }}
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
            Today&apos;s sales by location
          </h2>
          <div className="flex flex-wrap gap-3">
            {WAREHOUSE_IDS_FOR_SUMMARY.map((wid) => (
              <div key={wid} className="flex items-center gap-2">
                <span className="text-[12px] font-medium" style={{ color: 'var(--h-gray-500)', fontFamily: 'var(--font-body)' }}>
                  {locationNameForId(wid)}
                </span>
                <span
                  className="text-[14px] font-semibold tabular-nums"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--h-blue)' }}
                >
                  {todayByWarehouse == null
                    ? '—'
                    : formatGHCCompact(todayByWarehouse[wid] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Error ── */}
        {error && !loading && (
          <div
            className="flex items-center gap-2 p-3 rounded-[var(--radius-lg)] border"
            style={{ background: 'var(--h-red-light)', border: '0.5px solid var(--h-gray-200)' }}
          >
            <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--h-red)' }} aria-hidden />
            <div>
              <p className="text-[13px] font-semibold" style={{ color: 'var(--h-red)', fontFamily: 'var(--font-body)' }}>Failed to load data</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--h-red)', fontFamily: 'var(--font-body)' }}>{error}</p>
            </div>
            <button
              onClick={() => loadData(warehouseId)}
              className="ml-auto px-4 py-2 rounded-[var(--radius-md)] text-white text-[12px] font-semibold"
              style={{ background: 'var(--h-blue)', fontFamily: 'var(--font-body)' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <DashboardStatCard
            label="STOCK VALUE"
            value={loading || !stats ? '—' : formatGHCCompact(stats.totalStockValue)}
            icon={DollarSign}
            variant="primary"
          />
          <DashboardStatCard
            label="PRODUCTS"
            value={loading || !stats ? '—' : stats.totalProducts}
            icon={Package}
            variant="default"
          />
          <DashboardStatCard
            label="LOW STOCK"
            value={loading || !stats ? '—' : stats.lowStockCount + stats.outOfStockCount}
            icon={AlertTriangle}
            variant={stats && stats.lowStockCount + stats.outOfStockCount > 0 ? 'amber' : 'default'}
          />
          <DashboardStatCard
            label="TODAY'S SALES"
            value={loading || !stats ? '—' : formatGHCCompact(stats.todaysSales)}
            icon={Receipt}
            variant="primary"
          />
        </div>

        {/* ── Low stock alerts ── */}
        <div
          className="rounded-[var(--radius-lg)] border overflow-hidden"
          style={{ background: 'var(--h-white)', border: '0.5px solid var(--h-gray-200)' }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderBottom: '0.5px solid var(--h-gray-200)' }}
          >
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}>Stock Alerts</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>
                {warehouseName} — products at or below reorder level
              </p>
            </div>
            {stats && stats.outOfStockCount > 0 && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--h-red-light)', color: 'var(--h-red)', letterSpacing: '0.04em' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--h-red)]" aria-hidden />
                {stats.outOfStockCount} out of stock
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--overlay)' }}/>
              ))}
            </div>
          ) : (
            <LowStockTable items={dashboard?.lowStockItems ?? []}/>
          )}
        </div>

        {/* ── Category breakdown ── */}
        {!loading && dashboard && Object.keys(dashboard.categorySummary).length > 0 && (
          <div
            className="rounded-[var(--radius-lg)] border overflow-hidden"
            style={{ background: 'var(--h-white)', border: '0.5px solid var(--h-gray-200)' }}
          >
            <div className="px-4 py-3 border-b" style={{ borderBottom: '0.5px solid var(--h-gray-200)' }}>
              <h2 className="text-[14px] font-semibold" style={{ color: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}>By Category</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>{warehouseName}</p>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(dashboard.categorySummary)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([cat, { count, value }]) => (
                  <div
                    key={cat}
                    className="flex flex-col gap-0.5 p-3 rounded-[var(--radius-md)] border"
                    style={{ background: 'var(--h-gray-50)', border: '0.5px solid var(--h-gray-200)' }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--h-gray-400)', fontFamily: 'var(--font-body)' }}>{cat}</span>
                    <span className="text-[16px] font-semibold" style={{ color: 'var(--h-gray-900)', fontFamily: 'var(--font-body)' }}>{count} SKUs</span>
                    <span className="text-[10px] font-medium" style={{ fontFamily: 'var(--font-body)', color: 'var(--h-blue)' }}>{formatGHC(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
