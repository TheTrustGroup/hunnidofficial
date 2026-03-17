/**
 * Mobile bottom nav — reference: flat white bar, pill-shaped active state (HunnidOfficial blue).
 * All five tabs equal; no raised center. z-index 40 so modals/sheets sit above.
 */
import { NavLink, useLocation } from 'react-router-dom';
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

const ICON_SIZE = 18;
const LABEL_SIZE_PX = 10;

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
      className="lg:hidden fixed left-0 right-0 flex flex-col items-stretch justify-end"
      style={{
        height: 'var(--bottom-nav-h)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        bottom: 0,
        zIndex: 'var(--z-bottom-nav)',
        background: 'var(--edk-surface)',
        borderTop: '1px solid var(--edk-border)',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}
      aria-label="Main navigation"
    >
      <div
        className="flex-1 grid items-center gap-0 px-2 min-h-0"
        style={{
          gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`,
          minHeight: 48,
        }}
      >
        {visibleTabs.map((tab) => {
          const isActive = isTabActive(pathname, tab.to);
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-200 min-h-[44px] min-w-[44px] py-2 px-2"
              style={{
                backgroundColor: isActive ? 'var(--blue-soft)' : 'transparent',
                borderRadius: 14,
              }}
            >
              <span className="flex items-center justify-center flex-shrink-0">
                <Icon
                  strokeWidth={2}
                  aria-hidden
                  className="flex-shrink-0"
                  style={{
                    width: ICON_SIZE,
                    height: ICON_SIZE,
                    color: isActive ? 'var(--blue)' : 'var(--edk-ink)',
                  }}
                />
              </span>
              <span
                className="flex-shrink-0 font-medium tracking-tight"
                style={{
                  fontSize: LABEL_SIZE_PX,
                  lineHeight: 1.2,
                  color: isActive ? 'var(--blue)' : 'var(--edk-ink)',
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
