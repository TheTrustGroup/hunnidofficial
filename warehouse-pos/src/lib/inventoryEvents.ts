/**
 * Global event when inventory or sales change (e.g. POS sale, order deduct).
 * Dashboard and Inventory pages listen and refetch so stock value and quantities stay in sync.
 */
export const INVENTORY_UPDATED_EVENT = 'app-inventory-updated';

export function notifyInventoryUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT));
  }
}
