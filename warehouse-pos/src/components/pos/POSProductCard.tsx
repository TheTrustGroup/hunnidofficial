// ============================================================
// POSProductCard.tsx
// File: warehouse-pos/src/components/pos/POSProductCard.tsx
//
// Compact product tile for the POS grid.
// Optimised for speed — one tap opens SizePickerSheet.
// No edit controls, no SKU, no location. Just what the
// cashier needs: image, name, price, stock status.
// ============================================================

import { memo } from 'react';
import { getSafeProductImageUrlSized, EMPTY_IMAGE_DATA_URL } from '../../lib/imageUpload';
import { type POSProduct } from './SizePickerSheet';

// ── Types ──────────────────────────────────────────────────────────────────

interface POSProductCardProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type StockStatus = 'in' | 'low' | 'out';

function getTotalQuantity(product: POSProduct): number {
  if (product.sizeKind === 'sized' && (product.quantityBySize?.length ?? 0) > 0) {
    return (product.quantityBySize ?? []).reduce((s, r) => s + (r.quantity ?? 0), 0);
  }
  return product.quantity ?? 0;
}

function getStockStatus(product: POSProduct): StockStatus {
  const qty = getTotalQuantity(product);
  if (qty === 0) return 'out';
  if (qty <= 3) return 'low';
  return 'in';
}

function formatPrice(n: number): string {
  return `GH₵${Number(n).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Stock Badge ────────────────────────────────────────────────────────────

function StockBadge({ status, qty }: { status: StockStatus; qty: number }) {
  if (status === 'in') return null;
  const label = status === 'low' ? `${qty} left` : 'Out';
  return (
    <span
      className={`absolute top-2 right-2 text-[10px] font-semibold ${status === 'low' ? 'text-[#D97706]' : 'text-[#DC2626]'}`}
    >
      {label}
    </span>
  );
}

// ── Image Placeholder ──────────────────────────────────────────────────────

function ImagePlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: 'var(--elevated)', color: 'var(--text-3)' }}
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
      </svg>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

function POSProductCard({ product, onSelect }: POSProductCardProps) {
  const totalQty = getTotalQuantity(product);
  const status = getStockStatus(product);
  const isOut = status === 'out';
  const firstImage = (product.images ?? [])[0];
  const safeSrc = firstImage ? getSafeProductImageUrlSized(firstImage, 'thumb') : '';
  const hasImage = safeSrc && safeSrc !== EMPTY_IMAGE_DATA_URL;

  const stockLabel =
    status === 'out'
      ? 'Out'
      : status === 'low'
        ? `${totalQty} left`
        : `${totalQty} in stock`;

  const isSized = product.sizeKind === 'sized' && (product.quantityBySize?.length ?? 0) > 0;
  const sizeBreakdown = isSized
    ? (product.quantityBySize ?? [])
        .filter((r) => (r.quantity ?? 0) > 0)
        .map((r) => `${r.sizeLabel ?? r.sizeCode}:${r.quantity ?? 0}`)
        .join(' · ')
    : '';

  return (
    <button
      type="button"
      disabled={isOut}
      onClick={() => onSelect(product)}
      className="group w-full text-left rounded-[12px] overflow-hidden border transition-all duration-200
        hover:shadow-[0_0_0_2px_var(--blue-dim)] active:scale-[0.98]
        disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:transform-none disabled:hover:shadow-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]"
      style={{
        background: 'var(--surface)',
borderColor: 'var(--edk-border)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={(e) => {
        if (!isOut) {
          e.currentTarget.style.borderColor = 'var(--blue)';
          e.currentTarget.style.boxShadow = '0 0 0 2px var(--blue-dim)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--edk-border)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      <div
        className="relative w-full aspect-square overflow-hidden"
        style={{ background: 'var(--elevated)' }}
      >
        {hasImage ? (
          <img
            src={safeSrc}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <ImagePlaceholder />
        )}
        <StockBadge status={status} qty={totalQty} />
      </div>

      <div className="px-2.5 pt-2 pb-2.5">
        <p
          className="font-semibold truncate leading-snug mb-1"
          style={{ fontFamily: 'var(--font-b)', color: 'var(--text)', fontSize: 'var(--text-xs)' }}
        >
          {product.name}
        </p>
        <div className="flex items-end justify-between gap-1">
          <span
            className="font-extrabold leading-none"
            style={{ fontFamily: 'var(--font-d)', color: 'var(--blue)', fontSize: 'var(--text-sm)' }}
          >
            {formatPrice(product.sellingPrice)}
          </span>
          <span
            className="flex-shrink-0"
            style={{ fontSize: 'var(--text-meta)', color: status === 'low' ? 'var(--amber)' : 'var(--text-3)' }}
          >
            {stockLabel}
          </span>
        </div>
        {sizeBreakdown && (
          <p className="mt-1 truncate" style={{ color: 'var(--text-3)', fontSize: 'var(--text-meta)' }} title={sizeBreakdown}>
            {sizeBreakdown}
          </p>
        )}
      </div>
    </button>
  );
}

export default memo(POSProductCard);

// ── Skeleton ───────────────────────────────────────────────────────────────

export function POSProductCardSkeleton() {
  return (
    <div
      className="rounded-[12px] overflow-hidden border"
      style={{ background: 'var(--surface)', borderColor: 'var(--edk-border)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
    >
      <div className="w-full aspect-square animate-pulse" style={{ background: 'var(--elevated)' }} />
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-2">
        <div className="h-3 w-4/5 rounded animate-pulse" style={{ background: 'var(--overlay)' }} />
        <div className="h-3.5 w-1/2 rounded animate-pulse" style={{ background: 'var(--overlay)' }} />
      </div>
    </div>
  );
}
