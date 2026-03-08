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
      className="sticky top-0 left-0 lg:left-[244px] right-0 h-12 grid grid-cols-[1fr_auto_1fr] items-center gap-2 pl-[max(0.75rem,var(--safe-left))] pr-[max(0.75rem,var(--safe-right))] lg:px-4 pt-[var(--safe-top)] z-50 border-b shadow-[var(--shadow-sm)]"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      {/* Left: breadcrumb */}
      <nav className="min-w-0 flex items-center" aria-label="Breadcrumb">
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

      {/* Center: search bar — centered in header */}
      <div className="flex justify-center min-w-0 px-2">
        <form onSubmit={handleSearchSubmit} className="relative w-full max-w-[380px] group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
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
            className="w-full h-9 pl-9 pr-12 rounded-lg border outline-none transition-[duration-150] focus:border-[var(--blue)] focus:shadow-[0_0_0_2px_var(--blue-dim)] [&::placeholder]:text-[var(--text-3)]"
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

      {/* Right: Online/Offline pill, Bell, Log out */}
      <div className="flex items-center gap-2 justify-end min-w-0">
        {/* Status pill */}
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
          className="relative w-9 h-9 rounded-lg border flex items-center justify-center transition-colors min-w-[36px] min-h-[36px] shrink-0"
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
          className="flex items-center justify-center gap-1.5 h-9 px-2.5 rounded-lg border transition-colors min-h-[36px] shrink-0"
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
    </header>
  );
}
