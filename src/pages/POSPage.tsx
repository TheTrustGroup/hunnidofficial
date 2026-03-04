// ============================================================
// POSPage.tsx — warehouse-pos/src/pages/POSPage.tsx
//
// STOCK DEDUCTION — HOW IT WORKS:
//
//   1. Cashier taps "Charge GH₵450"
//   2. POST /api/sales → calls record_sale() Supabase RPC
//      → RPC atomically: inserts sale + sale_lines + deducts
//        warehouse_inventory_by_size (sized) or warehouse_inventory
//      → Returns { id, receiptId, createdAt }
//   3. Frontend ALSO deducts stock locally (instant UI feedback)
//      — this is optimistic. Even if step 2 failed, cashier sees
//        correct stock immediately. Step 2 is the ground truth.
//   4. "New sale" button → reloads products from server
//      → this re-syncs frontend with DB truth after each sale
//
// If POST /api/sales fails (API not deployed, network error):
//   → Amber toast warning: "⚠ Sale not synced — deploy /api/sales"
//   → Checkout still completes (cashier not blocked)
//   → Stock IS deducted optimistically in UI
//   → Next loadProducts() call will restore real server values
//
// REQUIREMENTS:
//   - Run COMPLETE_SQL_FIX.sql in Supabase SQL Editor
//   - Deploy route_sales.ts as inventory-server/app/api/sales/route.ts
//
// POS WAREHOUSE BINDING:
//   Each POS login is tied to one warehouse (Main Store or Main Town via server).
//   Bound POS users must not see any warehouse dropdown or "select warehouse" UI on this page.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiHeaders, API_BASE_URL } from '../lib/api';
import { printReceipt, type PrintReceiptPayload } from '../lib/printReceipt';
import { useWarehouse, DEFAULT_WAREHOUSE_ID } from '../contexts/WarehouseContext';
import { useAuth } from '../contexts/AuthContext';
import type { Warehouse } from '../types';

import SessionScreen                            from '../components/pos/SessionScreen';
import POSHeader                                  from '../components/pos/POSHeader';
import ProductGrid                                from '../components/pos/ProductGrid';
import CartPanel                                  from '../components/pos/CartPanel';
import CartBar                                    from '../components/pos/CartBar';
import SizePickerSheet, {
  type POSProduct,
  type CartLineInput,
}                                                 from '../components/pos/SizePickerSheet';
import CartSheet, {
  type CartLine,
  type SalePayload,
}                                                 from '../components/pos/CartSheet';
import SaleSuccessScreen, { type CompletedSale }  from '../components/pos/SaleSuccessScreen';

// ── Constants ──────────────────────────────────────────────────────────────

/** Fallback warehouse when context has not yet loaded a current warehouse. */
const FALLBACK_WAREHOUSE: Warehouse = {
  id: DEFAULT_WAREHOUSE_ID,
  name: 'Main Store',
  code: 'MAIN',
  createdAt: '',
  updatedAt: '',
};

interface POSPageProps { apiBaseUrl?: string; }

// CompletedSale is exported from SaleSuccessScreen — imported above

// ── Helpers ────────────────────────────────────────────────────────────────

function buildCartKey(productId: string, sizeCode: string | null) {
  return `${productId}__${sizeCode ?? 'NA'}`;
}

