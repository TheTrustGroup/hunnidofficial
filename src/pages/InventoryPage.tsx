// ============================================================
// InventoryPage.tsx
// File: warehouse-pos/src/pages/InventoryPage.tsx
//
// World-class inventory dashboard. Design principles:
//   • Summary stat bar at top (total SKUs, total stock value, low/out alerts)
//   • Clean sticky header — warehouse selector + ONE search + Add button
//   • Category filter chips + sort — no clutter
//   • Cards show stock bar, size breakdown, price — no inline edit, no duplicates
//   • All working logic preserved exactly: retry, poll, abort, optimistic updates,
//     lastSaveTimeRef guard, pendingDeletesRef, size-wipe guard
// ============================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard, { ProductCardSkeleton, type Product } from '../components/inventory/ProductCard';
import ProductModal from '../components/inventory/ProductModal';
import { type SizeCode } from '../components/inventory/SizesSection';
import { getApiHeaders, API_BASE_URL } from '../lib/api';
import { useWarehouse } from '../contexts/WarehouseContext';
import type { Warehouse } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────

type FilterKey = 'all' | string;
type SortKey   = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'stock_asc' | 'stock_desc';

interface InventoryPageProps {}

// ── Constants ─────────────────────────────────────────────────────────────

const POLL_MS     = 30_000;
const PAGE_SIZE   = 50;
const SEARCH_DEBOUNCE_MS = 300;
const CATEGORIES  = ['Sneakers', 'Slippers', 'Boots', 'Sandals', 'Accessories'];
/** Common colors for filter chips (admin + POS). Uncategorized = products with no color (after backfill). */
const COLOR_OPTIONS = ['Black', 'White', 'Red', 'Blue', 'Brown', 'Green', 'Grey', 'Navy', 'Beige', 'Multi', 'Uncategorized'];
/** Fallback list when WarehouseContext has not yet loaded. IDs must match backend. */
const FALLBACK_WAREHOUSES: Pick<Warehouse, 'id' | 'name'>[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Main Jeff' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Hunnid Main' },
];

// ── Stat helpers ──────────────────────────────────────────────────────────

