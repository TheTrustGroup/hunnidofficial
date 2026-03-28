/**
 * Shared size-code helpers for inventory forms and validations.
 * Keep sanitizeQuantityBySizeForApi in sync with inventory-server imports of this module.
 */

/** Strip zero-width / BOM so "O\u200bS" cannot bypass placeholder checks or match as a real EU size in the UI. */
function stripInvisibleSizeInput(s: string): string {
  return s.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '');
}

export function isPlaceholderOneSizeCode(sizeCode: string | null | undefined): boolean {
  const n = stripInvisibleSizeInput(String(sizeCode ?? ''))
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
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
      sizeCode: stripInvisibleSizeInput(String(r?.sizeCode ?? '')).trim().replace(/\s+/g, ' ').trim().toUpperCase(),
      quantity: Math.max(0, Number(r?.quantity ?? 0) || 0),
    }))
    .filter((r) => r.sizeCode !== '' && !isPlaceholderOneSizeCode(r.sizeCode));
}
