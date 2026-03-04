import { useMemo, memo } from 'react';
import POSProductCard from './POSProductCard';
import type { POSProduct } from './SizePickerSheet';
import { getDeduplicatedCategoryOptions, colorMatchesFilter } from '../../lib/utils';

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
}: ProductGridProps) {
  const categoryOptions = useMemo(() => {
    const raw = Array.from(new Set(products.map((p) => (p.category ?? '').trim() || 'Uncategorized')));
    const opts = getDeduplicatedCategoryOptions(raw);
    return [{ value: 'all', label: 'All' }, ...opts];
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
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
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
      {/* Category tabs: 30px height, 6px radius, active #0D1117 white, scrollable (CHANGE 5) */}
      {categoryOptions.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 px-4 pt-2 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCategoryChange(opt.value)}
              className={`flex-shrink-0 h-[30px] px-3 rounded-md border text-[12px] font-medium whitespace-nowrap transition-colors
                ${category === opt.value
                  ? 'bg-[#0D1117] border-[#0D1117] text-white'
                  : 'bg-white border-[rgba(0,0,0,0.11)] text-[#424958] hover:bg-[#F4F6F9]'}`}
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-4 flex-1 content-start">
        {filtered.map((p) => (
          <POSProductCard key={p.id} product={p} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export default memo(ProductGridInner);
