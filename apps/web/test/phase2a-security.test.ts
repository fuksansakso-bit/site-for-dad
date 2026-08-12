import { describe, expect, it } from 'vitest';
import { cartItemSchema, checkoutSchema } from '../lib/phase2a/schemas';
import { normalizeRussianPhone } from '../lib/phase2a/phone';
import { can } from '../lib/phase2a/permissions';
describe('Phase 2A boundaries', () => {
  it('normalizes Russian phone', () =>
    expect(normalizeRussianPhone('8 (963) 585-10-36')).toBe('+79635851036'));
  it('rejects invalid phone', () =>
    expect(() => normalizeRussianPhone('123')).toThrow('INVALID_PHONE'));
  it('stores only cart inputs and rejects a forged price', () =>
    expect(
      cartItemSchema.safeParse({
        materialSlug: 'safe-material',
        widthMm: 1000,
        heightMm: 1000,
        quantity: 1,
        totalPriceKopecks: 1,
      }).success,
    ).toBe(false));
  it('rejects forged checkout fields', () =>
    expect(
      checkoutSchema.safeParse({
        items: [],
        customerName: 'Иван',
        customerPhone: '89990000000',
        locality: 'Грозный',
        knownTotalKopecks: 1,
      }).success,
    ).toBe(false));
  it('limits manager to orders', () => {
    expect(can('MANAGER', 'ORDERS')).toBe(true);
    expect(can('MANAGER', 'CATALOG')).toBe(false);
    expect(can('OWNER', 'STAFF')).toBe(true);
  });
});
