/**
 * More: Settings, reports, warehouse switcher, role switcher, logout.
 * Layout and typography match reference; HunnidOfficial blue only (no red).
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import { MORE_PAGE_NAV } from '../config/navigation';
import { ROLES } from '../types/permissions';

function getRoleDisplayName(roleId: string | undefined): string {
  if (roleId == null || roleId === '') return '—';
  const key = roleId === 'super_admin' ? 'SUPER_ADMIN' : roleId.toUpperCase().replace(/\s+/g, '_');
  return ROLES[key]?.name ?? roleId;
}

const LABEL_SIZE = 11;
const MENU_TEXT_SIZE = 13;

export function MorePage() {
  const navigate = useNavigate();
  const { user, hasPermission, hasAnyPermission, switchRole, logout } = useAuth();
  const {
    warehouses,
    currentWarehouseId,
    setCurrentWarehouseId,
    currentWarehouse,
    isWarehouseBoundToSession,
    isLoading: warehousesLoading,
  } = useWarehouse();

  const canSeeSwitchRole = user?.role === 'admin' || user?.role === 'super_admin';
  const showWarehouseSwitcher = !warehousesLoading && warehouses.length > 0;
  const canSwitchWarehouse = showWarehouseSwitcher && warehouses.length > 1 && !isWarehouseBoundToSession;

  const items = MORE_PAGE_NAV.filter(
    (item) =>
      (item.permission != null && hasPermission(item.permission)) ||
      (item.anyPermissions != null && hasAnyPermission(item.anyPermissions))
  );

  return (
    <div className="animate-fade-in-up max-w-lg mx-auto">
      {/* Header: MORE — reference style, no close (full page) */}
      <header className="flex items-center justify-between mb-6">
        <h1
          className="font-bold tracking-tight text-[var(--edk-ink)]"
          style={{ fontSize: 20 }}
        >
          MORE
        </h1>
      </header>

      {/* Menu: icon + label, generous padding; active = blue only */}
      <nav
        className="rounded-2xl bg-[var(--edk-surface)] border border-[var(--edk-border)] overflow-hidden shadow-sm"
        aria-label="More options"
      >
        <ul className="divide-y divide-[var(--edk-border)]">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 w-full py-3.5 px-4 text-left font-medium transition-colors min-h-[48px] ${
                      isActive
                        ? 'bg-[var(--blue-soft)] text-[var(--blue)]'
                        : 'text-[var(--edk-ink)] hover:bg-[var(--edk-bg)]'
                    }`
                  }
                  style={{ fontSize: MENU_TEXT_SIZE }}
                >
                  <span className="w-9 h-9 rounded-xl bg-[var(--edk-bg)] flex items-center justify-center flex-shrink-0 text-[var(--edk-ink-2)]">
                    <Icon className="w-4 h-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="flex-1">{item.name}</span>
                  <ChevronRight className="w-5 h-5 text-[var(--edk-ink-3)] flex-shrink-0" strokeWidth={2} aria-hidden />
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* WAREHOUSE */}
      {showWarehouseSwitcher && (
        <section className="mt-6 rounded-2xl bg-[var(--edk-surface)] border border-[var(--edk-border)] p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-[var(--edk-ink-3)] flex-shrink-0" strokeWidth={2} aria-hidden />
            <span
              className="font-semibold uppercase tracking-wide text-[var(--edk-ink-3)]"
              style={{ fontSize: LABEL_SIZE }}
            >
              Warehouse
            </span>
          </div>
          {canSwitchWarehouse ? (
            <select
              value={currentWarehouseId}
              onChange={(e) => setCurrentWarehouseId(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl border border-[var(--edk-border-mid)] bg-[var(--edk-bg)] font-medium text-[var(--edk-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent"
              style={{ fontSize: MENU_TEXT_SIZE }}
              aria-label="Select warehouse"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <p
              className="font-medium text-[var(--edk-ink-2)] truncate"
              style={{ fontSize: MENU_TEXT_SIZE }}
              title={currentWarehouse?.name ?? ''}
            >
              {currentWarehouse?.name ?? '—'}
            </p>
          )}
        </section>
      )}

      {/* Role: Super Admin / Switch role (testing) */}
      <section className="mt-6 rounded-2xl bg-[var(--edk-surface)] border border-[var(--edk-border)] p-4 shadow-sm">
        {user && (
          <p
            className="text-[var(--edk-ink-3)] mb-2"
            style={{ fontSize: LABEL_SIZE }}
          >
            <span className="font-medium text-[var(--edk-ink-2)]">Role: </span>
            {getRoleDisplayName(user.role)}
          </p>
        )}
        {canSeeSwitchRole && user && (
          <label className="block">
            <span
              className="font-medium text-[var(--edk-ink-3)] block mb-1.5"
              style={{ fontSize: LABEL_SIZE }}
            >
              Switch role (testing)
            </span>
            <select
              value={user.role}
              onChange={(e) => switchRole(e.target.value)}
              className="w-full h-11 pl-3 pr-8 rounded-xl border border-[var(--edk-border-mid)] bg-[var(--edk-bg)] font-medium text-[var(--edk-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent"
              style={{ fontSize: MENU_TEXT_SIZE }}
              aria-label="Switch role"
            >
              {Object.values(ROLES).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {/* Log out */}
      <div className="mt-6">
        <button
          type="button"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="flex items-center gap-3 w-full py-3.5 px-4 rounded-2xl border border-[var(--edk-border)] bg-[var(--edk-surface)] font-medium text-[var(--edk-ink-2)] hover:bg-[var(--edk-bg)] min-h-[48px] transition-colors text-left"
          style={{ fontSize: MENU_TEXT_SIZE }}
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-[var(--edk-ink-2)]" strokeWidth={2} aria-hidden />
          Log out
        </button>
      </div>
    </div>
  );
}