function getProductQty(p: Product): number {
  if (p.sizeKind === 'sized' && p.quantityBySize?.length > 0) {
    return p.quantityBySize.reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return p.quantity ?? 0;
}

function computeStats(products: Product[]) {
  let totalValue = 0;
  let totalUnits = 0;
  let lowCount   = 0;
  let outCount   = 0;

  for (const p of products) {
    const qty     = getProductQty(p);
    const reorder = p.reorderLevel ?? 3;
    totalUnits += qty;
    totalValue += qty * (p.sellingPrice ?? 0);
    if (qty === 0) outCount++;
    else if (qty <= reorder) lowCount++;
  }

  return { totalValue, totalUnits, lowCount, outCount };
}

function formatGHC(n: number): string {
  if (n >= 1_000_000) return 'GH₵ ' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return 'GH₵ ' + (n / 1_000).toFixed(1) + 'K';
  return 'GH₵ ' + n.toLocaleString('en-GH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ── Filter/sort ───────────────────────────────────────────────────────────

/** Client-side sort only (filtering is server-side via q and category). */
function applySort(products: Product[], sort: SortKey): Product[] {
  const r = [...products];
  r.sort((a, b) => {
    const qa = getProductQty(a), qb = getProductQty(b);
    switch (sort) {
      case 'name_asc':   return a.name.localeCompare(b.name);
      case 'name_desc':  return b.name.localeCompare(a.name);
      case 'price_asc':  return a.sellingPrice - b.sellingPrice;
      case 'price_desc': return b.sellingPrice - a.sellingPrice;
      case 'stock_asc':  return qa - qb;
      case 'stock_desc': return qb - qa;
      default:           return 0;
    }
  });
  return r;
}

/** Ensure quantityBySize is always an array (API/view may return scalar). */
function normalizeQuantityBySize(p: Record<string, unknown>): Product {
  const qbs = p['quantityBySize'] ?? p['quantity_by_size'];
  const arr = Array.isArray(qbs) ? qbs : [];
  return { ...p, quantityBySize: arr } as Product;
}

function unwrapProduct(raw: unknown): Product | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const inner = r.data ?? r.product ?? r;
  if (!inner || typeof inner !== 'object' || !('id' in inner)) return null;
  return normalizeQuantityBySize(inner as Record<string, unknown>);
}

/** Normalize a raw list item so name, sku, barcode, color are always set (API may send camel or snake). */
function normalizeListProduct(item: Record<string, unknown>): Product {
  const getStr = (camel: string, snake?: string) =>
    String(item[camel] ?? item[snake ?? ''] ?? '').trim();
  const colorVal = item['color'] != null ? getStr('color') || null : null;
  return normalizeQuantityBySize({
    ...item,
    name: getStr('name', 'product_name') || getStr('name'),
    sku: getStr('sku'),
    barcode: getStr('barcode') || null,
    category: getStr('category') || 'Uncategorized',
    color: colorVal,
  } as Record<string, unknown>);
}

/** Parse GET /api/products response: { data, total } → { list, total }. */
function parseListResponse(raw: unknown): { list: Product[]; total: number } {
  if (!raw || typeof raw !== 'object') return { list: [], total: 0 };
  const r = raw as Record<string, unknown>;
  const list = r.data ?? r.products ?? r.items ?? [];
  const total = typeof r.total === 'number' ? r.total : Array.isArray(list) ? list.length : 0;
  if (!Array.isArray(list)) return { list: [], total };
  const normalized = list
    .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object')
    .map(normalizeListProduct);
  return { list: normalized, total };
}

// ── Toast ─────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: string; message: string; type: ToastType; }

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const styles: Record<ToastType, string> = {
    success: 'border-l-emerald-500',
    error:   'border-l-red-500',
    info:    'border-l-blue-500',
  };
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white
                      text-[13px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.25)]
                      border-l-[3px] ${styles[t.type]} min-w-[220px] max-w-[340px]
                      animate-[toastIn_0.35s_cubic-bezier(0.34,1.56,0.64,1)]`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────

function DeleteDialog({
  product, onConfirm, onCancel
}: { product: Product; onConfirm: () => void; onCancel: () => void; }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onCancel}/>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-[28px]
                      shadow-[0_-8px_48px_rgba(0,0,0,0.15)] px-5 pt-5 pb-10
                      animate-[sheetUp_0.3s_cubic-bezier(0.34,1.1,0.64,1)]">
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mb-6"/>
        <div className="flex items-start gap-4 mb-7">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </div>
          <div>
            <p className="text-[17px] font-black text-slate-900">Delete product?</p>
            <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
              <span className="font-semibold text-slate-800">&quot;{product.name}&quot;</span> will be
              permanently removed from inventory. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
                  className="flex-1 h-[52px] rounded-2xl border-[1.5px] border-slate-200
                             text-[15px] font-bold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
                  className="flex-1 h-[52px] rounded-2xl bg-red-500 hover:bg-red-600
                             text-[15px] font-bold text-white transition-colors
                             shadow-[0_4px_16px_rgba(239,68,68,0.3)]">
            Delete
          </button>
        </div>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent = false, warning = false,
}: {
  label:    string;
  value:    string | number;
  sub?:     string;
  accent?:  boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`flex-1 min-w-0 px-4 py-4 rounded-[10px] border flex flex-col gap-0.5 shadow-[0_1px_3px_rgba(13,17,23,0.06),0_1px_2px_rgba(13,17,23,0.04)]
        ${accent
          ? 'border-transparent text-white'
          : warning
            ? 'bg-[#FFFBEB] border-[rgba(217,119,6,0.15)]'
            : 'bg-white border-[rgba(0,0,0,0.07)] text-[#0D1117]'}`}
      style={
        accent
          ? {
              background: 'linear-gradient(135deg, #5CACFA 0%, #1A7DD4 100%)',
              boxShadow: '0 4px 20px rgba(92,172,250,0.35)',
            }
          : undefined
      }
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.16em]
          ${accent ? 'text-white/70' : warning ? 'text-[#D97706]' : 'text-[#8892A0]'}`}
      >
        {label}
      </p>
      <p
        className="tabular-nums leading-tight truncate"
        style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          ...(accent ? { color: 'white' } : warning ? { color: '#D97706' } : {}),
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-[11px] mt-1 ${accent ? 'text-white/65' : warning ? 'text-[#D97706]/70' : 'text-[#8892A0]'}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const BoxIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

