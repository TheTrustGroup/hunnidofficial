// src/components/layout/Header.tsx - Premium Glass Header
// Single topbar search only (no duplicate on Inventory). Search syncs with URL ?q= on /inventory.
import { useState, FormEvent } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout } = useAuth();
  const isInventory = location.pathname === '/inventory';
  const searchFromUrl = isInventory ? (searchParams.get('q') ?? '') : '';
  const [localQuery, setLocalQuery] = useState('');
  const searchValue = isInventory ? searchFromUrl : localQuery;
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    <header className="fixed top-0 left-0 lg:left-[244px] right-0 h-14 border-b border-[rgba(0,0,0,0.07)] flex items-center gap-3 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] lg:px-5 pt-[var(--safe-top)] z-10 bg-white">
      {/* Single topbar search: flex-1 max-w-[540px], placeholder per spec, ⌘K badge, blue focus ring */}
      <div className="flex-1 max-w-[540px] min-w-0">
        <form onSubmit={handleSearchSubmit} className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#8892A0] pointer-events-none" strokeWidth={2} strokeLinecap="round" />
          <input
            type="search"
            inputMode="search"
            value={searchValue}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder="Search products, SKU, or barcode…"
            className="w-full h-11 pl-10 pr-14 rounded-[var(--radius-search)] bg-[#F4F6F9] border border-[rgba(0,0,0,0.11)] text-[13px] text-[#0D1117] placeholder:text-[#8892A0] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[rgba(92,172,250,0.35)] focus:shadow-[0_0_0_3px_rgba(92,172,250,0.10)]"
            aria-label="Search products, SKU, or barcode"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-[#8892A0] font-medium tracking-wide">⌘K</span>
        </form>
      </div>

      {/* Right: notification bell (icon-only 35×35), log out outlined */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <button
          type="button"
          className="relative w-11 h-11 rounded-[var(--radius-search)] border border-[rgba(0,0,0,0.11)] bg-white flex items-center justify-center text-[#424958] hover:bg-[#F4F6F9] transition-colors min-w-[44px] min-h-[44px]"
          aria-label="View notifications"
          title="Notifications"
          disabled
        >
          <Bell className="w-[18px] h-[18px]" strokeWidth={2} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#5CACFA] rounded-full border-[1.5px] border-white" aria-hidden />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center justify-center gap-1.5 h-11 px-3 rounded-[var(--radius-search)] border border-[rgba(0,0,0,0.11)] bg-white text-[12px] font-medium text-[#424958] hover:bg-[#F4F6F9] transition-colors min-h-[44px]"
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
