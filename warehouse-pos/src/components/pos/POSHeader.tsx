/**
 * POS header: warehouse, search, scan, cart icon, notifications, logout.
 */
export interface POSHeaderProps {
  warehouseName: string;
  search: string;
  onSearchChange: (value: string) => void;
  onWarehouseTap: () => void;
  /** When true, warehouse name is static (no tap, no chevron). Use for session-bound POS. */
  canChangeWarehouse?: boolean;
  /** Cart icon: show when provided. Badge shows count when > 0. */
  cartItemCount?: number;
  onCartOpen?: () => void;
  /** Optional: called when user taps the Scan pill (e.g. focus barcode scanner). */
  onScanClick?: () => void;
  /** Optional: called when user taps Log out. */
  onLogout?: () => void;
}

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const IconCart = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
  </svg>
);

export default function POSHeader({
  warehouseName,
  search,
  onSearchChange,
  onWarehouseTap,
  canChangeWarehouse = true,
  cartItemCount = 0,
  onCartOpen,
  onScanClick,
  onLogout,
}: POSHeaderProps) {
  return (
    <header
      className="flex-shrink-0 h-[56px] px-4 flex items-center gap-3 border-b bg-[var(--edk-surface)] border-[var(--edk-border-mid)]"
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        {canChangeWarehouse ? (
          <button
            type="button"
            onClick={onWarehouseTap}
            className="flex items-center gap-1.5 min-w-0 text-left rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
          >
            <span className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md text-[12px] font-semibold border bg-[var(--edk-green-bg)] border-[rgba(22,163,74,0.2)] text-[var(--edk-green)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--edk-green)] shrink-0" aria-hidden />
              <span className="truncate">{warehouseName}</span>
            </span>
            <span className="flex-shrink-0 text-[var(--edk-ink-3)]"><IconChevronDown /></span>
          </button>
        ) : (
          <span className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md text-[12px] font-semibold border bg-[var(--edk-green-bg)] border-[rgba(22,163,74,0.2)] text-[var(--edk-green)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--edk-green)] shrink-0" aria-hidden />
            <span className="truncate">{warehouseName}</span>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 relative max-w-md">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--edk-ink-3)]">
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products or scan barcode…"
          className="w-full h-9 pl-9 pr-[70px] rounded-[var(--edk-radius)] text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--blue)] focus:shadow-[0_0_0_2px_var(--blue-soft)] placeholder:text-[var(--edk-ink-3)] bg-[var(--edk-bg)] border border-[var(--edk-border-mid)] text-[var(--edk-ink)]"
          aria-label="Search products or scan barcode"
        />
        <button
          type="button"
          onClick={onScanClick}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-[26px] px-2.5 rounded-md bg-[var(--edk-ink)] text-white text-[10px] font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
          aria-label="Scan barcode"
        >
          Scan
        </button>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onCartOpen != null && (
          <button
            type="button"
            onClick={onCartOpen}
            style={{ touchAction: 'manipulation' }}
            className="relative w-9 h-9 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center bg-[#1B6FE8] text-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
            aria-label={cartItemCount > 0 ? `Cart, ${cartItemCount} items` : 'Open cart'}
          >
            <IconCart />
            {cartItemCount > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E83B2E] border-2 border-[var(--edk-surface)] flex items-center justify-center text-white text-[10px] font-bold leading-none"
              >
                {cartItemCount > 9 ? '9+' : cartItemCount}
              </span>
            )}
          </button>
        )}
        <button
          type="button"
          className="relative w-9 h-9 rounded-lg border flex items-center justify-center transition-colors bg-[var(--edk-surface)] border-[var(--edk-border-mid)] text-[var(--edk-ink-2)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1 disabled:opacity-50"
          aria-label="Notifications"
          disabled
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-1.5 h-9 px-3 rounded-lg border text-[12px] font-medium transition-colors bg-[var(--edk-surface)] border-[var(--edk-border-mid)] text-[var(--edk-ink-2)] hover:bg-[var(--edk-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:ring-offset-1"
          aria-label="Log out"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
