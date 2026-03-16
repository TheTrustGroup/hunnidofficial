/**
 * More menu: bottom sheet with nav links, warehouse, role switcher, logout.
 * Matches reference layout; HunnidOfficial blue only. Sits above bottom nav (var(--bottom-nav-h)).
 */
import { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { ROLES } from '../../types/permissions';
import { MORE_PAGE_NAV } from '../../config/navigation';

const LABEL_SIZE = 11;
const MENU_TEXT_SIZE = 13;

function getRoleDisplayName(roleId: string | undefined): string {
  if (roleId == null || roleId === '') return '—';
  const key = roleId === 'super_admin' ? 'SUPER_ADMIN' : roleId.toUpperCase().replace(/\s+/g, '_');
  return ROLES[key]?.name ?? roleId;
}

interface MoreMenuSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MoreMenuSheet({ open, onClose }: MoreMenuSheetProps) {
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

  useEffect(() => {
    if (open) document.body.classList.add('scroll-lock');
    else document.body.classList.remove('scroll-lock');
    return () => document.body.classList.remove('scroll-lock');
  }, [open]);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] lg:hidden" role="dialog" aria-modal="true" aria-label="More menu">
      <div
        className="absolute inset-x-0 top-0 bg-black/50"
        style={{ bottom: 'var(--bottom-nav-h)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        className="absolute left-0 right-0 z-50 max-h-[72dvh] lg:max-h-[85vh] overflow-y-auto rounded-t-3xl bg-[var(--edk-surface)] border-t border-[var(--edk-border)]"
        style={{
          bottom: 'var(--bottom-nav-h)',
          boxShadow: '0 -12px 48px rgba(0,0,0,0.14), 0 -2px 12px rgba(0,0,0,0.06)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        <div className="sticky top-0 z-10 flex flex-col bg-[var(--edk-surface)] border-b border-[var(--edk-border)]">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto mt-3 mb-0.5 flex-shrink-0" aria-hidden />
          <div className="flex items-center justify-between w-full px-4 py-2 pb-3">
            <h2 className="font-bold tracking-tight text-[var(--edk-ink)]" style={{ fontSize: 18 }}>
              MORE
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--edk-ink-3)] hover:bg-[var(--edk-bg)] transition-colors"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          className="px-4 py-4 space-y-4"
          style={{ paddingBottom: 'var(--sheet-safe-padding-bottom)' }}
        >
          <nav className="space-y-0.5" aria-label="More pages">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors touch-manipulation min-h-[48px] ${
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
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {showWarehouseSwitcher && (
            <div className="pt-2 border-t border-[var(--edk-border)]">
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
                  onChange={(e) => {
                    setCurrentWarehouseId(e.target.value);
                    onClose();
                  }}
                  className="w-full h-11 pl-3 pr-8 rounded-xl bg-[var(--edk-bg)] border border-[var(--edk-border-mid)] font-medium text-[var(--edk-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
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
            </div>
          )}

          {user && (
            <div className="pt-2 border-t border-[var(--edk-border)] space-y-2">
              <p style={{ fontSize: LABEL_SIZE }} className="text-[var(--edk-ink-3)]">
                <span className="font-medium text-[var(--edk-ink-2)]">Role: </span>
                {getRoleDisplayName(user.role)}
              </p>
              {canSeeSwitchRole && (
                <label className="block">
                  <span
                    className="font-medium text-[var(--edk-ink-3)] block mb-1"
                    style={{ fontSize: LABEL_SIZE }}
                  >
                    Switch role (testing)
                  </span>
                  <select
                    value={user.role}
                    onChange={(e) => {
                      switchRole(e.target.value);
                      onClose();
                    }}
                    className="w-full h-11 pl-3 pr-8 rounded-xl bg-[var(--edk-bg)] border border-[var(--edk-border-mid)] font-medium text-[var(--edk-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
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
            </div>
          )}

          <div className="pt-2 border-t border-[var(--edk-border)]">
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-medium text-[var(--edk-ink-2)] hover:bg-[var(--edk-bg)] min-h-[48px] touch-manipulation transition-colors text-left"
              style={{ fontSize: MENU_TEXT_SIZE }}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" strokeWidth={2} aria-hidden />
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
