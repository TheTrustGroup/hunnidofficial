// src/components/layout/Sidebar.tsx — Hunnid Official sidebar (light theme)
// White surface, blue accents, warehouse pill, nav, user row. Style-only; no logic changes.
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
      className="fixed left-0 top-0 w-[var(--sidebar-w)] min-w-[244px] h-[var(--h-viewport)] max-h-[var(--h-viewport)] flex flex-col flex-shrink-0 z-20 border-r border-[var(--border)] shadow-[var(--shadow-sm)]"
      style={{ background: 'var(--surface)' }}
    >
      {/* Logo: blue H mark + wordmark */}
      <div className="flex items-center gap-[11px] px-4 pt-[17px] pb-[15px] border-b border-[var(--border)] flex-shrink-0 bg-[var(--surface)]">
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--blue)' }}
        >
          <LogoMark />
        </div>
        <div className="flex flex-col leading-none gap-0.5 min-w-0">
          <span
            className="font-extrabold uppercase truncate"
            style={{
              fontFamily: 'var(--font-d)',
              fontSize: '14px',
              letterSpacing: '0.02em',
              color: 'var(--text)',
            }}
          >
            Hunnid
          </span>
          <span
            className="font-normal uppercase truncate"
            style={{
              fontFamily: 'var(--font-b)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--text-3)',
            }}
          >
            {isPosPage ? 'POS Terminal' : 'OFFICIAL'}
          </span>
        </div>
      </div>

      {/* Warehouse pill */}
      {showWarehouseSwitcher && (
        <div className="px-3 pt-[14px] pb-1.5 flex-shrink-0">
          <div className="relative">
            {canSwitchWarehouse ? (
              <>
                <button
                  type="button"
                  onClick={() => setWarehouseDropdownOpen((o) => !o)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 rounded-[10px] transition-colors border"
                  style={{
                    background: 'var(--blue-soft)',
                    borderColor: 'rgba(92,172,250,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e4ecfc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--blue-soft)';
                  }}
                  aria-expanded={warehouseDropdownOpen}
                  aria-haspopup="listbox"
                  aria-label="Select warehouse"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0 animate-pulse shadow-[0_0_6px_#22C55E]"
                    aria-hidden
                  />
                  <span
                    className="flex-1 text-left text-[12px] font-bold uppercase truncate"
                    style={{ fontFamily: 'var(--font-d)', color: 'var(--blue)' }}
                  >
                    {warehouseName}
                  </span>
                  <span className="text-[10px] opacity-50" style={{ color: 'var(--blue)' }} aria-hidden>▾</span>
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
                      className="absolute left-0 top-full mt-1 z-20 min-w-[180px] py-1.5 rounded-[10px] border shadow-[var(--shadow-md)]"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
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
                            className="w-full text-left px-3 py-2 text-[12px] font-medium transition-colors rounded-[6px] mx-1"
                            style={{
                              color: currentWarehouseId === w.id ? 'var(--blue)' : 'var(--text-2)',
                              background: currentWarehouseId === w.id ? 'var(--blue-soft)' : 'transparent',
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
                className="flex items-center gap-2 py-2.5 px-3 rounded-[10px] border"
                style={{
                  background: 'var(--blue-soft)',
                  borderColor: 'rgba(92,172,250,0.15)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full bg-[#22C55E] flex-shrink-0 animate-pulse shadow-[0_0_6px_#22C55E]"
                  aria-hidden
                />
                <span
                  className="flex-1 text-[12px] font-bold uppercase truncate"
                  style={{ fontFamily: 'var(--font-d)', color: 'var(--blue)' }}
                >
                  {warehouseName}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Nav: main + admin */}
      <nav className="flex-1 min-h-0 py-2.5 overflow-y-auto" aria-label="Main navigation">
        <div className="px-0">
          {mainNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-[9px] py-2 px-[13px] mx-2 rounded-[10px] text-[13px] transition-colors duration-150 border ${
                  isActive
                    ? 'border-[rgba(92,172,250,0.12)]'
                    : 'border-transparent hover:bg-[var(--overlay)]'
                }`
              }
              style={({ isActive }) => ({
                fontFamily: 'var(--font-b)',
                color: isActive ? 'var(--blue)' : 'var(--text-2)',
                fontWeight: isActive ? 600 : undefined,
                background: isActive ? 'var(--blue-soft)' : undefined,
              })}
            >
              {({ isActive }) => (
                <>
                  <span
                    className="w-4 h-4 flex-shrink-0 flex items-center justify-center"
                    style={{ color: isActive ? 'var(--blue)' : 'var(--text-2)' }}
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
            <div className="my-2 mx-3 h-px flex-shrink-0 bg-[var(--border)]" />
            <div className="px-0">
              {adminNav.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-[9px] py-2 px-[13px] mx-2 rounded-[10px] text-[13px] transition-colors duration-150 border ${
                      isActive
                        ? 'border-[rgba(92,172,250,0.12)]'
                        : 'border-transparent hover:bg-[var(--overlay)]'
                    }`
                  }
                  style={({ isActive }) => ({
                    fontFamily: 'var(--font-b)',
                    color: isActive ? 'var(--blue)' : 'var(--text-2)',
                    fontWeight: isActive ? 600 : undefined,
                    background: isActive ? 'var(--blue-soft)' : undefined,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="w-4 h-4 flex-shrink-0 flex items-center justify-center"
                        style={{ color: isActive ? 'var(--blue)' : 'var(--text-2)' }}
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

      {/* User row (bottom) */}
      <div
        className="p-3 border-t flex-shrink-0 min-h-[5rem]"
        style={{ borderColor: 'var(--border)', background: 'var(--elevated)' }}
      >
        <div
          className="flex items-center gap-2 p-2 rounded-[10px] cursor-default transition-colors hover:bg-[var(--overlay)]"
          role="presentation"
        >
          <div
            className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white font-extrabold text-[13px] flex-shrink-0"
            style={{
              fontFamily: 'var(--font-d)',
              background: 'var(--blue)',
            }}
          >
            {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="truncate font-semibold"
              style={{
                fontFamily: 'var(--font-b)',
                fontSize: '13px',
                color: 'var(--text)',
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
                  className="w-full font-normal py-0.5 pr-5 rounded bg-transparent border-0 cursor-pointer focus:ring-0 focus:outline-none"
                  style={{
                    fontFamily: 'var(--font-b)',
                    fontSize: '11px',
                    color: 'var(--text-3)',
                  }}
                  aria-label="Switch role"
                >
                  {Object.values(ROLES).map((role) => (
                    <option key={role.id} value={role.id} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p
                className="mt-0.5 font-normal"
                style={{
                  fontFamily: 'var(--font-b)',
                  fontSize: '11px',
                  color: 'var(--text-3)',
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
