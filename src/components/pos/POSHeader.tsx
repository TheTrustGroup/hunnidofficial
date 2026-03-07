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
  /** Optional: called when user taps the Scan pill (e.g. focus barcode scanner). */
  onScanClick?: () => void;
  /** Optional: when user presses Enter in search, call with current value (single input for search + barcode scan). */
  onBarcodeSubmit?: () => void;
  /** Optional: called when user taps Log out. */
  onLogout?: () => void;
}

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconCart = ({ className }: { className?: string }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  onScanClick,
  onBarcodeSubmit,
  onLogout,
}: POSHeaderProps) {
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (onBarcodeSubmit ?? onScanClick) && search.trim()) {
      e.preventDefault();
      (onBarcodeSubmit ?? onScanClick)?.();
    }
  };

  return (
    <header className="flex-shrink-0 bg-white border-b border-[rgba(0,0,0,0.07)] h-14 px-4 flex items-center gap-2">
      {/* Location badge: green dot + name (spec: 30px height, 6px radius, green bg) */}
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        {canChangeWarehouse ? (
          <button
            type="button"
            onClick={onWarehouseTap}
            className="flex items-center gap-1.5 min-w-0 text-left"
          >
            <span className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md bg-[#F0FDF4] border border-[rgba(22,163,74,0.2)] text-[12px] font-semibold text-[#16A34A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden />
              <span className="truncate">{warehouseName}</span>
            </span>
            <span className="text-slate-400 flex-shrink-0"><IconChevronDown /></span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md bg-[#F0FDF4] border border-[rgba(22,163,74,0.2)] text-[12px] font-semibold text-[#16A34A]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden />
            <span className="truncate">{warehouseName}</span>
          </span>
        )}
      </div>
      {/* Single search with Scan pill inside right edge */}
      <div className="flex-1 min-w-0 relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8892A0] pointer-events-none">
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search products or scan barcode…"
          className="w-full h-9 pl-9 pr-[70px] rounded-lg bg-[#F4F6F9] border border-[rgba(0,0,0,0.11)] text-[13px] text-[#0D1117] placeholder:text-[#8892A0] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(92,172,250,0.35)] focus:shadow-[0_0_0_3px_rgba(92,172,250,0.10)]"
          aria-label="Search products or scan barcode"
        />
        <button
          type="button"
          onClick={onScanClick}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-[23px] px-2 rounded bg-[#0D1117] text-white text-[10px] font-bold uppercase tracking-wide"
          aria-label="Scan barcode"
        >
          Scan
        </button>
      </div>
      {/* Cart trigger (opens cart sheet on mobile / when cart panel hidden) */}
      <button
        type="button"
        onClick={onCartTap}
        className="relative flex items-center gap-1.5 h-9 px-3 rounded-md bg-[#5CACFA] text-white text-[13px] font-semibold shadow-[0_2px_8px_rgba(92,172,250,0.25)] hover:bg-[#3D96F5] transition-colors flex-shrink-0"
        aria-label={cartCount > 0 ? `Cart: ${cartCount} items` : 'Cart'}
      >
        <IconCart className="w-5 h-5" />
        {cartCount > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full bg-white text-[#5CACFA] text-[10px] font-bold flex items-center justify-center px-1">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>
      {/* Notification + Log out */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          className="relative w-9 h-9 rounded-lg border border-[rgba(0,0,0,0.11)] bg-white flex items-center justify-center text-[#424958] hover:bg-[#F4F6F9] transition-colors"
          aria-label="Notifications"
          disabled
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-[rgba(0,0,0,0.11)] bg-white text-[12px] font-medium text-[#424958] hover:bg-[#F4F6F9] transition-colors"
          aria-label="Log out"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
