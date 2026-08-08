import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import {
  issuePricingCsrfToken,
  pricingCsrfCookieName,
  requirePricingMutation,
} from '../lib/pricing-security.js';

const key = 'phase-1c-test-signing-key-that-is-long-enough';

function request(token: string, overrides: Record<string, string> = {}) {
  return new NextRequest('http://127.0.0.1:3000/api/v1/pricing/calculate', {
    body: '{}',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${pricingCsrfCookieName}=${token}`,
      Host: '127.0.0.1:3000',
      'Idempotency-Key': 'pricing-security-test',
      Origin: 'http://127.0.0.1:3000',
      'X-CSRF-Token': token,
      ...overrides,
    },
    method: 'POST',
  });
}

describe('QG-258 pricing mutation boundary', () => {
  it('requires a signed double-submit token, same origin and idempotency', () => {
    const token = issuePricingCsrfToken(key);
    expect(requirePricingMutation(request(token), key)).toBe('pricing-security-test');
    expect(() => requirePricingMutation(request(token, { Origin: 'https://attacker.example' }), key)).toThrow('PERMISSION_DENIED');
    expect(() => requirePricingMutation(request(token, { 'X-CSRF-Token': 'invalid' }), key)).toThrow('PERMISSION_DENIED');
    expect(() => requirePricingMutation(request(token, { 'Idempotency-Key': 'short' }), key)).toThrow('VALIDATION_ERROR');
  });
});
