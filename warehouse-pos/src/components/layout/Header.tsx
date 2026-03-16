// src/components/layout/Header.tsx — TopBar: breadcrumb, search, status pill, bell, New Sale. Mobile: 52px compact (title, search icon, LIVE, bell, cart).
import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { Search, Bell, LogOut, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApiStatus } from '../../contexts/ApiStatusContext';

const MOBILE_BREAKPOINT = 768;

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const handler = () => setMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

function getPageTitle(pathname: string): string {
  if (pathname === '/' || pathname.startsWith('/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/inventory')) return 'Inventory';
  if (pathname.startsWith('/sales')) return 'Sales';
  if (pathname.startsWith('/orders')) return 'Orders';
  if (pathname.startsWith('/deliveries')) return 'Deliveries';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/settings')) return 'Settings';
  if (pathname.startsWith('/users')) return 'Users';
  return 'App';
}

const BREADCRUMB: Record<string, { parent?: string; current: string }> = {
  '/': { current: 'Dashboard' },
  '/inventory': { parent: 'Dashboard', current: 'Inventory' },
  '/orders': { parent: 'Dashboard', current: 'Orders' },
  '/pos': { current: 'POS' },
  '/sales': { parent: 'Dashboard', current: 'Sales' },
  '/deliveries': { parent: 'Dashboard', current: 'Deliveries' },
  '/reports': { parent: 'Dashboard', current: 'Reports' },
  '/users': { parent: 'Settings', current: 'User Management' },
  '/settings': { parent: 'Dashboard', current: 'Settings' },
  '/more': { current: 'More' },
};

