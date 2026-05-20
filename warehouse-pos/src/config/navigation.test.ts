import { describe, it, expect } from 'vitest';
import { isNavItemVisible, MORE_PAGE_NAV, BOTTOM_NAV_TABS } from './navigation';
import { PERMISSIONS } from '../types/permissions';

describe('isNavItemVisible', () => {
  const posOnly = {
    hasPermission: (p: string) => p === PERMISSIONS.POS.ACCESS,
    hasAnyPermission: () => false,
    isWarehouseBoundToSession: false,
  };

  it('shows POS for cashier', () => {
    const pos = BOTTOM_NAV_TABS.find((t) => t.to === '/pos')!;
    expect(isNavItemVisible(pos, posOnly)).toBe(true);
  });

  it('hides inventory for cashier', () => {
    const inv = BOTTOM_NAV_TABS.find((t) => t.to === '/inventory')!;
    expect(isNavItemVisible(inv, posOnly)).toBe(false);
  });

  it('hides More tab when no sub-items are allowed', () => {
    const more = BOTTOM_NAV_TABS.find((t) => t.to === '/more')!;
    expect(MORE_PAGE_NAV.some((i) => isNavItemVisible(i, posOnly))).toBe(false);
    expect(isNavItemVisible(more, posOnly)).toBe(false);
  });

  it('hides inventory when warehouse-bound to session', () => {
    const inv = BOTTOM_NAV_TABS.find((t) => t.to === '/inventory')!;
    expect(
      isNavItemVisible(inv, {
        hasPermission: () => true,
        hasAnyPermission: () => true,
        isWarehouseBoundToSession: true,
      })
    ).toBe(false);
  });
});
