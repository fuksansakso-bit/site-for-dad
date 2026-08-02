import { describe, expect, it } from 'vitest';

import { EnvironmentValidationError } from '../src/errors.js';
import { parsePublicEnvironment } from '../src/public.js';
import {
  parseDatabaseEnvironment,
  parseIdentityEnvironment,
  parseWebServerEnvironment,
  serverOnlyEnvironmentKeys,
} from '../src/server.js';

const baseEnvironment = {
  APP_ENV: 'test',
  LOG_LEVEL: 'info',
} as const;

describe('typed environment validation', () => {
  it('fails fast with variable names but never rejected values', () => {
    const leakedValue = ['postgresql://user', 'do-not-leak@localhost/database'].join(':');

    expect(() =>
      parseWebServerEnvironment({
        ...baseEnvironment,
        HEALTH_CHECK_TIMEOUT_MS: 'not-a-number',
        REQUEST_BODY_LIMIT_BYTES: leakedValue,
      }),
    ).toThrowError(EnvironmentValidationError);

    try {
      parseWebServerEnvironment({
        ...baseEnvironment,
        HEALTH_CHECK_TIMEOUT_MS: 'not-a-number',
        REQUEST_BODY_LIMIT_BYTES: leakedValue,
      });
    } catch (error) {
      expect(String(error)).toContain('HEALTH_CHECK_TIMEOUT_MS');
      expect(String(error)).toContain('REQUEST_BODY_LIMIT_BYTES');
      expect(String(error)).not.toContain(leakedValue);
    }
  });

  it('rejects unprovisioned staging and production profiles in Phase 1A', () => {
    for (const APP_ENV of ['staging', 'production']) {
      expect(() =>
        parseWebServerEnvironment({
          APP_ENV,
          HEALTH_CHECK_TIMEOUT_MS: '1000',
          LOG_LEVEL: 'info',
          REQUEST_BODY_LIMIT_BYTES: '1048576',
        }),
      ).toThrowError(EnvironmentValidationError);
    }
  });

  it('allows only explicit client-visible variables', () => {
    expect(
      parsePublicEnvironment({
        NEXT_PUBLIC_APP_ENV: 'test',
      }),
    ).toEqual({ NEXT_PUBLIC_APP_ENV: 'test' });

    expect(() =>
      parsePublicEnvironment({
        NEXT_PUBLIC_APP_ENV: 'test',
        NEXT_PUBLIC_DATABASE_URL: 'postgresql://should-not-be-public',
      }),
    ).toThrowError(EnvironmentValidationError);
    expect(serverOnlyEnvironmentKeys).not.toContain('NEXT_PUBLIC_APP_ENV');
  });

  it('requires explicit database and identity secrets without fallbacks', () => {
    expect(() => parseDatabaseEnvironment(baseEnvironment)).toThrowError(
      EnvironmentValidationError,
    );
    expect(() => parseIdentityEnvironment(baseEnvironment)).toThrowError(
      EnvironmentValidationError,
    );
  });
});
