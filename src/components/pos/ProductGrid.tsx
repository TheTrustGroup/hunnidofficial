import { useMemo, memo } from 'react';
import POSProductCard, { POSProductCardSkeleton } from './POSProductCard';
import type { POSProduct } from './SizePickerSheet';
import { getDeduplicatedCategoryOptions, colorMatchesFilter } from '../../lib/utils';

/** Color filter options (match Inventory). */
const COLOR_OPTIONS = ['Black', 'White', 'Red', 'Blue', 'Brown', 'Green', 'Grey', 'Navy', 'Beige', 'Multi', 'Uncategorized'];

export type { POSProduct };

interface ProductGridProps {
  products: POSProduct[];
  loading: boolean;
  search: string;
  category: string;
  sizeFilter: string;
  colorFilter: string;
  onSelect: (product: POSProduct) => void;
  onClearSearch: () => void;
  onCategoryChange: (category: string) => void;
  onSizeFilterChange: (size: string) => void;
  onColorFilterChange: (color: string) => void;
  /** When products are empty and not loading, call to retry loading (e.g. after API/network failure). */
  onRetry?: () => void;
  /** When there are more products on the server, show a Load more button and call this when clicked. */
  onLoadMore?: () => void;
  loadingMore?: boolean;
  totalCount?: number;
}

function ProductGridInner({
  products,
  loading,
  search,
  category,
  sizeFilter,
  colorFilter,
  onSelect,
  onClearSearch,
  onCategoryChange,
  onSizeFilterChange,
  onColorFilterChange,
  onRetry,
  onLoadMore,
  loadingMore = false,
  totalCount,
}: ProductGridProps) {
  const categoryOptions = useMemo(() => {
    const raw = Array.from(new Set(products.map((p) => (p.category ?? '').trim() || 'Uncategorized')));
    const opts = getDeduplicatedCategoryOptions(raw);
    return [{ value: 'all', label: 'All' }, ...opts];
  }, [products]);

  const sizeOptions = useMemo(() => {
    const codes = new Map<string, string>();
    for (const p of products) {
      for (const row of p.quantityBySize ?? []) {
        if (row.sizeCode) codes.set(row.sizeCode, row.sizeLabel ?? row.sizeCode);
      }
    }
    return Array.from(codes.entries(), ([value, label]) => ({ value, label })).sort((a, b) => a.value.localeCompare(b.value));
  }, [products]);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          (p.name ?? '').toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').toLowerCase().includes(q)
      );
    }
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      list = list.filter((p) => ((p.category ?? '').trim() || 'Uncategorized').toLowerCase() === catLower);
    }
    if (sizeFilter && sizeFilter !== 'all') {
      list = list.filter((p) => {
        const row = (p.quantityBySize ?? []).find((s) => s.sizeCode === sizeFilter);
        return row && (row.quantity ?? 0) > 0;
      });
    }
    if (colorFilter && colorFilter !== 'all') {
      if (colorFilter === 'Uncategorized') {
        list = list.filter((p) => !(p.color ?? '').trim());
      } else {
        list = list.filter((p) => colorMatchesFilter(p.color, colorFilter));
      }
    }
    return list;
  }, [products, category, search, sizeFilter, colorFilter]);

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 flex-1 content-start">
          {Array.from({ length: 9 }, (_, i) => (
            <POSProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (filtered.length === 0) {
    const noProductsLoaded = products.length === 0 && !search;
    const hasActiveFilters = search || category !== 'all' || sizeFilter !== 'all' || colorFilter !== 'all';
    const colorOnlyActive = !search && category === 'all' && sizeFilter === 'all' && colorFilter !== 'all';
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center max-w-sm">
        <p className="text-slate-500">
          {noProductsLoaded
            ? 'No products loaded. Check your connection or try again.'
            : hasActiveFilters
              ? 'No products match the current filters.'
              : 'No products in this category.'}
        </p>
        {colorOnlyActive && (
          <p className="text-xs text-slate-400">
            No products have this color. Select <strong>Uncategorized</strong> to see products without a color set, or edit products in Inventory to set a color.
          </p>
        )}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onClearSearch();
              onCategoryChange('all');
              onSizeFilterChange('all');
              onColorFilterChange('all');
            }}
            className="text-primary-600 font-medium hover:underline"
          >
            Clear filters
          </button>
        )}
        {noProductsLoaded && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
          >
            Retry loading products
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Category tabs: 30px height, 6px radius, active #0D1117 white, scrollable */}
      {categoryOptions.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 px-4 pt-2 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCategoryChange(opt.value)}
              className="flex-shrink-0 min-h-touch py-2 px-4 rounded-lg border text-xs font-medium whitespace-nowrap transition-all"
              style={{
                fontFamily: 'var(--font-b)',
                ...(category === opt.value
                  ? { background: 'var(--blue)', borderColor: 'var(--blue)', color: 'white', boxShadow: 'var(--blue-glow)' }
                  : { background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }),
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Size and Color filters (match Inventory) */}
      <div className="flex flex-wrap items-center gap-2 px-4 pb-2 flex-shrink-0">
        <select
          aria-label="Filter by size"
          value={sizeFilter}
          onChange={(e) => onSizeFilterChange(e.target.value)}
          className="h-[30px] pl-3 pr-8 rounded-[20px] border text-[12px] font-medium appearance-none bg-no-repeat bg-transparent focus:outline-none"
          style={{
            fontFamily: 'var(--font-b)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 10px center',
            backgroundSize: '10px 6px',
          }}
        >
          <option value="all">Size: All</option>
          {sizeOptions.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          aria-label="Filter by color"
          value={colorFilter}
          onChange={(e) => onColorFilterChange(e.target.value)}
          className="h-[30px] pl-3 pr-8 rounded-[20px] border text-[12px] font-medium appearance-none bg-no-repeat bg-transparent focus:outline-none"
          style={{
            fontFamily: 'var(--font-b)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23A1A1AA' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 10px center',
            backgroundSize: '10px 6px',
          }}
        >
          <option value="all">Color: All</option>
          {COLOR_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 flex-1 content-start grid-products">
        {filtered.map((p) => (
          <POSProductCard key={p.id} product={p} onSelect={onSelect} />
        ))}
      </div>
      {onLoadMore && totalCount != null && products.length < totalCount && (
        <div className="flex justify-center py-4 px-4">
          <button
            type="button"
            disabled={loadingMore}
            onClick={onLoadMore}
            className="h-11 px-6 rounded-xl border text-[13px] font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
          >
            {loadingMore ? 'Loading…' : `Load more (${products.length} of ${totalCount})`}
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(ProductGridInner);
