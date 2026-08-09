import { describe, expect, it } from 'vitest';

import {
  adminRequestNoteMutationSchema,
  adminRequestStatusMutationSchema,
  guestCheckoutRequestSchema,
  requestCommunicationEventRequestSchema,
  whatsappHandoffRequestSchema,
  whatsappHandoffResponseSchema,
} from '../src/request.js';

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

  it('does not accept a client-controlled WhatsApp recipient', () => {
    expect(() => whatsappHandoffRequestSchema.parse({ recipient: '79999999999' })).toThrow();
    expect(() =>
      whatsappHandoffResponseSchema.parse({
        correlationId: 'correlation-123',
        message: 'Тест',
        publicSummaryHref: `/request/${'a'.repeat(43)}`,
        recipient: '79999999999',
        whatsappUrl: 'https://wa.me/79999999999?text=test',
      }),
    ).toThrow();
  });

  it('allows only truthful local communication events', () => {
    expect(requestCommunicationEventRequestSchema.parse({ type: 'MESSAGE_COPIED' })).toEqual({
      type: 'MESSAGE_COPIED',
    });
    expect(() => requestCommunicationEventRequestSchema.parse({ type: 'MESSAGE_SENT' })).toThrow();
  });

  it('admin mutations cannot carry price or snapshot overrides', () => {
    expect(() =>
      adminRequestStatusMutationSchema.parse({
        expectedVersion: 1,
        knownSubtotalKopecks: 1,
        status: 'IN_REVIEW',
      }),
    ).toThrow();
    expect(() =>
      adminRequestNoteMutationSchema.parse({ body: 'Позвонить после 18:00', priceVersionId: 'x' }),
    ).toThrow();
  });
});
