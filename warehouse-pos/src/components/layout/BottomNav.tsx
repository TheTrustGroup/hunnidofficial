/**
 * Ultra-modern mobile bottom nav: floating pill, clear hierarchy, never overlaps sheets/modals.
 * z-index 40 so modals (50) and Cart sheet (50) always sit on top. Single source of truth: --bottom-nav-h.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { BOTTOM_NAV_TABS } from '../../config/navigation';

const MORE_PATHS = ['/more', '/sales', '/deliveries', '/reports', '/users', '/settings'];

function isTabActive(pathname: string, tabTo: string): boolean {
  if (tabTo === '/more') return MORE_PATHS.includes(pathname);
  if (tabTo === '/') return pathname === '/';
  return pathname === tabTo;
}

function orderTabsWithPosCenter(tabs: typeof BOTTOM_NAV_TABS): (typeof BOTTOM_NAV_TABS)[number][] {
  const pos = tabs.find((t) => t.to === '/pos');
  const rest = tabs.filter((t) => t.to !== '/pos');
  if (!pos) return rest;
  const left = rest.slice(0, 2);
  const right = rest.slice(2);
  return [...left, pos, ...right];
}

export function BottomNav() {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const { isWarehouseBoundToSession } = useWarehouse();

  const filtered = BOTTOM_NAV_TABS.filter((tab) => {
    if (tab.name === 'More') return true;
    if (tab.name === 'Inventory' && isWarehouseBoundToSession) return false;
    if (tab.permission != null) return hasPermission(tab.permission);
    return true;
  });
  const visibleTabs = orderTabsWithPosCenter(filtered);

  return (
    <nav
      className="lg:hidden fixed left-0 right-0 flex items-end justify-center pointer-events-none"
      style={{
        height: 'var(--bottom-nav-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        bottom: 0,
        zIndex: 'var(--z-bottom-nav)',
        background: 'linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 70%, transparent 100%)',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(0,0,0,0.05)',
      }}
      aria-label="Main navigation"
    >
      <div
        className="bottom-nav-pill pointer-events-auto flex-shrink-0 mx-4 mb-2 rounded-[28px] border border-slate-200/80 grid gap-0"
        style={{
          background: 'rgba(255,255,255,0.98)',
          boxShadow: '0 -1px 0 0 rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.1), 0 2px 12px rgba(0,0,0,0.06)',
          padding: '10px 8px',
          gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`,
          alignItems: 'end',
          minHeight: 52,
        }}
      >
        {visibleTabs.map((tab) => {
          const isPos = tab.to === '/pos';
          const isActive = isTabActive(pathname, tab.to);
          const Icon = tab.icon;

          if (isPos) {
            return (
              <div
                key={tab.to}
                className="flex flex-col items-center gap-1"
                style={{ marginTop: '-20px' }}
              >
                <NavLink
                  to={tab.to}
                  className="flex items-center justify-center rounded-[20px] transition-all duration-200 hover:scale-[1.03] active:scale-[1.01] min-w-[52px] min-h-[52px] w-[52px] h-[52px] border-2 border-white"
                  style={{
                    background: 'var(--blue)',
                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4), 0 2px 8px rgba(0,0,0,0.08)',
                  }}
                  aria-label="POS"
                >
                  <ShoppingCart
                    className="w-6 h-6 text-white flex-shrink-0"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </NavLink>
                <span
                  className="text-[10px] font-semibold tracking-tight"
                  style={{ color: 'var(--blue)' }}
                >
                  POS
                </span>
              </div>
            );
          }

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center gap-1 py-1.5 px-0 rounded-2xl transition-colors duration-200 min-h-[44px] min-w-[44px] justify-end"
            >
              <span
                className={`flex items-center justify-center rounded-full w-10 h-10 flex-shrink-0 transition-all duration-200 ${
                  isActive ? 'bg-[var(--blue-soft)]' : 'bg-transparent'
                }`}
              >
                <Icon
                  strokeWidth={2}
                  aria-hidden
                  className="flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    color: isActive ? 'var(--blue)' : 'var(--edk-ink-3, #8A8784)',
                  }}
                />
              </span>
              <span
                className={`text-[10px] font-medium tracking-tight ${
                  isActive ? 'text-[var(--blue)]' : 'text-slate-500'
                }`}
                style={{ fontWeight: isActive ? 600 : 500 }}
              >
                {tab.name}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
