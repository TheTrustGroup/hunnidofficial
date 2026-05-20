/**
 * One-time browser data migration: copies legacy localStorage into IndexedDB.
 * Does NOT remove localStorage keys (users keep a backup until they clear cache manually).
 */

import { getStoredData, setStoredData, isStorageAvailable } from './storage';
import { appendOfflineTransaction, enqueueSaleEvent, isIndexedDBAvailable } from './offlineDb';

const MIGRATION_KEY = 'hunnid_client_data_migration_v2';

const WAREHOUSE_IDS = [
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
];

function migrationDone(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === '1';
  } catch {
    return false;
  }
}

function markMigrationDone(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch {
    // ignore
  }
}

/** Copy legacy `warehouse_products` into per-warehouse keys when missing. */
function migrateProductCacheKeys(): void {
  if (!isStorageAvailable()) return;
  const legacy = getStoredData<unknown[]>('warehouse_products', []);
  if (!Array.isArray(legacy) || legacy.length === 0) return;

  for (const warehouseId of WAREHOUSE_IDS) {
    const key = `warehouse_products_${warehouseId}`;
    const existing = getStoredData<unknown[]>(key, []);
    if (Array.isArray(existing) && existing.length > 0) continue;
    setStoredData(key, legacy);
  }
}

/**
 * Map legacy offline_transactions (Transaction shape) to /api/sales body when possible.
 */
function transactionToSalePayload(tx: Record<string, unknown>): Record<string, unknown> | null {
  const warehouseId = String(tx.warehouseId ?? tx.warehouse_id ?? '').trim();
  if (!warehouseId) return null;
  const items = tx.items as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(items) || items.length === 0) return null;

  const lines = items.map((item) => ({
    productId: String(item.productId ?? item.product_id ?? ''),
    sizeCode: item.sizeCode ?? item.size_code ?? null,
    qty: Number(item.quantity ?? item.qty ?? 1),
    unitPrice: Number(item.unitPrice ?? item.unit_price ?? 0),
    lineTotal: Number(item.lineTotal ?? item.line_total ?? 0),
    name: String(item.productName ?? item.name ?? 'Product'),
    sku: String(item.sku ?? ''),
    imageUrl: null,
  }));

  const subtotal = Number(tx.subtotal ?? 0);
  const discountPct = Number(tx.discountPct ?? tx.discount ?? 0);
  const discountAmt = Number(tx.discountAmt ?? 0);
  const total = Number(tx.total ?? subtotal - discountAmt);

  return {
    warehouseId,
    customerName: (tx.customer as { name?: string })?.name ?? tx.customerName ?? null,
    paymentMethod: tx.paymentMethod ?? 'Cash',
    subtotal,
    discountPct,
    discountAmt,
    total,
    deliveryStatus: 'delivered',
    lines,
    _migratedFrom: 'offline_transactions',
  };
}

async function migrateOfflineTransactionsToIdb(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  const queue = getStoredData<Record<string, unknown>[]>('offline_transactions', []);
  if (!Array.isArray(queue) || queue.length === 0) return;

  for (const tx of queue) {
    if (tx == null || typeof tx !== 'object') continue;
    try {
      await appendOfflineTransaction(tx);
      const saleBody = transactionToSalePayload(tx);
      if (saleBody) {
        const eventId =
          typeof tx.id === 'string' && tx.id.trim()
            ? tx.id.trim()
            : undefined;
        await enqueueSaleEvent(saleBody, eventId);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[migration] offline tx', e);
    }
  }
}

/**
 * Run once per browser profile. Safe to call on every app load (no-op after first success).
 */
export async function runClientDataMigration(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (migrationDone()) return;

  try {
    migrateProductCacheKeys();
    await migrateOfflineTransactionsToIdb();
    markMigrationDone();
    if (import.meta.env.DEV) {
      console.info('[migration] Client data migration v2 completed (localStorage preserved).');
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[migration] incomplete — will retry next load', e);
  }
}
