import { describe, expect, it } from 'vitest';
import { cartItemSchema, checkoutSchema } from '../lib/phase2a/schemas';
import { normalizeRussianPhone } from '../lib/phase2a/phone';
import { isSameOriginOrLoopbackAlias } from '../lib/phase2a/origin';
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
  it('accepts only an exact origin or an equivalent local loopback alias', () => {
    expect(isSameOriginOrLoopbackAlias('https://example.test', 'https://example.test/path')).toBe(
      true,
    );
    expect(isSameOriginOrLoopbackAlias('http://127.0.0.1:3000', 'http://localhost:3000/api')).toBe(
      true,
    );
    expect(isSameOriginOrLoopbackAlias('http://127.0.0.1:3001', 'http://localhost:3000/api')).toBe(
      false,
    );
    expect(isSameOriginOrLoopbackAlias('https://evil.test', 'https://example.test/api')).toBe(
      false,
    );
  });
});
