// ============================================================
// ProductCard.tsx
// File: warehouse-pos/src/components/inventory/ProductCard.tsx
//
// Displays a single product as a card.
// Two modes: view (default) and inline stock edit.
// Parent controls which card is in edit mode via activeEditId.
// ============================================================

import { useState, useRef, useCallback, memo } from 'react';
import type { Product } from '../../types';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// ── Types ──────────────────────────────────────────────────────────────────

export interface SizeRow {
  sizeCode: string;
  quantity: number;
  sizeLabel?: string;
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
  const sizeKind = product.sizeKind ?? 'na';
  if (sizeKind === 'sized' && (product.quantityBySize?.length ?? 0) > 0) {
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

// ── Stock Status Badge ─────────────────────────────────────────────────────

function StockBadge({ status }: { status: StockStatus }) {
  const config = {
    in:  { label: 'In stock',     color: 'var(--edk-green)', bg: 'var(--edk-green-bg)', border: 'rgba(22,163,74,0.2)' },
    low: { label: 'Low stock',    color: 'var(--edk-amber)', bg: 'var(--edk-amber-bg)', border: 'rgba(217,119,6,0.2)' },
    out: { label: 'Out of stock', color: 'var(--edk-red)', bg: 'var(--edk-red-soft)', border: 'var(--edk-red-border)' },
  }[status];

  return (
    <span
      className="absolute top-2 right-2 flex items-center gap-1.5 h-6 px-2 rounded-md text-[10px] font-semibold border"
      style={{ color: config.color, background: config.bg, borderColor: config.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current opacity-80" />
      {config.label}
    </span>
  );
}

// ── Size Pills ─────────────────────────────────────────────────────────────

function SizePills({ product }: { product: Product }) {
  const sizeKind = product.sizeKind ?? 'na';
  if (sizeKind === 'na') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className="h-7 px-3 rounded-lg text-[12px] font-semibold flex items-center border"
          style={{ background: 'var(--edk-green-bg)', color: 'var(--edk-green)', borderColor: 'rgba(22,163,74,0.2)' }}
        >
          Qty: {product.quantity}
        </span>
      </div>
    );
  }

  if (sizeKind === 'one_size') {
    return (
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className="h-7 px-3 rounded-lg text-[12px] font-semibold flex items-center border"
          style={{ background: 'var(--edk-green-bg)', color: 'var(--edk-green)', borderColor: 'rgba(22,163,74,0.2)' }}
        >
          One size · {product.quantity}
        </span>
      </div>
    );
  }

  const qtyBySize = product.quantityBySize ?? [];
  if (qtyBySize.length === 0) {
    return (
      <div className="mb-3">
        <span className="text-[12px] italic text-[var(--edk-ink-3)]">No sizes recorded</span>
      </div>
    );
  }

  const reorder = product.reorderLevel ?? 3;
  return (
    <div className="flex flex-wrap gap-1 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
      {qtyBySize.map((row) => {
        const isOut = row.quantity === 0;
        const isLow = row.quantity > 0 && row.quantity <= reorder;
        const pillStyle = isOut
          ? { background: 'var(--edk-red-soft)', color: 'var(--edk-red)', borderColor: 'var(--edk-red-border)' }
          : isLow
            ? { background: 'var(--edk-amber-bg)', color: 'var(--edk-amber)', borderColor: 'rgba(217,119,6,0.2)' }
            : { background: 'var(--edk-green-bg)', color: 'var(--edk-green)', borderColor: 'rgba(22,163,74,0.2)' };
        return (
          <span
            key={row.sizeCode}
            className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 border"
            style={pillStyle}
          >
            {row.sizeCode}
            <span style={{ fontWeight: 400, opacity: 0.9 }}>·{row.quantity}</span>
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
  const sizeKind = product.sizeKind ?? 'na';
  const qtyBySize = product.quantityBySize ?? [];
  // Initialize local rows from product
  const [rows, setRows] = useState<SizeRow[]>(() => {
    if (sizeKind === 'sized' && qtyBySize.length > 0) {
      return qtyBySize.map(r => ({ ...r }));
    }
    return [{ sizeCode: sizeKind === 'one_size' ? 'ONE_SIZE' : 'QTY', quantity: product.quantity }];
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
      const isSized = sizeKind === 'sized';
      const total = rows.reduce((s, r) => s + r.quantity, 0);
      await onSave({
        sizeKind,
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
      <p className="text-[11px] font-bold text-[var(--edk-ink-3)] uppercase tracking-wider mb-3">
        Update stock
      </p>

      <div className="flex flex-col gap-1">
        {rows.map((row, idx) => (
          <div key={row.sizeCode} className="grid grid-cols-[1fr_96px] gap-2 items-center py-1.5 border-b border-[var(--edk-border)] last:border-0">
            <div>
              <p className="text-[14px] font-semibold text-[var(--edk-ink-2)]">
                {sizeKind === 'sized' ? row.sizeCode : sizeKind === 'one_size' ? 'One size' : 'Quantity'}
              </p>
              <p className="text-[11px] text-[var(--edk-ink-3)]">Was: {sizeKind === 'sized'
                ? (qtyBySize.find(r => r.sizeCode === row.sizeCode)?.quantity ?? 0)
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
              className="h-11 w-full rounded-xl border border-[var(--edk-border-mid)] bg-[var(--edk-surface-2)] text-center text-[18px] font-bold text-[var(--edk-ink)] focus:outline-none focus:border-[var(--blue)] focus:bg-[var(--edk-surface)] focus:ring-2 focus:ring-[var(--blue-soft)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all duration-150"
            />
          </div>
        ))}
      </div>

      {sizeKind === 'sized' && rows.length > 1 && (
        <div className="flex justify-between items-center pt-2.5 mt-1">
          <span className="text-[12px] font-semibold text-[var(--edk-ink-3)]">Total</span>
          <span className="text-[15px] font-bold text-[var(--edk-ink)]">
            {rows.reduce((s, r) => s + r.quantity, 0)} units
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="h-11 rounded-xl border border-[var(--edk-border-mid)] text-[14px] font-semibold text-[var(--edk-ink-2)] bg-[var(--edk-surface)] hover:bg-[var(--edk-bg)] disabled:opacity-40 transition-all duration-150"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || saved}
          className={`h-11 rounded-xl border-none text-[14px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all duration-200 ${saved ? 'bg-[var(--edk-green)]' : 'bg-[var(--blue)] hover:brightness-110 active:scale-[0.98]'}`}
        >
          {saving ? <><LoadingSpinner size="sm" /> Saving…</> : saved ? '✓ Saved' : 'Save stock'}
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
      className="rounded-[var(--edk-radius)] overflow-hidden border cursor-pointer transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--edk-surface)',
        borderColor: status === 'low' ? 'rgba(217,119,6,0.25)' : 'var(--edk-border-mid)',
        boxShadow: editing ? '0 0 0 2px var(--blue)' : '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* ── Image area 4:3 ── */}
      <div
        className="relative w-full aspect-[4/3] overflow-hidden border-b bg-[var(--edk-surface-2)]"
        style={{ borderColor: 'var(--edk-border)' }}
      >
        {hasImage ? (
          <img
            src={product.images![0]}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--edk-ink-3)] bg-[var(--edk-surface-2)]">
            <IconImage />
          </div>
        )}
        {status === 'out' && (
          <div className="absolute inset-0 pointer-events-none bg-white/85" />
        )}

        <span
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded-[var(--edk-radius-sm)] text-[10px] font-semibold bg-black/50 text-white/95"
        >
          {product.category}
        </span>

        <StockBadge status={status} />
      </div>

      {/* ── Card body (hidden when editing) ── */}
      {!editing && (
        <div className="px-3.5 pt-3 pb-2">
          <h3 className="text-[13px] font-semibold text-[var(--edk-ink)] truncate mb-0.5">
            {product.name}
          </h3>
          <p className="font-mono text-[10px] text-[var(--edk-ink-3)] truncate mb-2">
            {product.sku}
          </p>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className="text-[16px] font-extrabold text-[var(--blue)]">
              {formatPrice(product.sellingPrice)}
            </span>
            {product.costPrice > 0 && (
              <span className="text-[11px] text-[var(--edk-ink-3)]">
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

      {/* ── Footer: Edit / Stock / Delete ── */}
      {!editing && (
        <div
          className={`grid border-t border-[var(--edk-border)] ${supportsInlineStock ? 'grid-cols-3' : 'grid-cols-2'}`}
        >
          <button
            type="button"
            onClick={() => onEditFull(product)}
            className="h-10 flex items-center justify-center gap-1 text-[12px] font-medium border-r border-[var(--edk-border)] text-[var(--edk-ink-2)] transition-colors hover:bg-[var(--blue-soft)] hover:border-[var(--blue)] hover:text-[var(--blue)]"
          >
            <IconEdit /> Edit
          </button>
          {supportsInlineStock && (
            <button
              type="button"
              onClick={() => onEditOpen?.(product.id)}
              className="h-10 flex items-center justify-center gap-1 text-[12px] font-medium border-r border-[var(--edk-border)] text-[var(--blue)] transition-colors hover:bg-[var(--blue-soft)]"
            >
              <IconPlus /> Stock
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete?.(product)}
            className="h-10 flex items-center justify-center text-[var(--edk-ink-2)] transition-colors hover:bg-[var(--edk-red-soft)] hover:text-[var(--edk-red)]"
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
    <div className="rounded-[var(--edk-radius)] overflow-hidden border border-[var(--edk-border-mid)] bg-[var(--edk-surface)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="w-full aspect-[4/3] skeleton-shimmer bg-[var(--edk-surface-2)]" />
      <div className="px-4 pt-3.5 pb-4 flex flex-col gap-2.5">
        <div className="h-4 w-3/4 rounded-lg skeleton-shimmer" />
        <div className="h-3 w-1/2 rounded-lg skeleton-shimmer" />
        <div className="h-5 w-1/3 rounded-lg skeleton-shimmer" />
        <div className="flex gap-1.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-7 w-16 rounded-lg skeleton-shimmer" />
          ))}
        </div>
      </div>
      <div className="h-10 border-t border-[var(--edk-border)] skeleton-shimmer" />
    </div>
  );
}
