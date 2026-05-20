import { describe, expect, it } from 'vitest';
import { getUserFriendlyMessage, POS_ERRORS } from './errorMessages';
import { toSafeError } from '../../../inventory-server/lib/safeError';

describe('getUserFriendlyMessage', () => {
  it('maps raw Postgres inventory errors without leaking IDs or column names', () => {
    const raw =
      'Failed to create warehouse inventory: Product cc0f1478-e2a2-471d-9422-d4dfeb53e596 is sized; size_code must not be OS.';
    const msg = getUserFriendlyMessage(new Error(raw));
    expect(msg.toLowerCase()).not.toContain('cc0f1478');
    expect(msg.toLowerCase()).not.toContain('size_code');
    expect(msg.length).toBeLessThan(200);
  });

  it('maps insufficient stock consistently with API', () => {
    const api = toSafeError(new Error('INSUFFICIENT_STOCK at line 3'));
    const client = getUserFriendlyMessage(new Error('INSUFFICIENT_STOCK at line 3'));
    expect(client).toBe(POS_ERRORS.insufficientStock);
    expect(api.toLowerCase()).toContain('insufficient stock');
  });

  it('never shows Supabase or migration vocabulary', () => {
    const msg = getUserFriendlyMessage(
      new Error('Sale service unavailable. ensure record_sale migration in Supabase')
    );
    expect(msg.toLowerCase()).not.toContain('supabase');
    expect(msg.toLowerCase()).not.toContain('migration');
  });

  it('maps invalid products response to calm copy', () => {
    expect(getUserFriendlyMessage(new Error('Invalid products response from server'))).toMatch(
      /couldn't load products/i
    );
  });

  it('allows short validation messages', () => {
    expect(getUserFriendlyMessage(new Error('Business name is required'))).toBe(
      'Business name is required'
    );
  });
});
