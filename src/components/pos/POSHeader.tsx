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
  onLogout,
}: POSHeaderProps) {
  return (
    <header
      className="flex-shrink-0 min-h-14 h-14 px-4 flex items-center gap-3 border-b"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
        {canChangeWarehouse ? (
          <button
            type="button"
            onClick={onWarehouseTap}
            className="flex items-center gap-1.5 min-w-0 text-left"
          >
            <span
              className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md text-[12px] font-semibold border"
              style={{ background: 'var(--green-dim)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--green)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" aria-hidden />
              <span className="truncate">{warehouseName}</span>
            </span>
            <span className="flex-shrink-0" style={{ color: 'var(--text-3)' }}><IconChevronDown /></span>
          </button>
        ) : (
          <span
            className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-md text-[12px] font-semibold border"
            style={{ background: 'var(--green-dim)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--green)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" aria-hidden />
            <span className="truncate">{warehouseName}</span>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0 relative hidden md:block">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }}>
          <IconSearch />
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search products or scan barcode…"
          className="w-full min-h-touch h-11 pl-10 pr-20 rounded-xl text-sm outline-none transition-[border-color,box-shadow] duration-150 focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] [&::placeholder]:text-[var(--text-3)]"
          style={{ background: 'var(--elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
          aria-label="Search products or scan barcode"
        />
        <button
          type="button"
          onClick={onScanClick}
          className="absolute right-2 top-1/2 -translate-y-1/2 min-h-touch min-w-[44px] py-2 px-3 rounded-lg text-white text-xs font-bold uppercase tracking-wide"
          style={{ background: 'var(--text)' }}
          aria-label="Scan barcode"
        >
          Scan
        </button>
      </div>
      {/* Mobile: search icon instead of full input */}
      <button
        type="button"
        className="md:hidden min-h-touch min-w-touch w-10 h-10 rounded-xl border flex items-center justify-center"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
        aria-label="Search products"
        onClick={() => {
          const value = prompt('Search products or SKU');
          if (value != null) onSearchChange(value);
        }}
      >
        <IconSearch />
      </button>
      <button
        type="button"
        onClick={onCartTap}
        className="relative flex items-center gap-2 min-h-touch min-w-touch px-4 rounded-xl text-white text-sm font-semibold transition-all hover:-translate-y-px flex-shrink-0"
        style={{ background: 'var(--blue)', boxShadow: '0 2px 8px var(--blue-glow)' }}
        aria-label={cartCount > 0 ? `Cart: ${cartCount} items` : 'Cart'}
      >
        <IconCart className="w-5 h-5" />
        {cartCount > 0 && (
          <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 text-[10px] font-bold" style={{ background: 'white', color: 'var(--blue)' }}>
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          className="relative min-w-touch min-h-touch w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          aria-label="Notifications"
          disabled
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        </button>
        <button
          type="button"
          onClick={onLogout}
          className="hidden md:flex items-center gap-2 min-h-touch min-w-touch px-4 rounded-xl border text-sm font-medium transition-colors"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-2)' }}
          aria-label="Log out"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span className="hidden sm:inline">Log out</span>
        </button>
      </div>
    </header>
  );
}
