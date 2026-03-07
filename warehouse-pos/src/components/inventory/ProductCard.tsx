// ============================================================
// ProductCard.tsx
// File: warehouse-pos/src/components/inventory/ProductCard.tsx
//
// Displays a single product as a card.
// Two modes: view (default) and inline stock edit.
// Parent controls which card is in edit mode via activeEditId.
// ============================================================

import { useState, useRef, useCallback, memo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SizeRow {
  sizeCode: string;
  quantity: number;
  sizeLabel?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  /** Product color for filter (e.g. Red, Black). Optional. */
  color?: string | null;
  sellingPrice: number;
  costPrice: number;
  quantity: number;
  sizeKind: 'na' | 'one_size' | 'sized';
  quantityBySize: SizeRow[];
  location?: { aisle?: string; rack?: string; bin?: string; warehouse?: string };
  images?: string[];
  reorderLevel?: number;
}

interface ProductCardProps {
  product: Product;
  /** When omitted, card is view-only (no inline stock edit). */
  isEditing?: boolean;
  onEditOpen?: (id: string) => void;
  onEditClose?: () => void;
  onSaveStock?: (id: string, update: {
    quantity: number;
    quantityBySize: SizeRow[];
    sizeKind: string;
  }) => Promise<void>;
  onEditFull: (product: Product) => void;
  onDelete?: (product: Product) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type StockStatus = 'in' | 'low' | 'out';

function getTotalQuantity(product: Product): number {
  if (product.sizeKind === 'sized' && (product.quantityBySize?.length ?? 0) > 0) {
    return (product.quantityBySize ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return product.quantity ?? 0;
}

function getStockStatus(product: Product): StockStatus {
  const qty = getTotalQuantity(product);
  if (qty === 0) return 'out';
  if (product.reorderLevel != null && qty <= product.reorderLevel) return 'low';
  if (qty <= 3) return 'low';
  return 'in';
}

function formatPrice(n: number): string {
  return `GH₵${Number(n).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Icons ──────────────────────────────────────────────────────────────────

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const IconImage = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const IconSpinner = () => <span className="loading-spinner-ring loading-spinner-ring-sm inline-block shrink-0" aria-hidden />;

// ── Stock Status Badge ─────────────────────────────────────────────────────

function StockBadge({ status }: { status: StockStatus }) {
  const config = {
    in:  { label: 'In stock',     dot: '#16A34A', border: 'rgba(22,163,74,0.2)' },
    low: { label: 'Low stock',    dot: '#D97706', border: 'rgba(217,119,6,0.3)' },
    out: { label: 'Out of stock', dot: '#DC2626', border: 'rgba(220,38,38,0.2)' },
  }[status];

  return (
    <span
      className="absolute top-2 right-2 flex items-center gap-1.5 h-6 px-2 rounded-md text-[10px] font-semibold bg-white border"
      style={{ color: status === 'in' ? '#16A34A' : status === 'low' ? '#D97706' : '#DC2626', borderColor: config.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: config.dot }} />
      {config.label}
    </span>
  );
}

// ── Size Pills ─────────────────────────────────────────────────────────────

function SizePills({ product }: { product: Product }) {
  if (product.sizeKind === 'na') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <span className="h-7 px-3 rounded-lg bg-slate-100 text-[12px] font-semibold text-slate-600 flex items-center">
          Qty: {product.quantity}
        </span>
      </div>
    );
  }

  if (product.sizeKind === 'one_size') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <span className="h-7 px-3 rounded-lg bg-slate-100 text-[12px] font-semibold text-slate-600 flex items-center">
          One size · {product.quantity}
        </span>
      </div>
    );
  }

  if (product.quantityBySize.length === 0) {
    return (
      <div className="mb-3">
        <span className="text-[12px] text-slate-300 italic">No sizes recorded</span>
      </div>
    );
  }

  const reorder = product.reorderLevel ?? 3;
  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
      {product.quantityBySize.map((row) => {
        const isLow = row.quantity > 0 && row.quantity <= reorder;
        return (
          <span
            key={row.sizeCode}
            className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5
              ${isLow ? 'bg-[#FFFBEB] border border-[rgba(217,119,6,0.25)] text-[#D97706]' : 'bg-[#F4F6F9] border border-[rgba(0,0,0,0.11)] text-[#424958]'}`}
          >
            {row.sizeCode}
            <span className={isLow ? 'text-[#D97706]/80' : 'text-[#8892A0]'} style={{ fontWeight: 400 }}>
              ·{row.quantity}
            </span>
          </span>
        );
      })}
    </div>
  );
}