function fmt(n: number) {
  return `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Toast ──────────────────────────────────────────────────────────────────

type ToastType = 'ok' | 'warn' | 'err';

function useToast() {
  const [toast, setToast] = useState<{ message: string; id: number; type: ToastType } | null>(null);
  const show = useCallback((message: string, type: ToastType = 'ok') => {
    const id = Date.now();
    setToast({ message, id, type });
    setTimeout(() => setToast(t => (t?.id === id ? null : t)), type === 'warn' ? 5000 : 3000);
  }, []);
  return { toast, show };
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function POSPage({ apiBaseUrl: _ignored }: POSPageProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  // ── Warehouse from context (SINGLE SOURCE OF TRUTH) ──────────────────────
  const { currentWarehouse, setCurrentWarehouseId, warehouses, isWarehouseBoundToSession } = useWarehouse();
  const contextWarehouse = currentWarehouse ?? FALLBACK_WAREHOUSE;

  // POS locations (Main Store / Main Town): session bound to one warehouse — skip session screen for fast start.
  const [sessionOpen, setSessionOpen] = useState(() => !isWarehouseBoundToSession);
  useEffect(() => {
    if (isWarehouseBoundToSession) setSessionOpen(false);
  }, [isWarehouseBoundToSession]);
  const [warehouse, setWarehouseLocal] = useState<Warehouse>(contextWarehouse);
  const [products, setProducts]           = useState<POSProduct[]>([]);
  const [loading, setLoading]             = useState(false);
  const [search, setSearch]               = useState('');
  const [category, setCategory]           = useState('all');
  const [sizeFilter, setSizeFilter]       = useState('all');
  const [colorFilter, setColorFilter]     = useState('all');
  const [cart, setCart]                   = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen]           = useState(false);
  const [activeProduct, setActiveProduct] = useState<POSProduct | null>(null);
  const [saleResult, setSaleResult]       = useState<CompletedSale | null>(null);
  const [charging, setCharging]           = useState(false);

  const { toast, show: showToast } = useToast();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Keep local warehouse in sync with context (sidebar change or context loaded from API)
  useEffect(() => {
    if (contextWarehouse) setWarehouseLocal(contextWarehouse);
  }, [contextWarehouse?.id, contextWarehouse?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── API ───────────────────────────────────────────────────────────────────

  const apiFetch = useCallback(async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: new Headers({
          ...getApiHeaders(),
          ...(init?.headers ? Object.fromEntries(new Headers(init.headers as HeadersInit).entries()) : {}),
        }),
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      const text = await res.text();
      return (text ? JSON.parse(text) : {}) as T;
    } catch (e: unknown) {
      clearTimeout(timeout);
      if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out');
      throw e;
    }
  }, []);

  // ── Load products ─────────────────────────────────────────────────────────

  const loadProducts = useCallback(async (wid: string, silent = false) => {
    if (!wid?.trim()) return;
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<POSProduct[] | { data?: POSProduct[]; products?: POSProduct[] }>(
        `/api/products?warehouse_id=${encodeURIComponent(wid.trim())}&limit=1000`
      );
      const list: POSProduct[] = Array.isArray(data)
        ? data
        : (data as { data?: POSProduct[] }).data ?? (data as { products?: POSProduct[] }).products ?? [];
      if (isMounted.current) setProducts(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      if (!silent && isMounted.current) showToast(e instanceof Error ? e.message : 'Failed to load products', 'err');
      if (isMounted.current) setProducts([]);
    } finally {
      if (!silent && isMounted.current) setLoading(false);
    }
  }, [apiFetch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load products when POS is ready (session closed) and we have a valid warehouse. Re-run when warehouse.id becomes available (e.g. after context resolves for bound POS).
  useEffect(() => {
    if (sessionOpen || !warehouse?.id) return;
    loadProducts(warehouse.id);
    setCart([]);
    setSearch('');
    setCategory('all');
    setSizeFilter('all');
    setColorFilter('all');
  }, [warehouse?.id, sessionOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Session ───────────────────────────────────────────────────────────────

  function handleWarehouseSelect(w: Warehouse) {
    setCurrentWarehouseId(w.id);
    setWarehouseLocal(w);
    setSessionOpen(false);
  }

  // ── Cart ──────────────────────────────────────────────────────────────────

  function handleAddToCart(input: CartLineInput) {
    const key = buildCartKey(input.productId, input.sizeCode ?? null);
    setCart(prev => {
      const exists = prev.find(l => l.key === key);
      if (exists) return prev.map(l => l.key === key ? { ...l, qty: l.qty + input.qty } : l);
      return [...prev, {
        key,
        productId: input.productId,
        name: input.name,
        sku: input.sku ?? '',
        sizeCode: input.sizeCode ?? null,
        sizeLabel: input.sizeLabel ?? null,
        unitPrice: input.unitPrice,
        qty: input.qty,
        imageUrl: input.imageUrl ?? null,
      }];
    });
    showToast(`${input.name}${input.sizeLabel ? ` · ${input.sizeLabel}` : ''} added`);
  }

  function handleUpdateQty(key: string, delta: number) {
    setCart(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(1, l.qty + delta) } : l));
  }

  function handleRemoveLine(key: string) {
    setCart(prev => prev.filter(l => l.key !== key));
  }

  function handleClearCart() {
    setCart([]);
    setCartOpen(false);
  }

  // ── Charge ────────────────────────────────────────────────────────────────

  async function handleCharge(payload: SalePayload) {
    if (charging) return;
    setCharging(true);

    let serverSaleId:    string | undefined;
    let serverReceiptId: string | undefined;
    let completedAt:     string | undefined;
    let syncOk = true;
    let insufficientStockShown = false;

    // Step 1: POST /api/sales → record_sale() RPC atomically deducts stock in DB
    try {
      const result = await apiFetch<{
        id:        string;
        receiptId: string;
        createdAt: string;
      }>('/api/sales', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId:     payload.warehouseId,
          customerName:    payload.customerName || null,
          paymentMethod:   payload.paymentMethod,
          subtotal:        payload.subtotal,
          discountPct:     payload.discountPct,
          discountAmt:     payload.discountAmt,
          total:           payload.total,
          // Delivery fields
          deliveryStatus:  payload.deliveryStatus  ?? 'delivered',
          recipientName:   payload.recipientName   || null,
          recipientPhone:  payload.recipientPhone  || null,
          deliveryAddress: payload.deliveryAddress || null,
          deliveryNotes:   payload.deliveryNotes   || null,
          expectedDate:    payload.expectedDate    || null,
          lines: payload.lines.map(l => ({
            productId: l.productId,
            sizeCode:  l.sizeCode || null,
            qty:       l.qty,
            unitPrice: l.unitPrice,
            lineTotal: l.unitPrice * l.qty,
            name:      l.name,
            sku:       l.sku ?? '',
            imageUrl:  l.imageUrl ?? null,
          })),
        }),
      });

      serverSaleId    = result.id;
      serverReceiptId = result.receiptId;
      completedAt     = result.createdAt ?? new Date().toISOString();

    } catch (apiErr: unknown) {
      const msg = apiErr instanceof Error ? apiErr.message : 'API error';
      const isInsufficientStock = msg.includes('INSUFFICIENT_STOCK') || msg.includes('insufficient stock');
      console.error('[POS] /api/sales failed — stock NOT deducted in DB:', msg);
      syncOk = false;
      serverReceiptId = 'LOCAL-' + Date.now().toString(36).toUpperCase();
      completedAt = new Date().toISOString();
      if (isInsufficientStock) {
        insufficientStockShown = true;
        showToast('Insufficient stock for one or more items. Reduce quantity or remove items and try again.', 'err');
      }
    }

    // Step 2: Deduct stock locally only when sync succeeded (so UI matches server)
    if (syncOk) {
      setProducts(prev => prev.map(p => {
        const saleLines = payload.lines.filter(l => l.productId === p.id);
        if (saleLines.length === 0) return p;

        if (p.sizeKind === 'sized') {
          const updatedSizes = (p.quantityBySize ?? []).map(row => {
            const line = saleLines.find(l =>
              l.sizeCode && row.sizeCode &&
              l.sizeCode.toUpperCase() === row.sizeCode.toUpperCase()
            );
            return line ? { ...row, quantity: Math.max(0, row.quantity - line.qty) } : row;
          });
          return {
            ...p,
            quantityBySize: updatedSizes,
            quantity: updatedSizes.reduce((s, r) => s + r.quantity, 0),
          };
        }

        const totalSold = saleLines.reduce((s, l) => s + l.qty, 0);
        return { ...p, quantity: Math.max(0, p.quantity - totalSold) };
      }));
    }

    // Step 3: Clear cart + close sheet only when sale synced; preserve cart on failure so user can retry
    if (syncOk) {
      setCart([]);
      setCartOpen(false);
    }
    setCharging(false);

    if (!syncOk) {
      if (!insufficientStockShown) {
        showToast('Sale failed to sync — check connection and try again. Cart preserved.', 'err');
      }
      return;
    }

    // Step 4: Wait for sheet close animation
    await new Promise(r => setTimeout(r, 350));

    if (!isMounted.current) return;

    // Step 5: Show success screen only when sync succeeded
    setSaleResult({
      ...payload,
      saleId:         serverSaleId,
      receiptId:      serverReceiptId,
      completedAt,
      deliveryStatus: payload.deliveryStatus ?? 'delivered',
    });
  }

  // ── New sale ──────────────────────────────────────────────────────────────

  function handleNewSale() {
    setSaleResult(null);
    setCart([]);
    // Re-fetch from server = ground truth stock after sales
    loadProducts(warehouse.id, true);
  }

  // ── Share ─────────────────────────────────────────────────────────────────

  function handleShareReceipt(sale: CompletedSale) {
    const lines = sale.lines
      .map(l => `${l.name}${l.sizeLabel ? ` (${l.sizeLabel})` : ''} x${l.qty} — ${fmt(l.unitPrice * l.qty)}`)
      .join('\n');

    const text = [
      '🧾 Receipt — Hunnid Official',
      sale.receiptId ? sale.receiptId : '',
      '─────────────────────',
      lines,
      '─────────────────────',
      sale.discountPct > 0 ? `Discount: −${fmt(sale.discountAmt)}` : null,
      `Total: ${fmt(sale.total)}`,
      `Paid via: ${sale.paymentMethod}`,
      sale.customerName ? `Customer: ${sale.customerName}` : null,
      `Date: ${new Date(sale.completedAt ?? Date.now()).toLocaleString('en-GH')}`,
    ].filter(Boolean).join('\n');

    if (navigator?.share) {
      navigator.share({ title: 'Receipt', text }).catch(() => {});
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    }
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  function handlePrintReceipt(sale: CompletedSale) {
    printReceipt({ ...sale, receiptId: sale.receiptId } as PrintReceiptPayload);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  // ── Toast accent colour ───────────────────────────────────────────────────

  const toastBorder =
    toast?.type === 'warn' ? 'border-l-amber-400' :
    toast?.type === 'err'  ? 'border-l-red-500'   :
                             'border-l-emerald-500';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col lg:flex-row overflow-hidden">

      {!isWarehouseBoundToSession && (
        <SessionScreen
          isOpen={sessionOpen}
          warehouses={warehouses}
          activeWarehouseId={warehouse.id}
          onSelect={handleWarehouseSelect}
        />
      )}

      {/* Left column: header + products (flex:1). Desktop two-column; mobile single column. */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <POSHeader
          warehouseName={warehouse.name}
          search={search}
          cartCount={cartCount}
          onSearchChange={setSearch}
          onWarehouseTap={() => !isWarehouseBoundToSession && setSessionOpen(true)}
          onCartTap={() => cartCount > 0 && setCartOpen(true)}
          canChangeWarehouse={!isWarehouseBoundToSession}
          onLogout={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        />

        <div className="flex-1 overflow-y-auto min-h-0">
          <ProductGrid
            products={products}
            loading={loading}
            search={search}
            category={category}
            sizeFilter={sizeFilter}
            colorFilter={colorFilter}
            onSelect={product => setActiveProduct(structuredClone(product))}
            onClearSearch={() => setSearch('')}
            onCategoryChange={setCategory}
            onSizeFilterChange={setSizeFilter}
            onColorFilterChange={setColorFilter}
            onRetry={() => warehouse?.id && loadProducts(warehouse.id)}
          />
        </div>

        {/* Mobile: sticky cart bar; desktop cart is right panel */}
        <div className="lg:hidden flex-shrink-0">
          <CartBar
            lines={cart}
            onOpen={() => cartCount > 0 && setCartOpen(true)}
          />
        </div>
      </div>

      {/* Desktop: fixed 344px cart panel (CHANGE 5) */}
      <div className="hidden lg:block flex-shrink-0">
        <CartPanel
          lines={cart}
          onUpdateQty={handleUpdateQty}
          onRemoveLine={handleRemoveLine}
          onClearCart={handleClearCart}
          onOpenCharge={() => cartCount > 0 && setCartOpen(true)}
        />
      </div>

      <SizePickerSheet
        product={activeProduct}
        onAdd={handleAddToCart}
        onClose={() => setActiveProduct(null)}
      />

      <CartSheet
        isOpen={cartOpen}
        lines={cart}
        warehouseId={warehouse.id}
        onUpdateQty={handleUpdateQty}
        onRemoveLine={handleRemoveLine}
        onClearCart={handleClearCart}
        onCharge={handleCharge}
        onClose={() => !charging && setCartOpen(false)}
      />

      <SaleSuccessScreen
        sale={saleResult}
        onNewSale={handleNewSale}
        onPrint={handlePrintReceipt}
        onShareReceipt={handleShareReceipt}
      />

      {/* Toast */}
      {toast && (
        <div key={toast.id} className={`
          fixed bottom-24 left-1/2 -translate-x-1/2 z-40
          px-4 py-2.5 rounded-full
          bg-slate-900 text-white text-[13px] font-semibold
          shadow-[0_4px_20px_rgba(0,0,0,0.25)]
          whitespace-nowrap pointer-events-none
          border-l-[3px] ${toastBorder}
          animate-[posToastIn_0.3s_cubic-bezier(0.34,1.56,0.64,1)]
        `}>
          {toast.message}
        </div>
      )}

      <style>{`
        @keyframes posToastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
