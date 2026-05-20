// Hunnid Official sidebar — design system: 220px (200px POS), white, 0.5px border, warehouse pill, nav sections.
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { ROLES } from '../../types/permissions';
import { BASE_NAVIGATION } from '../../config/navigation';

function getRoleDisplayName(roleId: string | undefined): string {
  if (roleId == null || roleId === '') return '—';
  const key = roleId === 'super_admin' ? 'SUPER_ADMIN' : roleId.toUpperCase().replace(/\s+/g, '_');
  return ROLES[key]?.name ?? roleId;
}

/** Logo mark: black square 32×32, border-radius 8px, "H" Bebas Neue 14px white */
function LogoMark() {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: 'var(--h-black)', borderRadius: 8 }}
      aria-hidden
    >
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--h-white)' }}>H</span>
    </div>
  );
}

const NAV_SECTIONS: { label: string; paths: string[] }[] = [
  { label: 'MAIN', paths: ['/', '/inventory', '/orders', '/pos'] },
  { label: 'ANALYTICS', paths: ['/sales', '/deliveries', '/reports'] },
  { label: 'ADMIN', paths: ['/users', '/settings'] },
];

function getSectionForPath(path: string): string {
  for (const s of NAV_SECTIONS) {
    if (s.paths.includes(path) || (path === '/' && s.paths.includes('/'))) return s.label;
    if (path.startsWith('/reports') && s.label === 'ANALYTICS') return s.label;
    if (path.startsWith('/settings') && s.label === 'ADMIN') return s.label;
  }
  return 'MAIN';
}

