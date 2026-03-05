/**
 * Bottom tab bar (mobile): Dashboard | Inventory | Orders | POS | More.
 * Compact layout: small icons and labels so the bar stays low-profile.
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
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch bg-white/95 backdrop-blur-sm border-t border-slate-200/80 safe-area-pb"
      style={{ paddingBottom: 'max(var(--safe-bottom), 6px)', paddingTop: 6 }}
      aria-label="Main navigation"
    >
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = isTabActive(pathname, tab.to);
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-0 py-1.5 text-[10px] font-medium transition-colors rounded-md mx-0.5 ${
              isActive ? 'text-[var(--blue)] bg-[var(--sidebar-active-bg)]' : 'text-slate-500'
            }`}
          >
            <Icon
              className="w-4 h-4 flex-shrink-0"
              strokeWidth={2}
              aria-hidden
              style={isActive ? { color: 'var(--sidebar-active-icon)' } : { color: '#8892A0' }}
            />
            <span className="leading-tight">{tab.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
