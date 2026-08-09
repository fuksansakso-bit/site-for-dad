import { describe, expect, it } from 'vitest';

import { guestCheckoutRequestSchema } from '../src/request.js';

describe('guest checkout contract', () => {
  it('accepts only contact, locality, purpose flags and explicit consent', () => {
    expect(
      guestCheckoutRequestSchema.parse({
        contactName: 'Тестовый Клиент',
        contactPhone: '+7 900 000-00-01',
        expectedCartRevision: 2,
        installmentInterest: true,
        locality: 'Грозный',
        measurementRequested: true,
        personalDataConsent: true,
      }),
    ).toMatchObject({ personalDataConsent: true });
  });

  it('rejects missing consent and client-controlled totals', () => {
    expect(() =>
      guestCheckoutRequestSchema.parse({
        contactName: 'Тестовый Клиент',
        contactPhone: '+79000000001',
        expectedCartRevision: 2,
        installmentInterest: false,
        locality: 'Грозный',
        measurementRequested: false,
        personalDataConsent: false,
        totalKopecks: 1,
      }),
    ).toThrow();
  });
});
