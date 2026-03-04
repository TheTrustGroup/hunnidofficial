/**
 * Bottom tab bar for mobile (CHANGE 7): Orders | Inventory | POS | Sales | Reports.
 * Sidebar remains hidden on mobile; this is the primary nav. 44×44px tap targets, font ≥11px.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { BASE_NAVIGATION } from '../../config/navigation';

const BOTTOM_NAV_PATHS = ['/orders', '/inventory', '/pos', '/sales', '/reports'];

export function BottomNav() {
  const location = useLocation();
  const { hasPermission, hasAnyPermission } = useAuth();
  const { isWarehouseBoundToSession } = useWarehouse();

  const visibleTabs = BASE_NAVIGATION.filter((item) => {
    if (!BOTTOM_NAV_PATHS.includes(item.to)) return false;
    if (item.name === 'Inventory' && isWarehouseBoundToSession) return false;
    if (item.permission != null) return hasPermission(item.permission);
    if (item.anyPermissions != null) return hasAnyPermission(item.anyPermissions);
    return true;
  });

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch bg-white border-t border-[rgba(0,0,0,0.08)] safe-area-pb"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
      aria-label="Main navigation"
    >
      {visibleTabs.map((tab) => {
        const isActive = location.pathname === tab.to || (tab.to === '/' && location.pathname === '/');
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] pt-2 text-[11px] font-medium transition-colors ${
              isActive ? 'text-[#5CACFA]' : 'text-[#8892A0]'
            }`}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={2} aria-hidden />
            <span>{tab.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
