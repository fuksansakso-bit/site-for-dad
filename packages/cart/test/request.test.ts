import { describe, expect, it } from 'vitest';

import {
  canTransitionRequestStatus,
  createRequestNumber,
  derivePublicReference,
  normalizeContactPhone,
  openPublicReference,
  publicReferenceHash,
  sealPublicReference,
} from '../src/index.js';

describe('guest request intake primitives', () => {
  it.each([
    ['8 (963) 585-10-36', '+79635851036'],
    ['+7 963 585 10 36', '+79635851036'],
    ['79635851036', '+79635851036'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeContactPhone(input)).toBe(expected);
  });

  it.each(['12345', 'not-a-phone', '+0123456789', '9635851036'])(
    'rejects invalid phone %s',
    (input) => {
      expect(() => normalizeContactPhone(input)).toThrow('CONTACT_PHONE_INVALID');
    },
  );

  it('creates a safe human-readable non-sequential request number', () => {
    const number = createRequestNumber(new Date('2026-08-09T12:00:00.000Z'));
    expect(number).toMatch(/^REQ-260809-[A-Z2-9]{8}$/u);
    expect(number).not.toContain('00000000');
  });

  it('derives an unpredictable stable reference and stores only its hash', () => {
    const reference = derivePublicReference('s'.repeat(32), 'a'.repeat(64), 'checkout-key-123');
    expect(reference).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(reference).toBe(
      derivePublicReference('s'.repeat(32), 'a'.repeat(64), 'checkout-key-123'),
    );
    expect(publicReferenceHash(reference)).toMatch(/^[0-9a-f]{64}$/u);
    expect(publicReferenceHash(reference)).not.toContain(reference);
  });

  it('seals the bearer reference for authorized administration', () => {
    const reference = derivePublicReference('s'.repeat(32), 'b'.repeat(64), 'checkout-key-456');
    const sealed = sealPublicReference('s'.repeat(32), reference);
    expect(sealed).not.toContain(reference);
    expect(openPublicReference('s'.repeat(32), sealed)).toBe(reference);
    expect(() => openPublicReference('x'.repeat(32), sealed)).toThrow(
      'PUBLIC_REFERENCE_SEALED_INVALID',
    );
  });

  it('enforces allowlisted manager and owner transitions', () => {
    expect(canTransitionRequestStatus('NEW', 'IN_REVIEW', 'MANAGER')).toBe(true);
    expect(canTransitionRequestStatus('IN_REVIEW', 'CONTACTED', 'MANAGER')).toBe(true);
    expect(canTransitionRequestStatus('CONTACTED', 'CONFIRMED', 'MANAGER')).toBe(true);
    expect(canTransitionRequestStatus('CANCELLED', 'IN_REVIEW', 'MANAGER')).toBe(false);
    expect(canTransitionRequestStatus('CANCELLED', 'IN_REVIEW', 'OWNER')).toBe(true);
    expect(canTransitionRequestStatus('CONFIRMED', 'CANCELLED', 'ADMIN')).toBe(true);
    expect(canTransitionRequestStatus('CONFIRMED', 'NEW', 'OWNER')).toBe(false);
  });
});
