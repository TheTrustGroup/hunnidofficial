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
 * Catalog `size_codes` use compact EU keys (EU36.5), while labels show "EU 36.5".
 * Never strip all spaces globally — that can turn "O S" into "OS".
 */
export function normalizeInventorySizeCode(raw: string): string {
  const base = stripInvisibleSizeInput(String(raw ?? ''))
    .trim()
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const eu = base.match(/^EU\s+(\d+(?:\.\d+)?)$/);
  if (eu) return `EU${eu[1]}`;
  return base;
}

/**
 * Per-size rows for API POST/PUT bodies. Strips empty codes and one-size placeholders (OS, etc.);
 * normalizes sizeCode (including EU spacing) and quantity to a non-negative number.
 * Single source of truth for client payloads and server sanitizeSizeRows().
 */
export function sanitizeQuantityBySizeForApi(
  rows: Array<{ sizeCode?: string; size_code?: string; quantity?: number }> | null | undefined
): QuantityBySizeRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => ({
      sizeCode: normalizeInventorySizeCode(String(r?.sizeCode ?? r?.size_code ?? '')),
      quantity: Math.max(0, Number(r?.quantity ?? 0) || 0),
    }))
    .filter((r) => r.sizeCode !== '' && !isPlaceholderOneSizeCode(r.sizeCode));
}
