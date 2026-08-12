import { describe, expect, it, vi } from 'vitest';

import type { IdentityError } from '../../src/errors.js';
import { enforceMutationRequestSecurity } from '../../src/request-security.js';

const subjectHash = 'a'.repeat(64);
const csrfToken = 'synthetic-csrf-token-for-tests-0001';
const policy = {
  allowedOrigins: ['https://foundation.example'],
  maxBodyBytes: 1_024,
  rateLimitBucket: 'foundation.mutation',
} as const;

function dependencies(overrides?: { readonly allowed?: boolean; readonly csrf?: boolean }) {
  return {
    csrf: { verify: vi.fn(async () => overrides?.csrf ?? true) },
    rateLimit: {
      consume: vi.fn(async () => ({ allowed: overrides?.allowed ?? true })),
    },
  };
}

function mutationInput() {
  return {
    contentLength: '128',
    contentType: 'application/json; charset=utf-8',
    csrfToken,
    method: 'POST',
    origin: 'https://foundation.example',
    subjectHash,
  };
}

describe('TEST-SPEC-010 mutation request security foundation', () => {
  it('allows safe methods without consuming CSRF or rate-limit state', async () => {
    const ports = dependencies();
    await expect(
      enforceMutationRequestSecurity({ ...mutationInput(), method: 'GET' }, policy, ports),
    ).resolves.toBe('not-required');
    expect(ports.csrf.verify).not.toHaveBeenCalled();
    expect(ports.rateLimit.consume).not.toHaveBeenCalled();
  });

  it.each([
    [{ origin: 'https://attacker.example' }, 'IDENTITY_PERMISSION_DENIED'],
    [{ origin: 'https://foundation.example/untrusted' }, 'IDENTITY_PERMISSION_DENIED'],
    [{ csrfToken: null }, 'IDENTITY_PERMISSION_DENIED'],
    [{ contentLength: '1025' }, 'IDENTITY_VALIDATION_ERROR'],
    [{ contentType: 'text/plain' }, 'IDENTITY_VALIDATION_ERROR'],
  ] as const)('fails closed for invalid mutation input %#', async (override, code) => {
    await expect(
      enforceMutationRequestSecurity({ ...mutationInput(), ...override }, policy, dependencies()),
    ).rejects.toMatchObject({ code } satisfies Partial<IdentityError>);
  });

  it('denies a valid-looking request when the rate limiter rejects it', async () => {
    await expect(
      enforceMutationRequestSecurity(mutationInput(), policy, dependencies({ allowed: false })),
    ).rejects.toMatchObject({ code: 'IDENTITY_RATE_LIMITED' });
  });

  it('requires a provider-verified CSRF token before authorization', async () => {
    await expect(
      enforceMutationRequestSecurity(mutationInput(), policy, dependencies({ csrf: false })),
    ).rejects.toMatchObject({ code: 'IDENTITY_PERMISSION_DENIED' });
    await expect(
      enforceMutationRequestSecurity(mutationInput(), policy, dependencies()),
    ).resolves.toBe('authorized');
  });
});
