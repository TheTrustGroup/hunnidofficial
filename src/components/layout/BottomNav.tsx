/**
 * Phase 4: Mobile bottom nav — Dashboard | Inventory | POS | Sales | More.
 * POS tab: elevated #5CACFA circle. Active: #5CACFA icon + label.
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
        const isPosTab = tab.to === '/pos';
        const activeColor = isActive ? 'var(--blue)' : '#64748b';

        if (isPosTab) {
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1.5 touch-manipulation"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg border-2 border-white"
                style={{
                  background: isActive ? 'var(--blue)' : 'var(--blue-dim)',
                  borderColor: 'white',
                  boxShadow: isActive ? '0 4px 14px var(--blue-glow)' : '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <Icon
                  className="w-6 h-6 flex-shrink-0"
                  strokeWidth={2}
                  aria-hidden
                  style={{ color: isActive ? '#000' : 'var(--blue)' }}
                />
              </div>
              <span
                className="text-[11px] font-medium leading-tight"
                style={{ color: activeColor, fontFamily: 'var(--font-d)' }}
              >
                {tab.name}
              </span>
            </NavLink>
          );
        }

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] min-w-[44px] py-1.5 px-2 text-[11px] font-medium transition-colors rounded-lg mx-0.5 ${
              isActive ? 'bg-[var(--blue-dim)]' : ''
            }`}
          >
            <Icon
              className="w-6 h-6 flex-shrink-0"
              strokeWidth={2}
              aria-hidden
              style={{ color: activeColor }}
            />
            <span className="leading-tight" style={{ color: activeColor, fontFamily: 'var(--font-d)' }}>
              {tab.name}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}
