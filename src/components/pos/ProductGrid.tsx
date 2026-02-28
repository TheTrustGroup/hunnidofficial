import { useMemo } from 'react';
import POSProductCard from './POSProductCard';
import type { POSProduct } from './SizePickerSheet';
import { getDeduplicatedCategoryOptions, colorMatchesFilter } from '../../lib/utils';

export type { POSProduct };

/** Common colors for filter chips. Keep in sync with ProductModal and InventoryPage. Uncategorized = products with no color (after backfill). */
const COLOR_OPTIONS = ['Black', 'White', 'Red', 'Blue', 'Brown', 'Green', 'Grey', 'Navy', 'Beige', 'Multi', 'Uncategorized'];

/** When size options exceed this, show a dropdown instead of chips. */
const SIZE_CHIP_THRESHOLD = 12;

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

export default function ProductGrid({
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

  const sizeOptions = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      (p.quantityBySize ?? []).forEach((s) => {
        if (s.sizeCode && (s.quantity ?? 0) > 0) set.add(s.sizeCode);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
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

  const hasActiveFilters = category !== 'all' || sizeFilter !== 'all' || colorFilter !== 'all';
  const useSizeDropdown = sizeOptions.length > SIZE_CHIP_THRESHOLD;

  return (
    <div className="p-4">
      {/* Row 1: Category — horizontal scroll, consistent chips */}
      {categoryOptions.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categoryOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onCategoryChange(opt.value)}
              className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                category === opt.value ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Row 2: Size (dropdown or chips) · Color chips · Clear filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Size */}
        <div className="flex items-center gap-2">
          <label htmlFor="pos-size-filter" className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Size
          </label>
          {useSizeDropdown ? (
            <select
              id="pos-size-filter"
              value={sizeFilter}
              onChange={(e) => onSizeFilterChange(e.target.value)}
              className="h-9 min-w-[100px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="all">All</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onSizeFilterChange('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${sizeFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                All
              </button>
              {sizeOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSizeFilterChange(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ${sizeFilter === s ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Color */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Color</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onColorFilterChange('all')}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${colorFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              All
            </button>
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onColorFilterChange(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${colorFilter === c ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              onCategoryChange('all');
              onSizeFilterChange('all');
              onColorFilterChange('all');
            }}
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((p) => (
          <POSProductCard key={p.id} product={p} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
