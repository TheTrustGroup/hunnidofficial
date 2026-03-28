/**
 * Shared size-code helpers for inventory forms and validations.
 * Keep sanitizeQuantityBySizeForApi in sync with inventory-server imports of this module.
 */
export function isPlaceholderOneSizeCode(sizeCode: string | null | undefined): boolean {
  const n = String(sizeCode ?? '').trim().replace(/\s+/g, '').toUpperCase();
  return n === 'OS' || n === 'ONESIZE' || n === 'ONE_SIZE' || n === 'O/S' || n === 'NA';
}

export interface QuantityBySizeRow {
  sizeCode: string;
  quantity: number;
}

/**
 * Per-size rows for API POST/PUT bodies. Strips empty codes and one-size placeholders (OS, etc.);
 * normalizes sizeCode to uppercase and quantity to a non-negative number.
 * Single source of truth for client payloads and server sanitizeSizeRows().
 */
export function sanitizeQuantityBySizeForApi(
  rows: Array<{ sizeCode?: string; quantity?: number }> | null | undefined
): QuantityBySizeRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      sizeCode: String(r?.sizeCode ?? '').trim().toUpperCase(),
      quantity: Math.max(0, Number(r?.quantity ?? 0) || 0),
    }))
    .filter((r) => r.sizeCode !== '' && !isPlaceholderOneSizeCode(r.sizeCode));
}
