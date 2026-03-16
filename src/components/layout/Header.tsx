// Hunnid Official topbar — design system: 56px height, breadcrumb, search, LIVE pill, bell, logout, CTA.
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
      className="sticky top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 h-14 border-b"
      style={{
        background: 'var(--h-white)',
        borderColor: 'var(--h-gray-200)',
        borderWidth: '0.5px',
        padding: '0 24px',
        height: 56,
      }}
    >
      {/* Breadcrumb */}
      <nav className="min-w-0 flex items-center shrink-0" aria-label="Breadcrumb">
        <ol
          className="flex items-center gap-1.5 truncate"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--h-gray-400)',
          }}
        >
          {breadcrumb.parent != null ? (
            <>
              <li>{breadcrumb.parent}</li>
              <li aria-hidden> / </li>
            </>
          ) : null}
          <li style={{ color: breadcrumb.parent == null ? 'var(--h-gray-400)' : 'var(--h-gray-500)' }}>
            {breadcrumb.current}
          </li>
        </ol>
      </nav>

      {/* Search + LIVE + bell + logout + CTA */}
      <div className="flex items-center gap-3 flex-1 justify-end min-w-0 max-w-[480px]">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0 max-w-[360px]">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--h-gray-400)' }}
            strokeWidth={2}
          />
          <input
            type="search"
            inputMode="search"
            value={searchValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search products, SKU or name…"
            className="w-full h-9 pl-9 pr-3 rounded-[var(--radius-md)] outline-none transition-colors focus:border-[var(--h-blue)]"
            style={{
              background: 'var(--h-white)',
              border: '0.5px solid var(--h-gray-300)',
              padding: '8px 14px',
              fontSize: 13,
              fontFamily: 'var(--font-body)',
              color: 'var(--h-gray-900)',
            }}
            aria-label="Search products, SKU or name"
          />
        </form>

        {/* LIVE pill */}
        <span
          className="inline-flex items-center gap-1.5 rounded-full shrink-0"
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            background: isDegraded ? 'var(--h-red-light)' : 'var(--h-green-light)',
            color: isDegraded ? 'var(--h-red)' : 'var(--h-green)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: 'currentColor' }}
            aria-hidden
          />
          {isDegraded ? 'Offline' : 'LIVE'}
        </span>

        <button
          type="button"
          className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors hover:opacity-90"
          style={{ background: 'var(--h-gray-100)', color: 'var(--h-gray-500)' }}
          aria-label="View notifications"
          title="Notifications"
          disabled
        >
          <Bell className="w-4 h-4" strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-2 h-9 px-3 rounded-[var(--radius-md)] shrink-0 transition-colors hover:opacity-90"
          style={{
            background: 'var(--h-gray-100)',
            border: '0.5px solid var(--h-gray-300)',
            color: 'var(--h-gray-700)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
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
