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

  // Mobile topbar (max-width: 768px): 52px, page title, search icon, LIVE pill, bell, cart
  if (isMobile) {
    return (
      <header
        className="md:hidden fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-[#E0DED8] flex items-center px-4 gap-2 z-50"
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        <span className="flex-1 text-[13px] font-medium text-[#1A1916] truncate">
          {getPageTitle(location.pathname)}
        </span>
        <button
          type="button"
          onClick={() => navigate('/inventory')}
          className="w-8 h-8 rounded-lg bg-[#EEEDE9] flex items-center justify-center"
          aria-label="Search products"
        >
          <Search size={14} className="text-[#6B6860]" />
        </button>
        <div className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold bg-[#E8F7EF] text-[#12A05C]">
          <div className="w-[5px] h-[5px] rounded-full bg-[#12A05C]" />
          LIVE
        </div>
        <button
          type="button"
          className="w-8 h-8 rounded-lg bg-[#EEEDE9] relative flex items-center justify-center"
          aria-label="Notifications"
        >
          <Bell size={14} className="text-[#6B6860]" />
        </button>
        <Link
          to="/pos"
          className="w-8 h-8 rounded-lg bg-[#1B6FE8] flex items-center justify-center"
          aria-label="Open POS"
        >
          <ShoppingCart size={14} className="text-white" />
        </Link>
      </header>
    );
  }

  return (
    <header
      className="sticky top-0 left-0 lg:left-[244px] right-0 h-14 flex items-center gap-3 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] lg:px-5 pt-[var(--safe-top)] z-50 border-b shadow-[var(--shadow-sm)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Left: breadcrumb — Inter 500 13px */}
      <nav className="flex-shrink-0 min-w-0" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-[13px] font-medium truncate" style={{ fontFamily: 'var(--font-b)' }}>
          {breadcrumb.parent != null ? (
            <>
              <li>
                <span style={{ color: 'var(--text-3)' }}>{breadcrumb.parent}</span>
              </li>
              <li style={{ color: 'var(--border-md)' }} aria-hidden>›</li>
            </>
          ) : null}
          <li>
            <span style={{ color: 'var(--text)' }}>{breadcrumb.current}</span>
          </li>
        </ol>
      </nav>

      {/* Center: search bar */}
      <div className="flex-1 max-w-[540px] min-w-0 flex justify-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[380px] group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
            style={{ color: 'var(--text-3)' }}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <input
            type="search"
            inputMode="search"
            value={searchValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search products, SKU, or barcode…"
            className="w-full h-11 pl-10 pr-14 rounded-[10px] border outline-none transition-[duration-150] focus:border-[var(--blue)] focus:shadow-[0_0_0_3px_var(--blue-dim)] [&::placeholder]:text-[var(--text-3)]"
            style={{
              background: 'var(--elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              fontSize: '13px',
              fontFamily: 'var(--font-b)',
            }}
            onMouseEnter={(e) => {
              if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border-md)';
            }}
            onMouseLeave={(e) => {
              if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border)';
            }}
            aria-label="Search products, SKU, or barcode"
          />
          <span
            className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-medium tracking-wide rounded px-1.5 py-0.5"
            style={{ fontFamily: 'var(--font-m)', color: 'var(--text-3)', background: 'var(--border)' }}
          >
            ⌘K
          </span>
        </form>
      </div>

      {/* Right: Online/Offline pill, Bell, New Sale, Log out */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        {/* Status pill */}
        <span
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-bold uppercase shrink-0"
          style={{
            fontFamily: 'var(--font-d)',
            ...(isDegraded
              ? { background: 'rgba(220,38,38,0.08)', borderColor: 'rgba(220,38,38,0.2)', color: 'var(--red-status)' }
              : { background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)', color: 'var(--green)' }),
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden />
          {isDegraded ? 'Offline' : 'Live'}
        </span>

        <button
          type="button"
          className="relative w-11 h-11 rounded-[9px] border flex items-center justify-center transition-colors min-w-[44px] min-h-[44px] shrink-0"
          style={{
            background: 'var(--elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
          }}
          aria-label="View notifications"
          title="Notifications"
          disabled
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-[var(--surface)]"
            style={{ background: 'var(--red-status)' }}
            aria-hidden
          />
        </button>

        <Link
          to="/pos"
          className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-[10px] text-white text-[13px] font-semibold transition-all duration-200 hover:-translate-y-px min-h-[44px] shrink-0"
          style={{
            background: 'var(--blue)',
            boxShadow: '0 2px 8px var(--blue-glow)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--blue)';
          }}
        >
          <ShoppingCart className="w-[18px] h-[18px]" strokeWidth={2} />
          <span className="hidden sm:inline">New Sale</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-1.5 h-11 px-3 rounded-[10px] border transition-colors min-h-[44px] shrink-0"
          style={{
            background: 'var(--elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
            fontFamily: 'var(--font-b)',
            fontSize: '12px',
          }}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
          <span className="hidden sm:inline">{isLoggingOut ? 'Signing out…' : 'Log out'}</span>
        </button>
      </div>
    </header>
  );
}
