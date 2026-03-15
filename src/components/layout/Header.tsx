// src/components/layout/Header.tsx — TopBar: breadcrumb, search (centered), status pill, bell, log out
import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApiStatus } from '../../contexts/ApiStatusContext';

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

  return (
    <header
      className="sticky top-0 left-0 lg:left-[244px] right-0 border-b shadow-[var(--shadow-sm)] z-50 grid grid-rows-[auto_auto] grid-cols-[1fr_auto] gap-x-2 gap-y-2 md:grid-rows-1 md:grid-cols-[1fr_auto_1fr] md:items-center pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] lg:px-4 pt-[var(--safe-top)] py-3 md:py-0 min-h-12 md:min-h-[56px]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Col 1 row 1: breadcrumb. On md: col 1 */}
      <nav className="min-w-0 flex items-center h-10 md:h-auto col-start-1 row-start-1" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-[12px] font-medium truncate" style={{ fontFamily: 'var(--font-b)' }}>
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

      {/* Col 2 row 1 on mobile: status + bell + logout. Row 2 on mobile: search. On md: col 2 = search, col 3 = icons */}
      <div className="flex items-center gap-2 flex-shrink-0 col-start-2 row-start-1 md:col-start-3 md:row-start-1">
        <span
          className="flex items-center gap-1.5 h-7 px-2 rounded-md border text-[10px] font-bold uppercase shrink-0"
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
          className="relative min-w-touch min-h-touch w-10 h-10 rounded-xl border flex items-center justify-center transition-colors shrink-0"
          style={{
            background: 'var(--elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
          }}
          aria-label="View notifications"
          title="Notifications"
          disabled
        >
          <Bell className="w-4 h-4" strokeWidth={2} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full border-[1.5px] border-[var(--surface)]"
            style={{ background: 'var(--red-status)' }}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 min-h-touch min-w-touch px-4 rounded-xl border transition-colors shrink-0"
          style={{
            background: 'var(--elevated)',
            borderColor: 'var(--border)',
            color: 'var(--text-2)',
            fontFamily: 'var(--font-b)',
            fontSize: '11px',
          }}
          title="Log out"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4" strokeWidth={2} />
          <span className="hidden sm:inline">{isLoggingOut ? 'Signing out…' : 'Log out'}</span>
        </button>
      </div>

      {/* Row 2 col 1-2 on mobile: search full width. On md: col 2 row 1 */}
      <div className="col-span-2 col-start-1 row-start-2 md:col-span-1 md:col-start-2 md:row-start-1 flex justify-center min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[380px] group">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
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
            className="w-full min-h-touch h-11 pl-10 pr-14 rounded-xl border outline-none transition-[duration-150] focus:border-[var(--blue)] focus:shadow-[0_0_0_2px_var(--blue-dim)] [&::placeholder]:text-[var(--text-3)]"
            style={{
              background: 'var(--elevated)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
              fontSize: '12px',
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
    </header>
  );
}
