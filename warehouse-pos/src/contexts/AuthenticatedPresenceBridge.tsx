/**
 * Mounts PresenceProvider with auth + warehouse props. Must be inside
 * RealtimeProvider, WarehouseProvider, AuthProvider, and BrowserRouter.
 */

import { type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWarehouse } from './WarehouseContext';
import { PresenceProvider } from './PresenceContext';

export function AuthenticatedPresenceBridge({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { currentWarehouseId, currentWarehouse, warehouses } = useWarehouse();
  const warehouseName =
    currentWarehouse?.name ??
    warehouses.find((w) => w.id === currentWarehouseId)?.name ??
    '—';

  return (
    <PresenceProvider
      currentUserEmail={user?.email ?? null}
      currentUserRole={user?.role ?? null}
      currentWarehouseId={currentWarehouseId}
      currentWarehouseName={warehouseName}
      isAuthenticated={isAuthenticated && !!user}
    >
      {children}
    </PresenceProvider>
  );
}
