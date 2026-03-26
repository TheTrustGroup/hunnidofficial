/**
 * Shared size-code helpers for inventory forms and validations.
 */
export function isPlaceholderOneSizeCode(sizeCode: string | null | undefined): boolean {
  const n = String(sizeCode ?? '').trim().replace(/\s+/g, '').toUpperCase();
  return n === 'OS' || n === 'ONESIZE' || n === 'ONE_SIZE' || n === 'O/S';
}
