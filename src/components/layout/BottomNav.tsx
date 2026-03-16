/**
 * Mobile bottom nav: frosted pill with 5 items — Dashboard | Inventory | POS (center hero) | Orders | More.
 * POS is a raised solid blue button; others are icon+label with blue-soft active state.
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

/** Reorder so POS is always at index 2 (center). */
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
      className="lg:hidden fixed left-0 right-0 z-[200]"
      style={{
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        bottom: 0,
      }}
      aria-label="Main navigation"
    >
      <div
        className="mx-2.5 mb-1.5 rounded-2xl border grid gap-0"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '8px 8px',
          gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`,
          alignItems: 'end',
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
                className="flex flex-col items-center gap-0.5"
                style={{ marginTop: '-18px' }}
              >
                <NavLink
                  to={tab.to}
                  className="flex items-center justify-center rounded-2xl transition-all duration-200 hover:scale-105 active:scale-105 min-w-[48px] min-h-[48px] w-12 h-12"
                  style={{
                    background: 'var(--blue)',
                    border: '2px solid var(--bg)',
                    boxShadow: '0 4px 14px var(--blue-glow), 0 2px 6px rgba(0,0,0,0.08)',
                  }}
                  aria-label="POS"
                >
                  <ShoppingCart
                    className="w-5 h-5 text-white flex-shrink-0"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </NavLink>
                <span
                  className="text-[9px] font-semibold"
                  style={{ fontFamily: 'var(--font-b)', color: 'var(--blue)' }}
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
              className="flex flex-col items-center gap-0.5 py-1 px-0 rounded-lg transition-all duration-200 min-h-[44px] min-w-[44px] justify-end"
              style={{ paddingTop: 4, paddingBottom: 4 }}
            >
              <span
                className="flex items-center justify-center rounded-lg w-9 h-9 flex-shrink-0 transition-colors"
                style={{ background: isActive ? 'var(--blue-soft)' : 'transparent' }}
              >
                <Icon
                  className="flex-shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    color: isActive ? 'var(--h-blue)' : 'var(--h-gray-400)',
                  }}
                  strokeWidth={2}
                  aria-hidden
                />
              </span>
              <span
                className="text-[9px] font-medium"
                style={{
                  fontFamily: 'var(--font-b)',
                  color: isActive ? 'var(--h-blue)' : 'var(--h-gray-400)',
                  fontWeight: isActive ? 600 : 500,
                }}
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
