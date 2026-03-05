/**
 * More: excess nav items (Sales, Deliveries, Reports, Users, Settings).
 * Replaces the side menu on mobile; uses design system tokens.
 */
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useWarehouse } from '../contexts/WarehouseContext';
import { MORE_PAGE_NAV, MapPin } from '../config/navigation';
import { ROLES } from '../types/permissions';

function getRoleDisplayName(roleId: string | undefined): string {
  if (roleId == null || roleId === '') return '—';
  const key = roleId === 'super_admin' ? 'SUPER_ADMIN' : roleId.toUpperCase().replace(/\s+/g, '_');
  return ROLES[key]?.name ?? roleId;
}

export function MorePage() {
  const { user, hasPermission, hasAnyPermission, switchRole } = useAuth();
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
      <h1 className="text-[var(--text-h2)] font-bold text-slate-900 tracking-tight mb-1 px-0">More</h1>
      <p className="text-slate-500 text-[var(--text-sm)] mb-6">Settings, reports, and other options</p>

      {showWarehouseSwitcher && (
        <div className="mb-6 p-4 rounded-[var(--radius-card)] bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" strokeWidth={2} aria-hidden />
            <span className="text-[var(--text-xs)] font-semibold text-slate-600 uppercase tracking-wide">Warehouse</span>
          </div>
          {canSwitchWarehouse ? (
            <select
              value={currentWarehouseId}
              onChange={(e) => setCurrentWarehouseId(e.target.value)}
              className="w-full text-[var(--text-sm)] font-medium text-slate-800 py-2.5 px-3 rounded-[var(--radius-base)] border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[var(--blue)] focus:border-transparent"
              aria-label="Select warehouse"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-[var(--text-sm)] font-medium text-slate-700 truncate" title={currentWarehouse?.name ?? ''}>
              {currentWarehouse?.name ?? '—'}
            </p>
          )}
        </div>
      )}

      <nav className="rounded-[var(--radius-card)] bg-white border border-slate-200/80 shadow-sm overflow-hidden" aria-label="More options">
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 w-full py-3.5 px-4 text-left text-[15px] font-medium transition-colors ${
                      isActive ? 'bg-[var(--sidebar-active-bg)] text-[var(--blue)]' : 'text-slate-800 hover:bg-slate-50'
                    }`
                  }
                >
                  <span className="w-9 h-9 rounded-[var(--radius-base)] bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600">
                    <Icon className="w-4 h-4" strokeWidth={2} />
                  </span>
                  <span className="flex-1">{item.name}</span>
                  <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" strokeWidth={2} />
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-6 p-4 rounded-[var(--radius-card)] bg-slate-50 border border-slate-200/60">
        {user && (
          <p className="text-[var(--text-xs)] text-slate-500 mb-2">
            <span className="font-medium text-slate-600">Role: </span>
            {getRoleDisplayName(user.role)}
          </p>
        )}
        {canSeeSwitchRole && user && (
          <label className="block">
            <span className="text-[var(--text-xs)] font-medium text-slate-500 block mb-1.5">Switch role (testing)</span>
            <select
              value={user.role}
              onChange={(e) => switchRole(e.target.value)}
              className="w-full text-[var(--text-sm)] font-medium text-slate-900 py-2 px-3 rounded-[var(--radius-base)] border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)]"
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
    </div>
  );
}