// ── Inline Stock Editor ────────────────────────────────────────────────────

interface StockEditorProps {
  product: Product;
  onSave: (update: { quantity: number; quantityBySize: SizeRow[]; sizeKind: string }) => Promise<void>;
  onCancel: () => void;
}

function StockEditor({ product, onSave, onCancel }: StockEditorProps) {
  // Initialize local rows from product
  const [rows, setRows] = useState<SizeRow[]>(() => {
    if (product.sizeKind === 'sized' && product.quantityBySize.length > 0) {
      return product.quantityBySize.map(r => ({ ...r }));
    }
    return [{ sizeCode: product.sizeKind === 'one_size' ? 'ONE_SIZE' : 'QTY', quantity: product.quantity }];
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const updateQty = useCallback((idx: number, val: number) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, quantity: Math.max(0, val) } : r));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const isSized = product.sizeKind === 'sized';
      const total = rows.reduce((s, r) => s + r.quantity, 0);
      await onSave({
        sizeKind: product.sizeKind,
        quantity: total,
        quantityBySize: isSized ? rows : [],
      });
      setSaved(true);
      setTimeout(() => onCancel(), 800);
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pb-4 pt-2">
      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
        Update stock
      </p>

      <div className="flex flex-col gap-1">
        {rows.map((row, idx) => (
          <div key={row.sizeCode} className="grid grid-cols-[1fr_96px] gap-2 items-center py-1.5 border-b border-slate-100 last:border-0">
            <div>
              <p className="text-[14px] font-semibold text-slate-700">
                {product.sizeKind === 'sized' ? row.sizeCode : product.sizeKind === 'one_size' ? 'One size' : 'Quantity'}
              </p>
              <p className="text-[11px] text-slate-400">Was: {product.sizeKind === 'sized'
                ? (product.quantityBySize.find(r => r.sizeCode === row.sizeCode)?.quantity ?? 0)
                : product.quantity
              }</p>
            </div>
            <input
              ref={idx === 0 ? firstInputRef : undefined}
              type="number"
              min={0}
              value={row.quantity}
              onChange={e => updateQty(idx, parseInt(e.target.value) || 0)}
              onFocus={e => e.target.select()}
              className="
                h-11 w-full rounded-xl border-[1.5px] border-slate-200
                bg-slate-50 text-center
                text-[18px] font-bold text-slate-900
                focus:outline-none focus:border-primary-400 focus:bg-white focus:ring-[3px] focus:ring-primary-100
                [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                [&::-webkit-inner-spin-button]:appearance-none
                transition-all duration-150
              "
            />
          </div>
        ))}
      </div>

      {/* Total for sized products */}
      {product.sizeKind === 'sized' && rows.length > 1 && (
        <div className="flex justify-between items-center pt-2.5 mt-1">
          <span className="text-[12px] font-semibold text-slate-500">Total</span>
          <span className="text-[15px] font-bold text-slate-900">
            {rows.reduce((s, r) => s + r.quantity, 0)} units
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="
            h-11 rounded-xl border-[1.5px] border-slate-200
            text-[14px] font-semibold text-slate-500
            bg-white hover:bg-slate-50
            disabled:opacity-40
            transition-all duration-150
          "
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className={`
            h-11 rounded-xl border-none
            text-[14px] font-semibold text-white
            flex items-center justify-center gap-2
            disabled:opacity-60
            transition-all duration-200
            ${saved ? 'bg-emerald-500' : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98]'}
          `}
        >
          {saving ? <><IconSpinner /> Saving…</> : saved ? '✓ Saved' : 'Save stock'}
        </button>
      </div>
    </div>
  );
}

// ── Main Card Component ────────────────────────────────────────────────────

function ProductCardInner({
  product,
  isEditing = false,
  onEditOpen,
  onEditClose,
  onSaveStock,
  onEditFull,
  onDelete,
}: ProductCardProps) {
  const supportsInlineStock = typeof onSaveStock === 'function' && typeof onEditOpen === 'function' && typeof onEditClose === 'function';
  const editing = supportsInlineStock && isEditing;

  const status = getStockStatus(product);
  const hasImage = Array.isArray(product.images) && product.images.length > 0;

  return (
    <article
      className={`
        bg-white rounded-[10px] overflow-hidden border
        shadow-[0_1px_3px_rgba(13,17,23,0.06),0_1px_2px_rgba(13,17,23,0.04)]
        transition-[box-shadow,transform,border-color] duration-[180ms] cursor-pointer
        ${status === 'low' ? 'border-[rgba(217,119,6,0.25)]' : 'border-[rgba(0,0,0,0.07)]'}
        ${editing
          ? 'ring-2 ring-[#5CACFA] shadow-[0_4px_16px_rgba(13,17,23,0.09)]'
          : 'hover:shadow-[0_4px_16px_rgba(13,17,23,0.09)] hover:-translate-y-0.5 hover:border-black/10'
        }
      `}
    >
      {/* ── Image area 4:3, gradient placeholder (CHANGE 4) ── */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#EEF1F6]">
        {hasImage ? (
          <img
            src={product.images![0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-[#A8B4C4]"
            style={{ background: 'linear-gradient(135deg, #EEF1F6 0%, #E3E8F0 100%)' }}
          >
            <IconImage />
          </div>
        )}

        {/* Category tag: dark semi-transparent on image */}
        <span
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-semibold backdrop-blur-[8px]"
          style={{ background: 'rgba(13,17,23,0.7)', color: 'rgba(255,255,255,0.92)' }}
        >
          {product.category}
        </span>

        <StockBadge status={status} />
      </div>

      {/* ── Card body (hidden when editing) ── */}
      {!editing && (
        <div className="px-3.5 pt-3 pb-2">
          <h3
            className="text-[13px] font-semibold truncate mb-0.5"
            style={{ fontFamily: "'DM Sans', sans-serif", color: '#0D1117' }}
          >
            {product.name}
          </h3>
          <p className="font-mono text-[10px] text-[#8892A0] truncate mb-2">
            {product.sku}
          </p>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span
              className="text-[16px] font-extrabold"
              style={{ fontFamily: 'Syne, sans-serif', color: '#5CACFA' }}
            >
              {formatPrice(product.sellingPrice)}
            </span>
            {product.costPrice > 0 && (
              <span className="text-[11px] text-[#8892A0]">
                Cost: {formatPrice(product.costPrice)}
              </span>
            )}
          </div>
          <SizePills product={product} />
        </div>
      )}

      {editing && onSaveStock && onEditClose && (
        <StockEditor
          product={product}
          onSave={onSaveStock.bind(null, product.id)}
          onCancel={onEditClose}
        />
      )}

      {/* ── Footer: Edit / Delete outlined 30px (CHANGE 4) ── */}
      {!editing && (
        <div className={`grid border-t border-[rgba(0,0,0,0.07)] ${supportsInlineStock ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <button
            type="button"
            onClick={() => onEditFull(product)}
            className="h-[30px] flex items-center justify-center gap-1 text-[12px] font-medium text-[#424958] border-r border-[rgba(0,0,0,0.07)] hover:bg-[#F4F6F9] transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <IconEdit /> Edit
          </button>
          {supportsInlineStock && (
            <button
              type="button"
              onClick={() => onEditOpen?.(product.id)}
              className="h-[30px] flex items-center justify-center gap-1 text-[12px] font-medium text-[#5CACFA] border-r border-[rgba(0,0,0,0.07)] hover:bg-[#F4F6F9] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <IconPlus /> Stock
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete?.(product)}
            className="h-[30px] flex items-center justify-center text-[#424958] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
            aria-label="Delete product"
            title="Delete product"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes card-spin { to { transform: rotate(360deg); } }
      `}</style>
    </article>
  );
}

const ProductCard = memo(ProductCardInner);

export default ProductCard;

// ── Skeleton Card ──────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-[10px] overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-[0_1px_3px_rgba(13,17,23,0.06),0_1px_2px_rgba(13,17,23,0.04)]">
      <div className="w-full aspect-[4/3] bg-[#EEF1F6] animate-pulse" />
      <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2.5">
        <div className="h-4 w-3/4 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-5 w-1/3 bg-slate-100 rounded-lg animate-pulse" />
        <div className="flex gap-1.5">
          {[1,2,3].map(i => (
            <div key={i} className="h-7 w-16 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      <div className="h-12 border-t border-slate-100 bg-slate-50 animate-pulse" />
    </div>
  );
}