export function Sidebar() {
  const location = useLocation();
  const { user, hasPermission, hasAnyPermission, switchRole } = useAuth();
  const {
    warehouses,
    currentWarehouseId,
    setCurrentWarehouseId,
    currentWarehouse,
    isWarehouseBoundToSession,
    isLoading: warehousesLoading,
  } = useWarehouse();

  const isPosPage = location.pathname === '/pos';
  const showWarehouseSwitcher = !warehousesLoading && warehouses.length > 0 && !isWarehouseBoundToSession;
  const canSwitchWarehouse = showWarehouseSwitcher && warehouses.length > 1;
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);
  const canSeeSwitchRole = user?.role === 'admin' || user?.role === 'super_admin';

  const filteredNav = BASE_NAVIGATION.filter(
    (item) =>
      (item.permission == null && 'to' in item) ||
      ('permission' in item && item.permission && hasPermission(item.permission)) ||
      ('anyPermissions' in item && item.anyPermissions && hasAnyPermission(item.anyPermissions))
  ).filter((item) => !(item.name === 'Inventory' && isWarehouseBoundToSession));

  const warehouse = currentWarehouse ?? warehouses[0];
  const warehouseName = warehouse?.name ?? '—';

  const sidebarWidth = isPosPage ? 200 : 220;

  return (
    <aside
      className="fixed left-0 top-0 min-h-[var(--h-viewport)] max-h-[var(--h-viewport)] flex flex-col flex-shrink-0 z-20 overflow-visible"
      style={{
        width: sidebarWidth,
        background: 'var(--h-white)',
        borderRight: '0.5px solid var(--h-gray-200)',
        padding: '20px 16px',
      }}
    >
      {/* Logo: mark + HUNNID / OFFICIAL or POS Terminal */}
      <div className="flex items-center gap-3 flex-shrink-0 pt-[max(0, var(--safe-top))] pb-4" style={{ borderBottom: '0.5px solid var(--h-gray-200)' }}>
        <LogoMark />
        <div className="flex flex-col leading-none gap-0 min-w-0 flex-1 overflow-hidden">
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              letterSpacing: '0.02em',
              color: 'var(--h-gray-900)',
            }}
          >
            HUNNID
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--h-gray-400)',
            }}
          >
            {isPosPage ? 'POS TERMINAL' : 'OFFICIAL'}
          </span>
        </div>
      </div>

      {/* Warehouse pill */}
      {showWarehouseSwitcher && (
        <div className="pt-[14px] pb-1.5 flex-shrink-0">
          <div className="relative">
            {canSwitchWarehouse ? (
              <>
                <button
                  type="button"
                  onClick={() => setWarehouseDropdownOpen((o) => !o)}
                  className="w-full flex items-center gap-2 rounded-full transition-colors"
                  style={{
                    padding: '5px 12px',
                    background: 'var(--h-gray-100)',
                    fontSize: 12,
                    fontWeight: 500,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--h-gray-700)',
                  }}
                  aria-expanded={warehouseDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select warehouse"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--h-green)] flex-shrink-0" aria-hidden />
                  <span className="flex-1 text-left truncate">{warehouseName}</span>
                  <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 opacity-70" strokeWidth={2} aria-hidden />
                </button>
                {warehouseDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" aria-hidden onClick={() => setWarehouseDropdownOpen(false)} />
                    <ul
                      role="listbox"
                      className="absolute left-0 top-full mt-1 z-20 min-w-[180px] py-1.5 rounded-[var(--radius-md)]"
                      style={{
                        background: 'var(--h-white)',
                        border: '0.5px solid var(--h-gray-200)',
                      }}
                    >
                      {warehouses.map((w) => (
                        <li key={w.id} role="option" aria-selected={currentWarehouseId === w.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentWarehouseId(w.id);
                              setWarehouseDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[14px] rounded-[var(--radius-md)] mx-0.5 transition-colors"
                            style={{
                              fontFamily: 'var(--font-body)',
                              color: currentWarehouseId === w.id ? 'var(--h-blue)' : 'var(--h-gray-500)',
                              background: currentWarehouseId === w.id ? 'var(--h-blue-light)' : 'transparent',
                              fontWeight: currentWarehouseId === w.id ? 500 : 400,
                            }}
                          >
                            {w.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <div
                className="flex items-center gap-2 rounded-full"
                style={{
                  padding: '5px 12px',
                  background: 'var(--h-gray-100)',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--h-gray-700)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--h-green)] flex-shrink-0" aria-hidden />
                <span className="flex-1 truncate">{warehouseName}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav: grouped by section */}
      <nav className="flex-1 min-h-0 py-2 overflow-y-auto" aria-label="Main navigation">
        {NAV_SECTIONS.map((section) => {
          const items = filteredNav.filter((item) => {
            const sectionForItem = getSectionForPath(item.to);
            return sectionForItem === section.label;
          });
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="mb-2">
              <div
                className="px-3 py-0 mb-1.5"
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--h-gray-300)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {section.label}
              </div>
              {items.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-[var(--radius-md)] transition-colors ${
                      isActive ? '' : 'hover:opacity-90'
                    }`
                  }
                  style={({ isActive }) => ({
                    padding: '9px 12px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 14,
                    color: isActive ? 'var(--h-blue)' : 'var(--h-gray-500)',
                    fontWeight: isActive ? 500 : 400,
                    background: isActive ? 'var(--h-blue-light)' : 'transparent',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center"
                        style={{ color: isActive ? 'var(--h-blue)' : 'var(--h-gray-500)' }}
                      >
                        <item.icon className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span className="flex-1 truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* User row (bottom) */}
      <div
        className="p-3 flex-shrink-0 border-t min-h-[4rem]"
        style={{ borderColor: 'var(--h-gray-200)' }}
      >
        <div className="flex items-center gap-2 p-2 rounded-[var(--radius-md)] cursor-default">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 13,
              background: 'var(--h-blue)',
            }}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="truncate font-medium"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--h-gray-900)',
              }}
              title={user?.email}
            >
              {user?.fullName ?? user?.email ?? '—'}
            </p>
            {canSeeSwitchRole && user ? (
              <label className="block mt-0.5">
                <span className="sr-only">Switch role (for testing)</span>
                <select
                  value={user.role}
                  onChange={(e) => switchRole(e.target.value)}
                  className="w-full py-0.5 pr-5 rounded bg-transparent border-0 cursor-pointer focus:ring-0 focus:outline-none"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    color: 'var(--h-gray-400)',
                  }}
                  aria-label="Switch role"
                >
                  {Object.values(ROLES).map((role) => (
                    <option key={role.id} value={role.id} style={{ background: 'var(--h-white)', color: 'var(--h-gray-900)' }}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p
                className="mt-0.5 font-normal"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--h-gray-400)',
                }}
              >
                {getRoleDisplayName(user?.role)}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
