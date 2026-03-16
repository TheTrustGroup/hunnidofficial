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
import { DollarSign, Package, AlertTriangle, Receipt, ShoppingCart, CheckCircle } from 'lucide-react';
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

const MOBILE_BREAKPOINT = 768;
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

/** Mobile-only stat card: rounded-xl, 10px label, 26px value, blue/default/red. */
function DashboardStatCardMobile({
  label,
  value,
  variant = 'default',
  valueColor,
  loading,
}: {
  label: string;
  value: string | number;
  variant?: 'blue' | 'default';
  valueColor?: 'red' | 'blue';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border-[0.5px] border-[#E0DED8] bg-white p-3 animate-pulse">
        <div className="h-3 w-16 bg-[#E0DED8] rounded mb-1.5" />
        <div className="h-7 w-20 bg-[#E0DED8] rounded" />
      </div>
    );
  }
  return (
    <div
      className={`rounded-xl border-[0.5px] p-3 ${
        variant === 'blue'
          ? 'bg-[#1B6FE8] border-[#1B6FE8]'
          : 'bg-white border-[#E0DED8]'
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.08em] mb-1.5 ${
          variant === 'blue' ? 'text-white/70' : 'text-[#9B9890]'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-[26px] leading-none font-semibold ${
          variant === 'blue'
            ? 'text-white'
            : valueColor === 'blue'
              ? 'text-[#1B6FE8]'
              : valueColor === 'red'
                ? 'text-[#E83B2E]'
                : 'text-[#1A1916]'
        }`}
        style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
      >
        {value}
      </p>
    </div>
  );
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

// ── Stat card (light theme: primary = blue block, others = white with token colors) ───

function StatCard({
  label,
  value,
  icon: Icon,
  primary = false,
  revenue = false,
  warning = false,
  danger = false,
}: {
  label:   string;
  value:   string | number;
  icon:    LucideIcon;
  primary?: boolean;
  revenue?: boolean;
  warning?: boolean;
  danger?:  boolean;
}) {
  const isPrimary = primary;
  const valColor = isPrimary
    ? 'white'
    : danger
      ? 'var(--red-status)'
      : warning
        ? 'var(--amber)'
        : revenue
          ? 'var(--blue)'
          : 'var(--text)';

  const iconWrapBg = isPrimary
    ? 'rgba(255,255,255,0.15)'
    : danger
      ? 'var(--red-dim)'
      : warning
        ? 'var(--amber-dim)'
        : revenue
          ? 'var(--blue-dim)'
          : 'var(--overlay)';

  const iconColor = isPrimary ? 'white' : revenue ? 'var(--blue)' : warning ? 'var(--amber)' : danger ? 'var(--red-status)' : 'var(--text-2)';

  return (
    <div
      className="flex flex-col justify-between p-6 rounded-[14px] border transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
      style={{
        background: isPrimary ? 'var(--blue)' : 'var(--surface)',
        borderColor: isPrimary ? 'var(--blue)' : 'var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[13px] font-semibold"
          style={{ color: isPrimary ? 'rgba(255,255,255,0.9)' : 'var(--text-2)' }}
        >
          {label}
        </span>
        <span
          className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconWrapBg }}
        >
          <Icon size={22} style={{ color: iconColor }} aria-hidden />
        </span>
      </div>
      <p
        className="tabular-nums leading-none min-w-0 truncate"
        style={{
          fontFamily: 'var(--font-m)',
          fontSize: '24px',
          fontWeight: 600,
          color: valColor,
        }}
        title={typeof value === 'string' ? value : String(value)}
      >
        {value}
      </p>
    </div>
  );
}

// ── Low stock table (uses pre-aggregated lowStockItems from API) ────────────

function LowStockTable({ items }: { items: DashboardLowStockItem[] }) {
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-3 py-6 px-4" style={{ color: 'var(--green)' }}>
        <CheckCircle className="w-6 h-6 flex-shrink-0" aria-hidden />
        <span className="text-[14px] font-semibold">All products are sufficiently stocked</span>
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {items.map((p) => {
        const isOut = p.quantity === 0;
        return (
          <div
            key={p.id}
            className="flex items-center justify-between py-3.5 px-4 transition-colors hover:bg-[var(--elevated)]"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold truncate" style={{ color: 'var(--text)' }}>{p.name}</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-3)' }}>{p.category || 'Uncategorised'}</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-bold border"
                style={
                  isOut
                    ? { background: 'var(--red-dim)', color: 'var(--red-status)', borderColor: 'rgba(220,38,38,0.2)' }
                    : { background: 'var(--amber-dim)', color: 'var(--amber)', borderColor: 'rgba(217,119,6,0.2)' }
                }
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"/>
                {isOut ? 'Out of stock' : `${p.quantity} left`}
              </div>
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
  const isMobile = useIsMobile();
  const { currentWarehouseId, currentWarehouse, warehouses } = useWarehouse();
  const warehouseId   = currentWarehouseId;
  const warehouseName = currentWarehouse?.name ?? 'Warehouse';
  const firstTwoWarehouses = warehouses.slice(0, 2);

  /** Name for "sales by location" — same source as sidebar/dropdown (warehouses from API, then KNOWN_WAREHOUSE_NAMES). */
  const locationNameForId = (wid: string) =>
    warehouses.find((w) => w.id === wid)?.name ?? KNOWN_WAREHOUSE_NAMES[wid] ?? wid;

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayByWarehouse, setTodayByWarehouse] = useState<Record<string, number> | null>(null);
  const loadIdRef = useRef(0);

  const loadData = useCallback(async (wid: string, options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    const myId = ++loadIdRef.current;

    if (!silent) {
      setLoading(true);
      setError(null);
      setDashboard(null);
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiFetch<DashboardData>(
        `/api/dashboard?warehouse_id=${encodeURIComponent(wid)}&date=${today}`
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

  const statLoading = loading && !dashboard;

  return (
    <div className="min-h-screen p-3 sm:p-6" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">

        {/* ── Header: mobile = DASHBOARD + subtitle + New sale; desktop = Admin Control Panel ── */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
          <div>
            <h1
              className="text-[26px] sm:text-[24px] font-black tracking-tight"
              style={{
                color: 'var(--text)',
                fontFamily: isMobile ? "'Barlow Condensed', sans-serif" : undefined,
                letterSpacing: isMobile ? '0.04em' : undefined,
              }}
            >
              {isMobile ? 'DASHBOARD' : 'Admin Control Panel'}
            </h1>
            <p className="text-[12px] sm:text-[13px] mt-0.5" style={{ color: 'var(--text-2)' }}>
              {isMobile ? `${warehouseName} · Dashboard` : 'Full system access — inventory, POS, reports, users & settings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/pos')}
            className="flex items-center gap-2 h-10 px-4 sm:px-5 rounded-xl text-white text-[13px] sm:text-[14px] font-bold transition-all hover:-translate-y-px mt-1"
            style={{ background: 'var(--blue)', boxShadow: '0 2px 8px var(--blue-glow)' }}
          >
            <ShoppingCart className="w-5 h-5" aria-hidden />
            New sale
          </button>
        </div>

        {!isMobile && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]"/>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>
              Inventory stats for:{' '}
              <span className="font-black" style={{ color: 'var(--text)' }}>{warehouseName}</span>
            </p>
            {loading && (
              <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-3)' }}>
                <span className="loading-spinner-ring loading-spinner-ring-sm shrink-0" aria-hidden />
                Loading…
              </span>
            )}
          </div>
        )}

        {/* ── Today's sales by location: mobile = compact card; desktop = full ── */}
        {isMobile && firstTwoWarehouses.length > 0 ? (
          <div className="bg-white rounded-2xl border border-[#E0DED8] p-3 mb-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9B9890] mb-2">
              Today&apos;s Sales by Location
            </p>
            <div className="flex gap-6">
              {firstTwoWarehouses.map((w) => {
                const amount = todayByWarehouse?.[w.id] ?? 0;
                const hasSales = !loading && amount > 0;
                return (
                  <div key={w.id}>
                    <p className="text-[11px] text-[#9B9890]">{w.name}</p>
                    <p className={`text-[15px] font-semibold ${hasSales ? 'text-[#1B6FE8]' : 'text-[#9B9890]'}`}>
                      {loading ? '—' : formatGHCCompact(amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
        <div
          className="rounded-[14px] border p-5 shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <h2 className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
            Today&apos;s sales by location
          </h2>
          <div className="flex flex-wrap gap-4">
            {WAREHOUSE_IDS_FOR_SUMMARY.map((wid) => (
              <div key={wid} className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-2)' }}>
                  {locationNameForId(wid)}
                </span>
                <span
                  className="text-[15px] font-black tabular-nums"
                  style={{ fontFamily: 'var(--font-m)', color: 'var(--blue)' }}
                >
                  {todayByWarehouse == null
                    ? '—'
                    : formatGHCCompact(todayByWarehouse[wid] ?? 0)}
                </span>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div
            className="flex items-center gap-3 p-4 rounded-[14px] border"
            style={{ background: 'var(--red-dim)', borderColor: 'rgba(220,38,38,0.2)' }}
          >
            <AlertTriangle className="w-6 h-6 flex-shrink-0" style={{ color: 'var(--red-status)' }} aria-hidden />
            <div>
              <p className="text-[14px] font-bold" style={{ color: 'var(--red-status)' }}>Failed to load data</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--red-status)' }}>{error}</p>
            </div>
            <button
              onClick={() => loadData(warehouseId)}
              className="ml-auto px-4 py-2 rounded-xl text-white text-[12px] font-bold"
              style={{ background: 'var(--blue)' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ── Stat cards: mobile 2×2 with mobile spec; desktop 4-column ── */}
        {isMobile ? (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <DashboardStatCardMobile
              label="Stock Value"
              value={stats ? formatGHCCompact(stats.totalStockValue) : '—'}
              variant="blue"
              loading={statLoading}
            />
            <DashboardStatCardMobile
              label="Products"
              value={stats?.totalProducts ?? '—'}
              loading={statLoading}
            />
            <DashboardStatCardMobile
              label="Low Stock"
              value={stats ? stats.lowStockCount + stats.outOfStockCount : '—'}
              valueColor="red"
              loading={statLoading}
            />
            <DashboardStatCardMobile
              label="Today's Sales"
              value={stats ? formatGHCCompact(stats.todaysSales) : '—'}
              valueColor="blue"
              loading={statLoading}
            />
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Stock Value"
            value={loading || !stats ? '—' : formatGHCCompact(stats.totalStockValue)}
            icon={DollarSign}
            primary
          />
          <StatCard
            label="Total Products"
            value={loading || !stats ? '—' : stats.totalProducts}
            icon={Package}
          />
          <StatCard
            label="Low Stock Items"
            value={loading || !stats ? '—' : stats.lowStockCount + stats.outOfStockCount}
            icon={AlertTriangle}
            warning={stats ? stats.lowStockCount + stats.outOfStockCount > 0 : false}
          />
          <StatCard
            label="Today's Sales"
            value={loading || !stats ? '—' : formatGHCCompact(stats.todaysSales)}
            icon={Receipt}
            revenue
          />
        </div>
        )}

        {/* ── Low stock alerts ── */}
        <div
          className="rounded-[14px] border overflow-hidden shadow-[var(--shadow-sm)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div
            className="flex items-center justify-between px-5 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="text-[15px] font-black" style={{ color: 'var(--text)' }}>Stock Alerts</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {warehouseName} — products at or below reorder level
              </p>
            </div>
            {stats && stats.outOfStockCount > 0 && (
              <span
                className="px-3 py-1 rounded-full text-[12px] font-bold border"
                style={{ background: 'var(--red-dim)', color: 'var(--red-status)', borderColor: 'rgba(220,38,38,0.2)' }}
              >
                {stats.outOfStockCount} out of stock
              </span>
            )}
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: 'var(--overlay)' }}/>
              ))}
            </div>
          ) : (
            <LowStockTable items={dashboard?.lowStockItems ?? []}/>
          )}
        </div>

        {/* ── Category breakdown ── */}
        {!loading && dashboard && Object.keys(dashboard.categorySummary).length > 0 && (
          <div
            className="rounded-[14px] border overflow-hidden shadow-[var(--shadow-sm)]"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <h2 className="text-[15px] font-black" style={{ color: 'var(--text)' }}>By Category</h2>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-3)' }}>{warehouseName}</p>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(dashboard.categorySummary)
                .sort((a, b) => b[1].value - a[1].value)
                .map(([cat, { count, value }]) => (
                  <div
                    key={cat}
                    className="flex flex-col gap-1 p-3.5 rounded-xl border"
                    style={{ background: 'var(--elevated)', borderColor: 'var(--border)' }}
                  >
                    <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>{cat}</span>
                    <span className="text-[18px] font-black" style={{ color: 'var(--text)' }}>{count} SKUs</span>
                    <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-m)', color: 'var(--blue)' }}>{formatGHC(value)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
