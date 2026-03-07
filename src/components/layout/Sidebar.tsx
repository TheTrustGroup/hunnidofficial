// src/components/layout/Sidebar.tsx — Hunnid Official sidebar (CHANGE 2)
// Background #0D1117, width 244px, H monogram logo, warehouse pill, nav with divider, user card.
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { ROLES } from '../../types/permissions';
import { BASE_NAVIGATION } from '../../config/navigation';

function getRoleDisplayName(roleId: string | undefined): string {
  if (roleId == null || roleId === '') return '—';
  const key = roleId === 'super_admin' ? 'SUPER_ADMIN' : roleId.toUpperCase().replace(/\s+/g, '_');
  return ROLES[key]?.name ?? roleId;
}

/** H monogram: two vertical bars + crossbar. White on blue container. */
function LogoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" fill="none" className="flex-shrink-0" aria-hidden>
      <rect x="14" y="18" width="14" height="64" rx="3" fill="white" opacity="0.95" />
      <rect x="72" y="18" width="14" height="64" rx="3" fill="white" opacity="0.95" />
      <rect x="14" y="44" width="72" height="12" rx="3" fill="white" />
    </svg>
  );
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

  const navigation = BASE_NAVIGATION.filter(
    (item) =>
      (item.permission == null && 'to' in item) ||
      ('permission' in item && item.permission && hasPermission(item.permission)) ||
      ('anyPermissions' in item && item.anyPermissions && hasAnyPermission(item.anyPermissions))
  ).filter((item) => !(item.name === 'Inventory' && isWarehouseBoundToSession));

  const adminStartIndex = navigation.findIndex((item) => item.name === 'Users');
  const mainNav = adminStartIndex >= 0 ? navigation.slice(0, adminStartIndex) : navigation;
  const adminNav = adminStartIndex >= 0 ? navigation.slice(adminStartIndex) : [];

  const warehouse = currentWarehouse ?? warehouses[0];
  const warehouseName = warehouse?.name ?? '—';

  return (
    <aside
      className="fixed left-0 top-0 w-[240px] min-w-[240px] h-[var(--h-viewport)] max-h-[var(--h-viewport)] flex flex-col flex-shrink-0 z-20"
      style={{ background: 'var(--sidebar-bg)' }}
    >
      {/* Logo: H monogram + HUNNID OFFICIAL branding (existing — do not replace) */}
      <div className="flex items-center gap-[11px] px-4 pt-[17px] pb-[15px] border-b border-white/[0.06] flex-shrink-0">
        <div
          className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
          style={{
            background: 'var(--blue)',
            boxShadow: '0 2px 8px rgba(92,172,250,0.35)',
          }}
        >
          <LogoMark />
        </div>
        <div className="flex flex-col leading-none gap-0.5 min-w-0">
          <span
            className="font-extrabold text-white truncate"
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '14px',
              letterSpacing: '0.02em',
            }}
          >
            HUNNID
          </span>
          <span
            className="font-semibold uppercase truncate"
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--blue)',
            }}
          >
            {isPosPage ? 'POS Terminal' : 'OFFICIAL'}
          </span>
        </div>
      </div>

      {/* Warehouse / Location selector (sizes match EDK) */}
      {showWarehouseSwitcher && (
        <div className="px-3 pt-3 pb-1 flex-shrink-0">
          <span
            className="block pl-0.5 mb-1.5 text-[9px] font-semibold uppercase"
            style={{ letterSpacing: '0.18em', color: 'rgba(255,255,255,0.22)' }}
          >
            {isPosPage ? 'Location' : 'Warehouse'}
          </span>
          <div className="relative">
            {canSwitchWarehouse ? (
              <>
                <button
                  type="button"
                  onClick={() => setWarehouseDropdownOpen((o) => !o)}
                  className="w-full flex items-center gap-1.5 h-9 pl-2.5 pr-2.5 rounded-[7px] transition-colors hover:bg-white/[0.06]"
                  style={{
                    background: 'var(--blue-dim)',
                    border: '1px solid rgba(92,172,250,0.25)',
                  }}
                  aria-expanded={warehouseDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select warehouse"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] flex-shrink-0" aria-hidden />
                  <span className="flex-1 text-left text-xs font-medium text-white/80 truncate">
                    {warehouseName}
                  </span>
                  <span className="text-white/[0.28] text-[10px]" aria-hidden>▾</span>
                </button>
                {warehouseDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      aria-hidden
                      onClick={() => setWarehouseDropdownOpen(false)}
                    />
                    <ul
                      role="listbox"
                      className="absolute left-0 top-full mt-1 z-20 min-w-[180px] py-1.5 rounded-[7px] border border-white/[0.08] shadow-lg"
                      style={{ background: '#0D1117' }}
                    >
                      {warehouses.map((w) => (
                        <li key={w.id} role="option" aria-selected={currentWarehouseId === w.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentWarehouseId(w.id);
                              setWarehouseDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-[12px] font-medium transition-colors ${
                              currentWarehouseId === w.id
                                ? 'bg-white/[0.08] text-white'
                                : 'text-white/80 hover:bg-white/[0.05]'
                            }`}
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
                className="flex items-center gap-1.5 h-9 px-2.5 rounded-[7px]"
                style={{
                  background: 'var(--blue-dim)',
                  border: '1px solid rgba(92,172,250,0.25)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] flex-shrink-0" aria-hidden />
                <span className="flex-1 text-xs font-medium text-white/80 truncate">
                  {warehouseName}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav: main items */}
      <nav className="flex-1 min-h-0 py-2.5 overflow-y-auto" aria-label="Main navigation">
        <div className="px-0">
          {mainNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 py-2 px-3.5 mx-2 rounded-[7px] text-[13px] transition-colors duration-150 ${
                  isActive
                    ? 'text-white'
                    : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                }`
              }
              style={({ isActive }) => ({
                fontFamily: 'var(--font-d)',
                borderLeft: '3px solid ' + (isActive ? 'var(--blue)' : 'transparent'),
                ...(isActive
                  ? {
                      background: 'rgba(92,172,250,0.08)',
                      fontWeight: 600,
                    }
                  : {}),
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-4 h-4 flex-shrink-0 flex items-center justify-center opacity-60"
                    style={isActive ? { color: 'var(--blue)', opacity: 1 } : undefined}
                  >
                    <item.icon className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="flex-1 truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        {adminNav.length > 0 && (
          <>
            <div className="h-px bg-white/[0.06] mx-3 my-2 flex-shrink-0" aria-hidden />
            <div className="px-0">
              {adminNav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 py-2 px-3.5 mx-2 rounded-[7px] text-[13px] transition-colors duration-150 ${
                      isActive
                        ? 'text-white'
                        : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'
                    }`
                  }
                  style={({ isActive }) => ({
                    fontFamily: 'var(--font-d)',
                    borderLeft: '3px solid ' + (isActive ? 'var(--blue)' : 'transparent'),
                    ...(isActive
                      ? {
                          background: 'rgba(92,172,250,0.08)',
                          fontWeight: 600,
                        }
                      : {}),
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center opacity-60"
                        style={
                          isActive ? { color: 'var(--blue)', opacity: 1 } : undefined
                        }
                      >
                        <item.icon className="w-4 h-4" strokeWidth={2} />
                      </span>
                      <span className="flex-1 truncate">{item.name}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* User card footer */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0 min-h-[5rem]">
        <div
          className="flex items-center gap-2 p-2 rounded-[7px] cursor-default transition-colors hover:bg-white/[0.04]"
          role="presentation"
        >
          <div
            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-black font-bold text-[11px] flex-shrink-0"
            style={{
              background: 'var(--blue)',
            }}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[11px] font-medium truncate"
              style={{ color: 'rgba(255,255,255,0.72)' }}
              title={user?.email}
            >
              {user?.email ?? '—'}
            </p>
            {canSeeSwitchRole && user ? (
              <label className="block mt-0.5">
                <span className="sr-only">Switch role (for testing)</span>
                <select
                  value={user.role}
                  onChange={(e) => switchRole(e.target.value)}
                  className="w-full text-[10px] font-medium py-0.5 pr-5 rounded bg-transparent border-0 cursor-pointer focus:ring-0 focus:outline-none"
                  style={{ color: 'rgba(255,255,255,0.28)' }}
                  aria-label="Switch role"
                >
                  {Object.values(ROLES).map((role) => (
                    <option key={role.id} value={role.id} className="bg-[#0D1117] text-white">
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <span
                className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{
                  background: 'var(--blue-dim)',
                  color: 'var(--blue)',
                  fontFamily: 'var(--font-d)',
                }}
              >
                {getRoleDisplayName(user?.role)}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
