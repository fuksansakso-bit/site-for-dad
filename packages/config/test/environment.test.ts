import { describe, expect, it } from 'vitest';

import { EnvironmentValidationError } from '../src/errors.js';
import { parsePublicEnvironment } from '../src/public.js';
import {
  parseDatabaseEnvironment,
  parseIdentityEnvironment,
  parseMigrationEnvironment,
  parseStorageEnvironment,
  parseWebServerEnvironment,
  parseWorkerEnvironment,
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

  it('keeps Phase 1A object storage on distinct loopback trust zones', () => {
    const validStorageEnvironment = {
      ...baseEnvironment,
      S3_ACCESS_KEY_ID: 'synthetic-access-key',
      S3_BUCKET_PRIVATE: 'project-name-test-private',
      S3_BUCKET_PUBLIC: 'project-name-test-public',
      S3_BUCKET_QUARANTINE: 'project-name-test-quarantine',
      S3_ENDPOINT: 'http://127.0.0.1:4569',
      S3_FORCE_PATH_STYLE: 'true',
      S3_MAX_OBJECT_BYTES: '1048576',
      S3_REGION: 'local',
      S3_REQUEST_TIMEOUT_MS: '2000',
      S3_SECRET_ACCESS_KEY: 'synthetic-secret-key-for-tests',
      SIGNED_URL_TTL_SECONDS: '300',
    } as const;

    expect(parseStorageEnvironment(validStorageEnvironment).S3_FORCE_PATH_STYLE).toBe(true);
    expect(() =>
      parseStorageEnvironment({
        ...validStorageEnvironment,
        S3_ENDPOINT: 'https://object-provider.example',
      }),
    ).toThrowError(EnvironmentValidationError);
    expect(() =>
      parseStorageEnvironment({
        ...validStorageEnvironment,
        S3_BUCKET_PRIVATE: validStorageEnvironment.S3_BUCKET_PUBLIC,
      }),
    ).toThrowError(EnvironmentValidationError);
  });

  it('requires bounded worker retry, poll, job timeout, and shutdown controls', () => {
    const validWorkerEnvironment = {
      ...baseEnvironment,
      WORKER_CONCURRENCY: '1',
      WORKER_HEALTH_HOST: '127.0.0.1',
      WORKER_HEALTH_PORT: '9464',
      WORKER_JOB_TIMEOUT_MS: '5000',
      WORKER_MAX_ATTEMPTS: '3',
      WORKER_POLL_INTERVAL_MS: '500',
      WORKER_SHUTDOWN_TIMEOUT_MS: '10000',
    } as const;

    expect(parseWorkerEnvironment(validWorkerEnvironment)).toMatchObject({
      WORKER_JOB_TIMEOUT_MS: 5000,
      WORKER_MAX_ATTEMPTS: 3,
    });
    expect(() =>
      parseWorkerEnvironment({
        ...validWorkerEnvironment,
        WORKER_SHUTDOWN_TIMEOUT_MS: validWorkerEnvironment.WORKER_JOB_TIMEOUT_MS,
      }),
    ).toThrowError(EnvironmentValidationError);
  });

  it('accepts only a safe unquoted PostgreSQL runtime role for queue hardening', () => {
    const migrationDatabaseUrl = [
      'postgresql://migrator',
      'synthetic-only@127.0.0.1/foundation',
    ].join(':');
    expect(
      parseMigrationEnvironment({
        ...baseEnvironment,
        MIGRATION_DATABASE_URL: migrationDatabaseUrl,
        WORKER_RUNTIME_DATABASE_ROLE: 'foundation_runtime',
      }).WORKER_RUNTIME_DATABASE_ROLE,
    ).toBe('foundation_runtime');
    expect(() =>
      parseMigrationEnvironment({
        ...baseEnvironment,
        MIGRATION_DATABASE_URL: migrationDatabaseUrl,
        WORKER_RUNTIME_DATABASE_ROLE: 'foundation_runtime; DROP ROLE foundation_runtime',
      }),
    ).toThrowError(EnvironmentValidationError);
  });
});
