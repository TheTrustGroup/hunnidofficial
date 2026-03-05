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
import { safeProductImageUrl, EMPTY_IMAGE_DATA_URL } from '../../lib/imageUpload';
import { getProductQtyForAlert, getStockStatus as getStockStatusFromUtil } from '../../lib/stockAlerts';
import { type POSProduct } from './SizePickerSheet';

// ── Types ──────────────────────────────────────────────────────────────────

interface POSProductCardProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type StockStatusUI = 'in' | 'low' | 'out';

function toUIStatus(
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
): StockStatusUI {
  if (status === 'out_of_stock') return 'out';
  if (status === 'low_stock') return 'low';
  return 'in';
}

function formatPrice(n: number): string {
  return `GH₵${Number(n).toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Stock Badge (out of stock / low stock) ──────────────────────────────────

function StockBadge({ status, qty }: { status: StockStatusUI; qty: number }) {
  if (status === 'in') return null;
  const label = status === 'low' ? `${qty} left` : 'Out of stock';
  const isOut = status === 'out';
  return (
    <span
      className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm ${
        isOut
          ? 'bg-red-500 text-white'
          : 'bg-amber-500 text-white'
      }`}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

// ── Image Placeholder ──────────────────────────────────────────────────────

function ImagePlaceholder() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center text-[#A8B4C4]"
      style={{ background: 'linear-gradient(135deg, #EEF1F6 0%, #E0E6F0 100%)' }}
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
  const totalQty = getProductQtyForAlert(product);
  const status = toUIStatus(getStockStatusFromUtil(product));
  const isOut = status === 'out';
  const firstImage = (product.images ?? [])[0];
  const safeSrc = firstImage ? safeProductImageUrl(firstImage) : '';
  const hasImage = safeSrc && safeSrc !== EMPTY_IMAGE_DATA_URL;

  const stockLabel =
    status === 'out'
      ? 'Out of stock'
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
      aria-label={isOut ? `${product.name}, out of stock` : product.name}
      className={`group w-full text-left rounded-[10px] overflow-hidden border transition-all duration-150
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5CACFA]
        ${isOut
          ? 'bg-slate-50 border-slate-200 opacity-75 cursor-not-allowed'
          : 'bg-white border-[rgba(0,0,0,0.07)] shadow-[0_1px_3px_rgba(13,17,23,0.06),0_1px_2px_rgba(13,17,23,0.04)] hover:shadow-[0_4px_16px_rgba(13,17,23,0.09)] hover:-translate-y-0.5 active:scale-[0.97]'
        }`}
    >
      {/* Image: 1:1 square; out-of-stock overlay */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#EEF1F6]">
        {isOut && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10" aria-hidden>
            <span className="text-white text-xs font-bold uppercase tracking-wider">Out of stock</span>
          </div>
        )}
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
          className="text-[12px] font-semibold text-[#0D1117] truncate leading-snug mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {product.name}
        </p>
        <div className="flex items-end justify-between gap-1">
          <span
            className="text-[14px] font-extrabold leading-none"
            style={{ fontFamily: 'Syne, sans-serif', color: '#5CACFA' }}
          >
            {formatPrice(product.sellingPrice)}
          </span>
          <span
            className={`text-[10px] flex-shrink-0 font-medium ${status === 'out' ? 'text-red-600' : status === 'low' ? 'text-[#D97706]' : 'text-[#8892A0]'}`}
          >
            {stockLabel}
          </span>
        </div>
        {sizeBreakdown && (
          <p className="text-[10px] text-[#8892A0] mt-1 truncate" title={sizeBreakdown}>
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
    <div className="bg-white rounded-[10px] overflow-hidden border border-[rgba(0,0,0,0.07)] shadow-[0_1px_3px_rgba(13,17,23,0.06)]">
      <div className="w-full aspect-square bg-[#EEF1F6] animate-pulse" />
      <div className="px-2.5 pt-2 pb-2.5 flex flex-col gap-2">
        <div className="h-3 w-4/5 bg-[#E3E8F0] rounded animate-pulse" />
        <div className="h-3.5 w-1/2 bg-[#E3E8F0] rounded animate-pulse" />
      </div>
    </div>
  );
}
