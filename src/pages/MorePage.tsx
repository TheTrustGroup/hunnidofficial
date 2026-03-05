/**
 * More: excess nav items (Sales, Deliveries, Reports, Users, Settings).
 * Grouped sections and refined list styling so the screen feels less basic.
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

const REPORTS_PATHS = ['/sales', '/deliveries', '/reports'];
const ACCOUNT_PATHS = ['/users', '/settings'];

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

  const allItems = MORE_PAGE_NAV.filter(
    (item) =>
      (item.permission != null && hasPermission(item.permission)) ||
      (item.anyPermissions != null && hasAnyPermission(item.anyPermissions))
  );
  const reportsItems = allItems.filter((i) => REPORTS_PATHS.includes(i.to));
  const accountItems = allItems.filter((i) => ACCOUNT_PATHS.includes(i.to));

  const renderList = (list: typeof allItems, sectionLabel: string) => (
    <section className="mb-5 last:mb-0">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
        {sectionLabel}
      </h2>
      <div className="rounded-xl bg-white border border-slate-200/90 shadow-sm shadow-slate-200/50 overflow-hidden">
        <ul className="divide-y divide-slate-100/80">
          {list.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 w-full py-2.5 px-3.5 text-left text-[13px] font-medium transition-colors active:bg-slate-50 ${
                      isActive
                        ? 'bg-[var(--sidebar-active-bg)] text-[var(--blue)]'
                        : 'text-slate-700 hover:bg-slate-50/80'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isActive ? 'bg-[var(--blue)]/10 text-[var(--blue)]' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                      </span>
                      <span className="flex-1">{item.name}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" strokeWidth={2} />
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );

  return (
    <div className="animate-fade-in-up max-w-md mx-auto px-1">
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900 tracking-tight">More</h1>
        <p className="text-slate-500 text-xs mt-0.5">Settings, reports & account</p>
      </div>

      {showWarehouseSwitcher && (
        <section className="mb-5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
            Location
          </h2>
          <div className="rounded-xl bg-white border border-slate-200/90 shadow-sm shadow-slate-200/50 overflow-hidden p-3">
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} aria-hidden />
              </span>
              {canSwitchWarehouse ? (
                <select
                  value={currentWarehouseId}
                  onChange={(e) => setCurrentWarehouseId(e.target.value)}
                  className="flex-1 min-w-0 text-[13px] font-medium text-slate-800 py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/30 focus:border-[var(--blue)]"
                  aria-label="Select warehouse"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-[13px] font-medium text-slate-700 truncate" title={currentWarehouse?.name ?? ''}>
                  {currentWarehouse?.name ?? '—'}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {reportsItems.length > 0 && renderList(reportsItems, 'Reports & sales')}
      {accountItems.length > 0 && renderList(accountItems, 'Account')}

      <section className="mt-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Session
        </h2>
        <div className="rounded-xl bg-slate-50/80 border border-slate-200/70 overflow-hidden p-3">
          {user && (
            <p className="text-[11px] text-slate-500">
              <span className="font-medium text-slate-600">Role: </span>
              {getRoleDisplayName(user.role)}
            </p>
          )}
          {canSeeSwitchRole && user && (
            <label className="block mt-2">
              <span className="text-[10px] font-medium text-slate-400 block mb-1">Switch role (testing)</span>
              <select
                value={user.role}
                onChange={(e) => switchRole(e.target.value)}
                className="w-full text-[12px] font-medium text-slate-800 py-1.5 px-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)]/30"
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
      </section>
    </div>
  );
}