function getBreadcrumb(pathname: string) {
  return BREADCRUMB[pathname] ?? { current: pathname.slice(1) || 'Dashboard' };
}

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();
  const { isDegraded } = useApiStatus();
  const isInventory = location.pathname === '/inventory';
  const searchFromUrl = isInventory ? (searchParams.get('q') ?? '') : '';
  const [localQuery, setLocalQuery] = useState('');
  const searchValue = isInventory ? searchFromUrl : localQuery;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const breadcrumb = getBreadcrumb(location.pathname);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const updateSearchUrl = (value: string) => {
    const trimmed = value.trim();
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (trimmed) p.set('q', trimmed);
        else p.delete('q');
        return p;
      },
      { replace: true }
    );
  };

  const handleSearchInput = (value: string) => {
    if (isInventory) {
      updateSearchUrl(value);
    } else {
      setLocalQuery(value);
    }
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = (isInventory ? searchFromUrl : localQuery).trim();
    if (q) {
      navigate(`/inventory?q=${encodeURIComponent(q)}`);
      setLocalQuery('');
    } else if (!isInventory) {
      navigate('/inventory');
    }
  };

  const isMobile = useIsMobile();

  // Mobile topbar: --edk-topbar-h, page title, search icon, LIVE pill, bell, cart
  if (isMobile) {
    return (
      <header
        className="md:hidden fixed top-0 left-0 right-0 flex items-center px-4 gap-2 z-50 border-b"
        style={{
          height: 'var(--edk-topbar-h)',
          paddingTop: 'var(--safe-top)',
          background: 'var(--edk-surface)',
          borderColor: 'var(--edk-border)',
          fontFamily: 'var(--edk-font-ui)',
        }}
      >
        <span className="flex-1 text-[13px] font-medium truncate" style={{ color: 'var(--edk-ink)' }}>
          {getPageTitle(location.pathname)}
        </span>
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="w-8 h-8 rounded-md flex items-center justify-center min-w-[44px] min-h-[44px]"
          style={{ background: 'var(--edk-bg)' }}
          aria-label="Search products"
        >
          <Search size={16} strokeWidth={2} style={{ color: 'var(--edk-ink-3)' }} />
        </button>
        <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold" style={{ background: 'var(--edk-amber-bg)', color: 'var(--edk-green)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--edk-green)]" aria-hidden />
          LIVE
        </div>
        <button
          type="button"
          className="relative w-8 h-8 rounded-md flex items-center justify-center min-w-[44px] min-h-[44px]"
          style={{ background: 'var(--edk-bg)' }}
          aria-label="Notifications"
          disabled
        >
          <Bell size={16} strokeWidth={2} style={{ color: 'var(--edk-ink-2)' }} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-[var(--edk-surface)] bg-[var(--edk-red)]" aria-hidden />
        </button>
        <Link
          to="/pos"
          className="w-8 h-8 rounded-md flex items-center justify-center min-w-[44px] min-h-[44px] text-white"
          style={{ background: 'var(--blue)' }}
          aria-label="Open POS"
        >
          <ShoppingCart size={16} strokeWidth={2} />
        </Link>
      </header>
    );
  }

  // Desktop: fixed top bar, height --edk-topbar-h, left offset --edk-sidebar-w
  return (
    <header
      className="sticky top-0 left-0 right-0 flex items-center gap-3 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] lg:pl-6 lg:pr-6 pt-[var(--safe-top)] z-50 border-b"
      style={{
        height: 'var(--edk-topbar-h)',
        background: 'var(--edk-surface)',
        borderColor: 'var(--edk-border)',
        fontFamily: 'var(--edk-font-ui)',
        marginLeft: 0,
      }}
    >
      <style>{`.edk-header-desktop { left: var(--edk-sidebar-w); }`}</style>
      <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ left: 'var(--edk-sidebar-w)' }} aria-hidden />
      <div className="flex-1 flex items-center gap-3 min-w-0 w-full lg:w-auto lg:max-w-[1600px] lg:ml-[var(--edk-sidebar-w)]">
        {/* Breadcrumb */}
        <nav className="flex-shrink-0 min-w-0 hidden lg:block" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[13px] font-medium truncate" style={{ color: 'var(--edk-ink-2)' }}>
            {breadcrumb.parent != null ? (
              <>
                <li><span style={{ color: 'var(--edk-ink-3)' }}>{breadcrumb.parent}</span></li>
                <li style={{ color: 'var(--edk-border-mid)' }} aria-hidden>›</li>
              </>
            ) : null}
            <li><span style={{ color: 'var(--edk-ink)' }}>{breadcrumb.current}</span></li>
          </ol>
        </nav>

        {/* Single global search: max 520px, 32px height, rounded-md */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-[520px] min-w-0 flex justify-center lg:justify-start">
          <div className="relative w-full max-w-[380px] lg:max-w-[520px] group">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors group-focus-within:text-[var(--blue)]"
              style={{ color: 'var(--edk-ink-3)' }}
              strokeWidth={2}
            />
            <input
              type="search"
              inputMode="search"
              value={searchValue}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search products, SKU, or barcode…"
              className="w-full h-8 pl-9 pr-20 rounded-md border outline-none transition-all duration-150 text-[12px] placeholder:opacity-70 focus:border-[var(--blue)] focus:shadow-[0_0_0_2px_var(--blue-soft)]"
              style={{
                background: 'var(--edk-bg)',
                borderColor: 'var(--edk-border-mid)',
                color: 'var(--edk-ink)',
                fontFamily: 'var(--edk-font-ui)',
              }}
              aria-label="Search products, SKU, or barcode"
            />
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-medium rounded px-1.5 py-0.5 hidden sm:inline"
              style={{ fontFamily: 'var(--edk-font-mono)', color: 'var(--edk-ink-3)', background: 'var(--edk-border)' }}
            >
              ⌘K
            </span>
          </div>
        </form>

        {/* Right: sync indicator, Log out 32px, bell with red dot */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
          <span
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-semibold uppercase shrink-0"
            style={{
              ...(isDegraded
                ? { background: 'var(--edk-red-soft)', borderColor: 'var(--edk-red-border)', color: 'var(--edk-red)' }
                : { background: 'var(--edk-amber-bg)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--edk-green)' }),
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden />
            {isDegraded ? 'Offline' : 'Live'}
          </span>
          <button
            type="button"
            className="relative w-8 h-8 rounded-md border flex items-center justify-center min-w-[44px] min-h-[44px] shrink-0"
            style={{ background: 'var(--edk-bg)', borderColor: 'var(--edk-border-mid)', color: 'var(--edk-ink-2)' }}
            aria-label="Notifications"
            disabled
          >
            <Bell className="w-4 h-4" strokeWidth={2} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-[var(--edk-surface)] bg-[var(--edk-red)]" aria-hidden />
          </button>
          <Link
            to="/pos"
            className="flex items-center justify-center gap-1.5 h-8 px-4 rounded-md text-white text-[13px] font-semibold min-h-[32px] shrink-0"
            style={{ background: 'var(--blue)', boxShadow: '0 2px 8px var(--blue-glow)' }}
          >
            <ShoppingCart className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">New Sale</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center justify-center gap-1.5 h-8 px-3 rounded-md border min-h-[32px] shrink-0 text-[12px] font-medium"
            style={{ background: 'var(--edk-surface)', borderColor: 'var(--edk-border)', color: 'var(--edk-ink-2)' }}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
            <span className="hidden sm:inline">{isLoggingOut ? 'Signing out…' : 'Log out'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