// ── Main Page ──────────────────────────────────────────────────────────────

export default function InventoryPage(_props: InventoryPageProps) {

  // ── Warehouse from context (SINGLE SOURCE OF TRUTH) ──────────────────────
  const {
    currentWarehouseId: warehouseId,
    currentWarehouse,
    warehouses: contextWarehouses,
  } = useWarehouse();
  const warehouseList = contextWarehouses?.length ? contextWarehouses : FALLBACK_WAREHOUSES;
  const warehouse = currentWarehouse ?? warehouseList.find(w => w.id === warehouseId) ?? warehouseList[0];

  // ── State ─────────────────────────────────────────────────────────────────
  const [products,       setProducts]       = useState<Product[]>([]);
  const [totalCount,     setTotalCount]     = useState(0);
  const [sizeCodes,      setSizeCodes]      = useState<SizeCode[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingMore,    setLoadingMore]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [searchParams,   setSearchParams]   = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const setSearch = useCallback((value: string) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value.trim()) p.set('q', value.trim());
      else p.delete('q');
      return p;
    }, { replace: true });
  }, [setSearchParams]);
  const [category,       setCategory]       = useState<FilterKey>('all');
  const [sizeFilter,     setSizeFilter]     = useState<string>('all');
  const [colorFilter,    setColorFilter]    = useState<string>('all');
  const [sort,           setSort]           = useState<SortKey>('name_asc');
  const [sortOpen,       setSortOpen]       = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [confirmDelete,  setConfirmDelete]  = useState<Product | null>(null);
  const [warehouseStats,   setWarehouseStats] = useState<{ totalStockValue: number; totalUnits: number } | null>(null);

  const modalOpenRef       = useRef(false);
  const pollTimerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingDeletesRef  = useRef<Set<string>>(new Set());
  const loadInflightRef    = useRef(false);
  const lastSaveTimeRef    = useRef<number>(0);
  const loadAbortRef       = useRef<AbortController | null>(null);
  const didInitialLoad     = useRef(false);
  const productsLengthRef  = useRef(0);
  const searchDebounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchCategoryRef   = useRef({ search: '', category: 'all' as FilterKey, sizeCode: 'all' as string, color: 'all' as string });
  const skipSearchDebounceRef = useRef(true);
  searchCategoryRef.current = { search, category, sizeCode: sizeFilter, color: colorFilter };
  productsLengthRef.current = products.length;

  const { toasts, show: showToast } = useToast();

  // Derived stats (memoised — recompute only when products change). Uses selling price for selection value.
  const stats = useMemo(() => computeStats(products), [products]);

  // Warehouse-level totals (cost-based, single source of truth from DB). Fetched for "Total stock value" when no filter.
  const hasFilter = (search?.trim() ?? '') !== '' || category !== 'all' || sizeFilter !== 'all' || colorFilter !== 'all';

  // ── apiFetch (retry + abort) ──────────────────────────────────────────────

  const apiFetch = useCallback(async <T = unknown>(
    path: string,
    init?: RequestInit & { signal?: AbortSignal },
    _retryCount = 0
  ): Promise<T> => {
    const isReadOnly  = !init?.method || init.method === 'GET';
    const timeoutCtrl = new AbortController();
    const timeout     = setTimeout(() => timeoutCtrl.abort(), 20_000);

    let mergedSignal = timeoutCtrl.signal;
    if (init?.signal) {
      const m = new AbortController();
      init.signal.addEventListener('abort', () => m.abort());
      timeoutCtrl.signal.addEventListener('abort', () => m.abort());
      mergedSignal = m.signal;
    }

    try {
      const headers = new Headers(getApiHeaders() as HeadersInit);
      if (init?.headers) {
        new Headers(init.headers as HeadersInit).forEach((v, k) => headers.set(k, v));
      }

      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        signal: mergedSignal,
        credentials: 'include',
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg  = (body as { message?: string; error?: string }).message ?? (body as { error?: string }).error ?? `HTTP ${res.status}`;
        const e    = new Error(msg) as Error & { status: number };
        e.status   = res.status;
        throw e;
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;

    } catch (e: unknown) {
      clearTimeout(timeout);
      const err = e as Error & { status?: number };
      if (err.name === 'AbortError' && init?.signal?.aborted) throw e;
      const isNetErr = err.name === 'AbortError' || err.name === 'TypeError' ||
                       err.message?.includes('Failed to fetch') ||
                       err.message?.includes('network connection was lost');
      if (isReadOnly && isNetErr && _retryCount < 3) {
        const delay = (2 ** _retryCount) * 800;
        await new Promise(r => setTimeout(r, delay));
        return apiFetch(path, init, _retryCount + 1);
      }
      if (err.name === 'AbortError') throw new Error('Request timed out — check your connection');
      throw e;
    }
  }, []);

  // ── Load products (server-side q + category; paginated) ───────────────────

  const loadProducts = useCallback(async (offset: number, append: boolean, silent = false, requestLimit?: number) => {
    if (modalOpenRef.current) return;
    if (loadInflightRef.current) {
      if (silent) return;
      loadAbortRef.current?.abort();
    }

    const { search: q, category: cat, sizeCode: sc, color: col } = searchCategoryRef.current;
    const limit = requestLimit ?? PAGE_SIZE;
    const params = new URLSearchParams();
    params.set('warehouse_id', warehouseId);
    params.set('limit', String(limit));
    params.set('offset', String(Math.max(0, offset)));
    if (q.trim()) params.set('q', q.trim());
    if (cat !== 'all' && cat.trim()) params.set('category', cat.trim());
    if (sc !== 'all' && sc.trim()) params.set('size_code', sc.trim());
    if (col !== 'all' && col.trim()) params.set('color', col.trim());

    const ctrl = new AbortController();
    loadAbortRef.current    = ctrl;
    loadInflightRef.current = true;
    if (!silent) {
      if (append) setLoadingMore(true);
      else setLoading(true);
    }
    setError(null);

    try {
      const raw = await apiFetch<unknown>(`/api/products?${params.toString()}`, {
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const { list, total } = parseListResponse(raw);
      const pending = pendingDeletesRef.current;
      const merged = pending.size > 0 ? list.filter(p => !pending.has(p.id)) : list;
      setTotalCount(total);
      if (append) {
        setProducts(prev => {
          const byId = new Map(prev.map(p => [p.id, p]));
          merged.forEach(p => byId.set(p.id, p));
          return Array.from(byId.values());
        });
      } else {
        setProducts(merged);
      }
    } catch (e: unknown) {
      const err = e as Error;
      if (err.name === 'AbortError' || ctrl.signal.aborted) return;
      if (!silent) setError(err.message ?? 'Failed to load products');
    } finally {
      if (loadAbortRef.current === ctrl) {
        loadInflightRef.current = false;
        loadAbortRef.current    = null;
      }
      if (!silent) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  }, [warehouseId, apiFetch]);

  // Warehouse-level totals (cost-based) for "Total stock value" when no filter. Same source as Dashboard.
  useEffect(() => {
    if (!warehouseId) {
      setWarehouseStats(null);
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    apiFetch<{ totalStockValue?: number; totalUnits?: number }>(
      `/api/dashboard?warehouse_id=${encodeURIComponent(warehouseId)}&date=${today}`
    )
      .then((data) => {
        if (data && typeof data.totalStockValue === 'number') {
          setWarehouseStats({
            totalStockValue: data.totalStockValue,
            totalUnits: typeof data.totalUnits === 'number' ? data.totalUnits : 0,
          });
        } else {
          setWarehouseStats(null);
        }
      })
      .catch(() => setWarehouseStats(null));
  }, [warehouseId, apiFetch]);

  // ── Load size codes ───────────────────────────────────────────────────────

  const loadSizeCodes = useCallback(async () => {
    try {
      const raw  = await apiFetch<unknown>(`/api/size-codes?warehouse_id=${encodeURIComponent(warehouseId)}`);
      const list = Array.isArray(raw) ? raw : (raw as { data?: SizeCode[] })?.data ?? [];
      setSizeCodes(list);
    } catch { /* non-critical */ }
  }, [warehouseId, apiFetch]);

  // ── Polling ───────────────────────────────────────────────────────────────

  function startPoll() {
    stopPoll();
    pollTimerRef.current = setInterval(() => {
      if (!modalOpenRef.current && document.visibilityState === 'visible') {
        const n = productsLengthRef.current;
        loadProducts(0, false, true, n > PAGE_SIZE ? n : undefined);
      }
    }, POLL_MS);
  }
  function stopPoll() {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }

  // ── Lifecycle: warehouse change ────────────────────────────────────────────

  useEffect(() => {
    setProducts([]);
    setTotalCount(0);
    setLoading(true);
    setError(null);
    setSearch('');
    setCategory('all');
    setSizeFilter('all');
    setColorFilter('all');
    didInitialLoad.current = false;
    skipSearchDebounceRef.current = true;
    loadAbortRef.current?.abort();

    loadProducts(0, false);
    loadSizeCodes();
    const pollDelay = setTimeout(() => startPoll(), 5000);

    const onVisible = () => {
      if (!didInitialLoad.current) return;
      if (document.visibilityState === 'visible' && !modalOpenRef.current) {
        const n = productsLengthRef.current;
        loadProducts(0, false, true, n > PAGE_SIZE ? n : undefined);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    const initGate = setTimeout(() => { didInitialLoad.current = true; }, 500);

    return () => {
      clearTimeout(pollDelay);
      clearTimeout(initGate);
      stopPoll();
      document.removeEventListener('visibilitychange', onVisible);
      loadAbortRef.current?.abort();
    };
  }, [warehouseId, loadProducts]);

  // ── Debounced server-side search when search or category changes ────────────

  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      loadProducts(0, false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = null;
      }
    };
  }, [search, category, sizeFilter, colorFilter, loadProducts]);

  useEffect(() => { modalOpenRef.current = modalOpen; }, [modalOpen]);

  // ── Modal ─────────────────────────────────────────────────────────────────

  const openAddModal = useCallback(() => {
    setEditingProduct(null);
    setModalOpen(true);
  }, []);
  const openEditModal = useCallback((p: Product) => {
    setEditingProduct(structuredClone(p));
    setModalOpen(true);
  }, []);
  const handleDeleteProduct = useCallback((p: Product) => setConfirmDelete(p), []);

  function closeModal() {
    setModalOpen(false);
    setEditingProduct(null);
    const msSinceSave = Date.now() - lastSaveTimeRef.current;
    if (msSinceSave > 5000) {
      setTimeout(() => {
        const n = productsLengthRef.current;
        loadProducts(0, false, true, n > PAGE_SIZE ? n : undefined);
      }, 500);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function executeDelete(product: Product) {
    setConfirmDelete(null);
    pendingDeletesRef.current.add(product.id);
    setProducts(prev => prev.filter(p => p.id !== product.id));

    try {
      await apiFetch(`/api/products?id=${encodeURIComponent(product.id)}&warehouse_id=${encodeURIComponent(warehouseId)}`, {
        method: 'DELETE',
      });
      pendingDeletesRef.current.delete(product.id);
      showToast(`"${product.name}" deleted`, 'success');
    } catch (e: unknown) {
      pendingDeletesRef.current.delete(product.id);
      const err = e as Error;
      setProducts(prev => {
        if (prev.find(p => p.id === product.id)) return prev;
        return [...prev, product].sort((a, b) => a.name.localeCompare(b.name));
      });
      showToast(err.message ?? 'Failed to delete', 'error');
    }
  }

  // ── Submit (add / edit) ───────────────────────────────────────────────────

  async function handleSubmit(
    payload: Omit<Product, 'id'> & { id?: string },
    isEdit:  boolean
  ) {
    if (isEdit && payload.id) {
      const original  = products.find(p => p.id === payload.id);
      const optimistic = { ...original, ...payload } as Product;
      setProducts(prev => prev.map(p => p.id === payload.id ? optimistic : p));

      try {
        const raw = await apiFetch<unknown>(`/api/products`, {
          method: 'PUT',
          body:   JSON.stringify({
            ...payload,
            id: payload.id,
            warehouseId,
            barcode: payload.barcode ?? '',
            description: (payload as { description?: string }).description ?? '',
            sizeKind:       payload.sizeKind,
            quantityBySize: Array.isArray(payload.quantityBySize) ? payload.quantityBySize : [],
            quantity:       payload.quantity,
          }),
        });

        const updated = unwrapProduct(raw);
        if (updated) {
          const serverHasSizes  = (updated.quantityBySize?.length ?? 0) > 0;
          const payloadHasSizes = (payload.quantityBySize?.length  ?? 0) > 0;
          if (payloadHasSizes && !serverHasSizes) {
            console.warn('[handleSubmit] Server wiped sizes — keeping optimistic state');
          } else {
            setProducts(prev => prev.map(p => p.id === payload.id ? updated : p));
          }
        }

        lastSaveTimeRef.current = Date.now();
        showToast(`${payload.name} updated`, 'success');
      } catch (e: unknown) {
        const err = e as Error;
        if (original) setProducts(prev => prev.map(p => p.id === payload.id ? original : p));
        showToast(err.message ?? 'Failed to update', 'error');
        throw e;
      }

    } else {
      try {
        const raw = await apiFetch<unknown>('/api/products', {
          method: 'POST',
          body:   JSON.stringify({
            ...payload,
            warehouseId,
            barcode: payload.barcode ?? '',
            description: (payload as { description?: string }).description ?? '',
            sizeKind:       payload.sizeKind,
            quantityBySize: Array.isArray(payload.quantityBySize) ? payload.quantityBySize : [],
            quantity:       payload.quantity,
          }),
        });

        let created = unwrapProduct(raw);
        if (created && (payload.quantityBySize?.length ?? 0) > 0
            && (created.quantityBySize?.length ?? 0) === 0) {
          created = { ...created, quantityBySize: payload.quantityBySize, quantity: payload.quantity };
        }

        if (created?.id) setProducts(prev => [created!, ...prev]);
        else setTimeout(() => {
          const n = productsLengthRef.current;
          loadProducts(0, false, true, n > PAGE_SIZE ? n : undefined);
        }, 300);

        lastSaveTimeRef.current = Date.now();
        showToast(`${payload.name} added`, 'success');
      } catch (e: unknown) {
        const err = e as Error;
        showToast(err.message ?? 'Failed to add product', 'error');
        throw e;
      }
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const displayed = applySort(products, sort);
  const hasMore = products.length < totalCount && !loading && !loadingMore;
  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'name_asc',   label: 'Name A–Z'       },
    { key: 'name_desc',  label: 'Name Z–A'       },
    { key: 'price_asc',  label: 'Price low–high' },
    { key: 'price_desc', label: 'Price high–low' },
    { key: 'stock_asc',  label: 'Stock low–high' },
    { key: 'stock_desc', label: 'Stock high–low' },
  ];

  const alertCount = stats.outCount + stats.lowCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentPage = totalCount === 0 ? 1 : Math.min(Math.ceil(products.length / PAGE_SIZE), totalPages);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F4F6F9] pb-28">

      {/* ══ Page header: breadcrumb, title, subtitle, Add product (CHANGE 4) ══ */}
      <div className="px-4 pt-6 pb-4 lg:px-0">
        <div
          className="flex items-center gap-1.5 text-[12px] mb-3.5"
          style={{ fontFamily: "'DM Sans', sans-serif", color: '#8892A0' }}
        >
          <span>{warehouse?.name ?? 'Warehouse'}</span>
          <span className="opacity-40" aria-hidden>›</span>
          <span className="font-medium" style={{ color: '#424958' }}>Inventory</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1
              className="text-[21px] font-extrabold tracking-tight"
              style={{ fontFamily: 'Syne, sans-serif', color: '#0D1117' }}
            >
              Inventory
            </h1>
            <p
              className="text-[12px] mt-0.5"
              style={{ fontFamily: "'DM Sans', sans-serif", color: '#8892A0' }}
            >
              {totalCount === 0 && !loading && !error
                ? 'No products yet'
                : totalCount > 0 && products.length < totalCount
                  ? `Showing ${products.length} of ${totalCount} products`
                  : `${totalCount} product${totalCount !== 1 ? 's' : ''} · Page ${currentPage} of ${totalPages}`}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="h-[35px] px-3.5 rounded-[7px] text-white text-[13px] font-semibold flex items-center gap-1.5 flex-shrink-0 transition-all duration-150 hover:-translate-y-px hover:bg-[#3D96F5]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              background: '#5CACFA',
              boxShadow: '0 2px 8px rgba(92,172,250,0.25)',
            }}
          >
            <PlusIcon /> Add product
          </button>
        </div>
      </div>

      {/* ══ Stats: Total stock value (cost, warehouse) vs Selection value (selling, filtered) ══ */}
      {!loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5 px-4 lg:px-0">
          <StatCard
            label="SKUs"
            value={totalCount > 0 ? totalCount : 0}
            sub={totalCount > 0 && hasMore ? 'Load more for full stats' : `${stats.totalUnits.toLocaleString()} total units`}
          />
          <StatCard
            label="Alerts"
            value={alertCount}
            sub={alertCount > 0 ? `${stats.outCount} out · ${stats.lowCount} low` : 'None'}
            warning
          />
          <div className="col-span-2 lg:col-span-1">
            <StatCard
              label={hasFilter ? 'Selection value' : 'Total stock value'}
              value={hasFilter
                ? formatGHC(stats.totalValue)
                : warehouseStats != null
                  ? formatGHC(warehouseStats.totalStockValue)
                  : '—'}
              sub={hasFilter
                ? `${stats.totalUnits.toLocaleString()} units · at selling price`
                : warehouseStats != null
                  ? `${warehouseStats.totalUnits.toLocaleString()} units · at cost`
                  : 'Loading…'}
              accent
            />
          </div>
        </div>
      )}

      {/* ══ Filter toolbar: single row — category pills, Size/Color dropdowns, Sort, count (CHANGE 4) ══ */}
      <div className="px-4 pb-4 flex flex-wrap items-center gap-2 lg:px-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
          {(['all', ...CATEGORIES] as string[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 h-[30px] px-3 rounded-[20px] border text-[12px] font-medium whitespace-nowrap transition-colors
                ${category === cat
                  ? 'bg-[#0D1117] border-[#0D1117] text-white'
                  : 'bg-white border-[rgba(0,0,0,0.11)] text-[#424958] hover:bg-[#EEF1F6]'}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
          <select
            id="inv-size-filter"
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="h-[30px] pl-3 pr-8 rounded-[20px] border border-[rgba(0,0,0,0.11)] bg-white text-[12px] font-medium text-[#424958] appearance-none bg-no-repeat bg-[length:10px_6px] focus:outline-none focus:border-[#5CACFA]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238892A0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="all">Size: All</option>
            {sizeCodes.map((s) => (
              <option key={s.size_code} value={s.size_code}>
                {s.size_label ?? s.size_code}
              </option>
            ))}
          </select>
          <select
            id="inv-color-filter"
            value={colorFilter}
            onChange={(e) => setColorFilter(e.target.value)}
            className="h-[30px] pl-3 pr-8 rounded-[20px] border border-[rgba(0,0,0,0.11)] bg-white text-[12px] font-medium text-[#424958] appearance-none bg-no-repeat bg-[length:10px_6px] focus:outline-none focus:border-[#5CACFA]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238892A0' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 10px center',
            }}
          >
            <option value="all">Color: All</option>
            {COLOR_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setSortOpen((o) => !o)}
              className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-[20px] border border-[rgba(0,0,0,0.11)] bg-white text-[12px] font-medium text-[#424958] hover:bg-[#EEF1F6] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
              </svg>
              {SORT_OPTIONS.find((o) => o.key === sort)?.label}
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} aria-hidden />
                <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.07)] py-1.5 w-44">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setSort(opt.key);
                        setSortOpen(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-[13px] font-medium transition-colors
                        ${sort === opt.key ? 'text-[#5CACFA] bg-[#F4F6F9]' : 'text-[#424958] hover:bg-[#EEF1F6]'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <span className="text-[11px] text-[#8892A0] whitespace-nowrap" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Showing <strong className="font-semibold text-[#424958]">
            {displayed.length === 0 ? 0 : 1}–{displayed.length}
          </strong> of {totalCount}
        </span>
      </div>

      {/* ══ Main content ══ */}
      <main className="px-4 lg:px-0">

        {/* Error */}
        {error && (
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-300">
              <BoxIcon/>
            </div>
            <div>
              <p className="text-[17px] font-black text-slate-800">Couldn&apos;t load products</p>
              <p className="text-[13px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">{error}</p>
            </div>
            <button type="button" onClick={() => loadProducts(0, false)}
                    className="h-10 px-6 rounded-xl bg-primary-500 text-white text-[13px] font-bold
                               hover:bg-primary-600 transition-colors shadow-[0_4px_12px_rgba(92,172,250,0.25)]">
              Retry
            </button>
          </div>
        )}

        {/* Skeletons */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i}/>)}
          </div>
        )}

        {/* Empty filter (server returned 0 for this q/category/size/color) */}
        {!loading && !error && products.length === 0 && (search.trim() || category !== 'all' || sizeFilter !== 'all' || colorFilter !== 'all') && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <p className="text-[15px] font-bold text-slate-700">
              No results for current filters
              {search.trim() && ` (search: "${search}")`}
              {category !== 'all' && ` (category: ${category})`}
              {sizeFilter !== 'all' && ` (size: ${sizeFilter})`}
              {colorFilter !== 'all' && ` (color: ${colorFilter})`}
            </p>
            {colorFilter !== 'all' && !search.trim() && category === 'all' && sizeFilter === 'all' && (
              <p className="text-[12px] text-slate-500 max-w-[280px]">
                No products have this color. Use <strong>Uncategorized</strong> to see products without a color set, or set a color when editing a product.
              </p>
            )}
            <button type="button" onClick={() => { setSearch(''); setCategory('all'); setSizeFilter('all'); setColorFilter('all'); }}
                    className="text-[13px] font-bold text-primary-500 hover:text-primary-700">
              Clear filters
            </button>
          </div>
        )}

        {/* Empty warehouse (CHANGE 4: 64px icon container, Syne title, DM Sans subtitle) */}
        {!loading && !error && products.length === 0 && !search.trim() && category === 'all' && sizeFilter === 'all' && colorFilter === 'all' && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-[#8892A0]"
              style={{ background: '#EEF1F6', border: '1px solid rgba(0,0,0,0.11)' }}
            >
              <BoxIcon />
            </div>
            <p
              className="text-[17px] font-bold"
              style={{ fontFamily: 'Syne, sans-serif', color: '#0D1117' }}
            >
              No products yet
            </p>
            <p
              className="text-[13px] max-w-[280px]"
              style={{ fontFamily: "'DM Sans', sans-serif", color: '#8892A0' }}
            >
              Add your first product to get started.
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="h-[38px] px-5 rounded-[7px] text-white text-[13px] font-semibold flex items-center gap-1.5 mt-1 transition-all duration-150 hover:-translate-y-px"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                background: '#5CACFA',
                boxShadow: '0 2px 8px rgba(92,172,250,0.25)',
              }}
            >
              <PlusIcon /> Add first product
            </button>
          </div>
        )}

        {/* Product grid — view-only cards (CHANGE 4: 14px gap, 10px radius cards) */}
        {!loading && !error && displayed.length > 0 && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
              {displayed.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEditFull={openEditModal}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center py-6">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => loadProducts(products.length, true)}
                  className="h-11 px-6 rounded-xl border-2 border-slate-200 bg-white
                             text-[13px] font-bold text-slate-700 hover:border-slate-300
                             hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed
                             transition-colors"
                >
                  {loadingMore ? 'Loading…' : `Load more (${products.length} of ${totalCount})`}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ══ Modals ══ */}
      <ProductModal
        isOpen={modalOpen}
        product={editingProduct}
        sizeCodes={sizeCodes}
        warehouseId={warehouseId}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />

      {confirmDelete && (
        <DeleteDialog
          product={confirmDelete}
          onConfirm={() => executeDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <ToastContainer toasts={toasts}/>

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)     scale(1);   }
        }
        @keyframes sheetUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0);    }
        }
        .scrollbar-none { scrollbar-width: none; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
