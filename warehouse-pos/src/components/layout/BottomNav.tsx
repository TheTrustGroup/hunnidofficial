/**
 * Bottom tab bar (mobile): Dashboard | Inventory | Orders | POS | More.
 * Matches sample: white bar, active tab with red icon/text and light pink/red background.
 * No side menu; excess items live under More. 44×44px tap targets, font ≥11px.
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

export function BottomNav() {
  const { pathname } = useLocation();
  const { hasPermission } = useAuth();
  const { isWarehouseBoundToSession } = useWarehouse();

  const visibleTabs = BOTTOM_NAV_TABS.filter((tab) => {
    if (tab.name === 'More') return true;
    if (tab.name === 'Inventory' && isWarehouseBoundToSession) return false;
    if (tab.permission != null) return hasPermission(tab.permission);
    return true;
  });

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch bg-white border-t border-[rgba(0,0,0,0.08)] safe-area-pb"
      style={{ paddingBottom: 'max(var(--safe-bottom), var(--grid-8, 8px))' }}
      aria-label="Main navigation"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(pathname, tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[var(--touch-min,44px)] pt-2 text-[var(--text-meta,11px)] font-medium transition-colors rounded-[var(--radius-base,8px)] mx-0.5 my-1 ${
              isActive ? 'text-[var(--blue)] bg-[var(--sidebar-active-bg)]' : 'text-slate-500'
            }`}
          >
            <Icon
              className="w-5 h-5 flex-shrink-0"
              strokeWidth={2}
              aria-hidden
              style={isActive ? { color: 'var(--sidebar-active-icon)' } : { color: '#8892A0' }}
            />
            <span>{tab.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
