/**
 * Current warehouse (location) for inventory and POS. All product quantities and
 * POS deductions are scoped to the selected warehouse.
 *
 * Single source of truth for warehouse selection. Hunnid Official stores: Main Jeff (...0001), Hunnid Main (...0002).
 *   Sidebar, Dashboard, InventoryPage, and POS all read from here.
 *   This context is the SINGLE source of truth. Every page (Dashboard, Inventory, POS)
 *   reads from here. When the sidebar changes the warehouse, ALL pages re-fetch.
 *   Selection persists to localStorage so it survives refresh.
 *
 * IMPORTANT: /api/warehouses requires auth. We only fetch after auth is ready and
 * user is authenticated so the dropdown list loads reliably (no 401 race).
 *
 * WIRING: See CURSOR_WIRING.md for exact instructions. Use useWarehouse() in every
 * component that needs the selected warehouse (Dashboard, Inventory, POS, Sidebar).
 */

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Warehouse } from '../types';
import { API_BASE_URL } from '../lib/api';
import { apiGet } from '../lib/apiClient';
import { isValidWarehouseId } from '../lib/warehouseId';
import { useOptionalAuth } from './AuthContext';

/** Default warehouse id (Main Jeff). Fallback when API has no warehouses yet. */
export const DEFAULT_WAREHOUSE_ID = '00000000-0000-0000-0000-000000000001';

const STORAGE_KEY = 'warehouse_current_id';

/** Fallback names when /api/warehouses does not return the warehouse (e.g. bound POS). Match server/DB. Single source for dropdown and dashboard "sales by location". */
export const KNOWN_WAREHOUSE_NAMES: Record<string, string> = {
  '00000000-0000-0000-0000-000000000001': 'Main Jeff',
  '00000000-0000-0000-0000-000000000002': 'Hunnid Main',
};

/** DC was consolidated; never show in UI (backend also excludes it). */
function excludeRemovedWarehouses(arr: Warehouse[]): Warehouse[] {
  return arr.filter(
    (w) => w.name !== 'DC' && (w as Warehouse & { code?: string }).code !== 'DC'
  );
}

function dedupeWarehouses(arr: Warehouse[]): Warehouse[] {
  const seen = new Set<string>();
  return arr.filter((w: Warehouse) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

interface WarehouseContextType {
  warehouses: Warehouse[];
  currentWarehouseId: string;
  setCurrentWarehouseId: (id: string) => void;
  currentWarehouse: Warehouse | null;
  isLoading: boolean;
  refreshWarehouses: (options?: { timeoutMs?: number }) => Promise<void>;
  /** True when POS can sell (single warehouse auto-selected, or user selected when multiple). No silent default. */
  isWarehouseSelectedForPOS: boolean;
  /** When true, session is bound to a warehouse; selector should be hidden/disabled in POS. */
  isWarehouseBoundToSession: boolean;
}

const WarehouseContext = createContext<WarehouseContextType | undefined>(undefined);

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const auth = useOptionalAuth();
  const authLoading = auth?.isLoading ?? false;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const rawBoundWarehouseId = auth?.user?.warehouseId?.trim() || undefined;
  const boundWarehouseId = isValidWarehouseId(rawBoundWarehouseId) ? rawBoundWarehouseId : undefined;
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [currentWarehouseId, setCurrentWarehouseIdState] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    }
    return DEFAULT_WAREHOUSE_ID;
  });
  const [isLoading, setIsLoading] = useState(true);

  const refreshWarehouses = useCallback(async (options?: { timeoutMs?: number }) => {
    try {
      const list = await apiGet<Warehouse[]>(API_BASE_URL, '/api/warehouses', {
        timeoutMs: options?.timeoutMs,
      });
      const arr = Array.isArray(list) ? list : [];
      const withoutRemoved = excludeRemovedWarehouses(arr);
      const deduped = dedupeWarehouses(withoutRemoved);
      setWarehouses(deduped);
      if (deduped.length > 0) {
        setCurrentWarehouseIdState((prev) => {
          const bound = boundWarehouseId && deduped.some((w) => w.id === boundWarehouseId) ? boundWarehouseId : null;
          if (bound) return bound;
          const exists = deduped.some((w) => w.id === prev);
          if (exists) return prev;
          // Always set a valid selection so the warehouse filter/dropdown works (single or multiple warehouses).
          return deduped[0].id;
        });
      }
      // On empty list from API, keep current selection (don't clear) so products still load for default warehouse.
    } catch {
      setWarehouses([]);
      // On error (e.g. 401/network), keep currentWarehouseId so dropdown and products still work after Reload.
    } finally {
      setIsLoading(false);
    }
  }, [boundWarehouseId]);

  // Fetch warehouses only after auth is ready and user is authenticated (API requires auth).
  // POS locations (bound): skip fetch so POS can load products immediately; display uses KNOWN_WAREHOUSE_NAMES.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }
    if (boundWarehouseId) {
      setIsLoading(false);
      return;
    }
    refreshWarehouses();
  }, [authLoading, isAuthenticated, boundWarehouseId, refreshWarehouses]);

  // When session is bound to a warehouse (e.g. Hunnid Main POS), always show that warehouse.
  // Set unconditionally so we don't depend on /api/warehouses including it or on stale localStorage.
  useEffect(() => {
    if (boundWarehouseId) {
      setCurrentWarehouseIdState(boundWarehouseId);
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, boundWarehouseId);
    }
  }, [boundWarehouseId]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && currentWarehouseId && !boundWarehouseId) {
      localStorage.setItem(STORAGE_KEY, currentWarehouseId);
    }
  }, [currentWarehouseId, boundWarehouseId]);

  const setCurrentWarehouseId = useCallback(
    (id: string) => {
      if (boundWarehouseId) return;
      setCurrentWarehouseIdState(id);
    },
    [boundWarehouseId]
  );

  const effectiveWarehouseId = boundWarehouseId || currentWarehouseId;
  const currentWarehouse: Warehouse | null =
    warehouses.find((w) => w.id === effectiveWarehouseId) ??
    (effectiveWarehouseId && KNOWN_WAREHOUSE_NAMES[effectiveWarehouseId]
      ? ({ id: effectiveWarehouseId, name: KNOWN_WAREHOUSE_NAMES[effectiveWarehouseId], code: '', createdAt: '', updatedAt: '' } as Warehouse)
      : null);
  const isWarehouseSelectedForPOS = !!(
    effectiveWarehouseId &&
    (warehouses.length <= 1 || warehouses.some((w) => w.id === effectiveWarehouseId))
  );
  const isWarehouseBoundToSession = !!boundWarehouseId;

  return (
    <WarehouseContext.Provider
      value={{
        warehouses,
        currentWarehouseId: effectiveWarehouseId,
        setCurrentWarehouseId,
        currentWarehouse,
        isLoading,
        refreshWarehouses,
        isWarehouseSelectedForPOS,
        isWarehouseBoundToSession,
      }}
    >
      {children}
    </WarehouseContext.Provider>
  );
}

export function useWarehouse() {
  const context = useContext(WarehouseContext);
  if (!context) {
    throw new Error('useWarehouse must be used within WarehouseProvider');
  }
  return context;
}
