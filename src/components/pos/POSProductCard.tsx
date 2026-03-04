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
import { type POSProduct } from './SizePickerSheet';

// ── Types ──────────────────────────────────────────────────────────────────

interface POSProductCardProps {
  product: POSProduct;
  onSelect: (product: POSProduct) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

type StockStatus = 'in' | 'low' | 'out';

function getStockStatus(product: POSProduct): StockStatus {
  if (product.quantity === 0) return 'out';
  if (product.quantity <= 3) return 'low';
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
  const status = getStockStatus(product);
  const isOut = status === 'out';
  const firstImage = (product.images ?? [])[0];
  const safeSrc = firstImage ? safeProductImageUrl(firstImage) : '';
  const hasImage = safeSrc && safeSrc !== EMPTY_IMAGE_DATA_URL;

  const stockLabel =
    status === 'out'
      ? 'Out'
      : status === 'low'
        ? `${product.quantity} left`
        : `${product.quantity} in stock`;

  return (
    <button
      type="button"
      disabled={isOut}
      onClick={() => onSelect(product)}
      className="group w-full text-left bg-white rounded-[10px] overflow-hidden border border-[rgba(0,0,0,0.07)]
        shadow-[0_1px_3px_rgba(13,17,23,0.06),0_1px_2px_rgba(13,17,23,0.04)]
        transition-all duration-150
        hover:shadow-[0_4px_16px_rgba(13,17,23,0.09)] hover:-translate-y-0.5
        active:scale-[0.97]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5CACFA]"
    >
      {/* Image: 1:1 square, gradient placeholder (CHANGE 5) */}
      <div className="relative w-full aspect-square overflow-hidden bg-[#EEF1F6]">
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
        <StockBadge status={status} qty={product.quantity} />
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
            className={`text-[10px] flex-shrink-0 ${status === 'low' ? 'text-[#D97706]' : 'text-[#8892A0]'}`}
          >
            {stockLabel}
          </span>
        </div>
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
