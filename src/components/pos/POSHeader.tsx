/**
 * POS header: warehouse name, search, cart trigger.
 */
export interface POSHeaderProps {
  warehouseName: string;
  search: string;
  cartCount: number;
  onSearchChange: (value: string) => void;
  onWarehouseTap: () => void;
  onCartTap: () => void;
  /** When true, warehouse name is static (no tap, no chevron). Use for session-bound POS. */
  canChangeWarehouse?: boolean;
}

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconCart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export default function POSHeader({
  warehouseName,
  search,
  cartCount,
  onSearchChange,
  onWarehouseTap,
  onCartTap,
  canChangeWarehouse = true,
}: POSHeaderProps) {
  return (
    <header className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        {canChangeWarehouse ? (
          <button
            type="button"
            onClick={onWarehouseTap}
            className="flex items-center gap-1.5 min-w-0 text-left"
          >
            <span className="text-[15px] font-bold text-slate-900 truncate">{warehouseName}</span>
            <span className="text-slate-400 flex-shrink-0"><IconChevronDown /></span>
          </button>
        ) : (
          <span className="text-[15px] font-bold text-slate-900 truncate" title={warehouseName}>
            {warehouseName}
          </span>
        )}
        <button
          type="button"
          onClick={onCartTap}
          className="relative w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0"
          aria-label={cartCount > 0 ? `Cart: ${cartCount} items` : 'Cart'}
        >
          <IconCart />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-1">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products…"
          className="w-full h-11 pl-10 pr-4 rounded-xl border-[1.5px] border-slate-200 bg-slate-50 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-400 focus:bg-white focus:ring-[2px] focus:ring-red-100 transition-all"
        />
      </div>
    </header>
  );
}
