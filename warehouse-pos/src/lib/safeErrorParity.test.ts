import { describe, expect, it } from 'vitest';
import { toSafeError } from '../../inventory-server/lib/safeError';

/**
 * API responses must stay sanitized; extend when new DB errors surface in production.
 */
describe('toSafeError (API parity)', () => {
  it('never exposes raw Postgres trigger text for OS on sized', () => {
    const raw =
      "Failed to create warehouse inventory: Product cc0f1478-e2a2-471d-9422-d4dfeb53e596 is sized; size_code must not be OS. Use a real size (e.g. S, M, L, EU23-EU37).";
    const safe = toSafeError(new Error(raw));
    expect(safe.toLowerCase()).not.toContain('product cc0f');
    expect(safe.toLowerCase()).not.toContain('eu23');
    expect(safe.length).toBeLessThan(200);
  });

  it('maps unknown failures to a generic message', () => {
    expect(toSafeError(new Error('relation "secret" does not exist'))).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
