import { z } from 'zod';

import {
  parseEnvironment,
  phase1ABaseSchema,
  positiveIntegerString,
  type EnvironmentSource,
} from './shared.js';

const baseKeys = ['APP_ENV', 'LOG_LEVEL'] as const;

const webServerEnvironmentSchema = phase1ABaseSchema
  .extend({
    HEALTH_CHECK_TIMEOUT_MS: positiveIntegerString(100, 30_000),
    REQUEST_BODY_LIMIT_BYTES: positiveIntegerString(1_024, 10 * 1_024 * 1_024),
  })
  .strict();
export type WebServerEnvironment = z.infer<typeof webServerEnvironmentSchema>;
const webServerKeys = [...baseKeys, 'HEALTH_CHECK_TIMEOUT_MS', 'REQUEST_BODY_LIMIT_BYTES'] as const;

const workerEnvironmentSchema = phase1ABaseSchema
  .extend({
    WORKER_CONCURRENCY: positiveIntegerString(1, 32),
    WORKER_HEALTH_HOST: z.enum(['127.0.0.1', '::1']),
    WORKER_HEALTH_PORT: positiveIntegerString(1, 65_535),
    WORKER_JOB_TIMEOUT_MS: positiveIntegerString(100, 120_000),
    WORKER_MAX_ATTEMPTS: positiveIntegerString(1, 25),
    WORKER_POLL_INTERVAL_MS: positiveIntegerString(100, 30_000),
    WORKER_SHUTDOWN_TIMEOUT_MS: positiveIntegerString(1_000, 120_000),
  })
  .superRefine((environment, context) => {
    if (environment.WORKER_SHUTDOWN_TIMEOUT_MS <= environment.WORKER_JOB_TIMEOUT_MS) {
      context.addIssue({
        code: 'custom',
        message: 'Worker shutdown timeout must exceed the per-job timeout.',
        path: ['WORKER_SHUTDOWN_TIMEOUT_MS'],
      });
    }
  })
  .strict();
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;
const workerKeys = [
  ...baseKeys,
  'WORKER_CONCURRENCY',
  'WORKER_HEALTH_HOST',
  'WORKER_HEALTH_PORT',
  'WORKER_JOB_TIMEOUT_MS',
  'WORKER_MAX_ATTEMPTS',
  'WORKER_POLL_INTERVAL_MS',
  'WORKER_SHUTDOWN_TIMEOUT_MS',
] as const;

const postgresUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
    message: 'Must use the PostgreSQL URL scheme.',
  });

const databaseEnvironmentSchema = phase1ABaseSchema
  .extend({
    DATABASE_STATEMENT_TIMEOUT_MS: positiveIntegerString(100, 120_000),
    DATABASE_URL: postgresUrlSchema,
  })
  .strict();
export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;

const migrationEnvironmentSchema = phase1ABaseSchema
  .extend({
    MIGRATION_DATABASE_URL: postgresUrlSchema,
    WORKER_RUNTIME_DATABASE_ROLE: z
      .string()
      .min(1)
      .max(63)
      .regex(/^[a-z][a-z0-9_]*$/),
  })
  .strict();
export type MigrationEnvironment = z.infer<typeof migrationEnvironmentSchema>;

const localS3EndpointSchema = z
  .string()
  .url()
  .refine((value) => {
    const endpoint = new URL(value);
    return (
      endpoint.username === '' &&
      endpoint.password === '' &&
      endpoint.pathname === '/' &&
      endpoint.search === '' &&
      endpoint.hash === '' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname)
    );
  }, 'Phase 1A storage endpoint must be an uncredentialed loopback URL.');

const storageEnvironmentSchema = phase1ABaseSchema
  .extend({
    S3_ACCESS_KEY_ID: z.string().min(16).max(256),
    S3_BUCKET_PRIVATE: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/),
    S3_BUCKET_PUBLIC: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/),
    S3_BUCKET_QUARANTINE: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/),
    S3_ENDPOINT: localS3EndpointSchema,
    S3_FORCE_PATH_STYLE: z.literal('true').transform(() => true as const),
    S3_MAX_OBJECT_BYTES: positiveIntegerString(1, 10 * 1_024 * 1_024),
    S3_MAX_ATTEMPTS: positiveIntegerString(1, 5),
    S3_MULTIPART_PART_SIZE_BYTES: positiveIntegerString(5 * 1_024 * 1_024, 10 * 1_024 * 1_024),
    S3_MULTIPART_THRESHOLD_BYTES: positiveIntegerString(5 * 1_024 * 1_024, 10 * 1_024 * 1_024),
    S3_REGION: z.string().min(1).max(64),
    S3_REQUEST_TIMEOUT_MS: positiveIntegerString(100, 30_000),
    S3_SECRET_ACCESS_KEY: z.string().min(16).max(512),
    SIGNED_URL_TTL_SECONDS: positiveIntegerString(30, 900),
  })
  .superRefine((environment, context) => {
    const buckets = [
      environment.S3_BUCKET_PUBLIC,
      environment.S3_BUCKET_PRIVATE,
      environment.S3_BUCKET_QUARANTINE,
    ];
    if (new Set(buckets).size !== buckets.length) {
      for (const path of ['S3_BUCKET_PUBLIC', 'S3_BUCKET_PRIVATE', 'S3_BUCKET_QUARANTINE']) {
        context.addIssue({
          code: 'custom',
          message: 'Storage trust-zone bucket names must be distinct.',
          path: [path],
        });
      }
    }
    if (environment.S3_MULTIPART_THRESHOLD_BYTES >= environment.S3_MAX_OBJECT_BYTES) {
      context.addIssue({
        code: 'custom',
        message: 'Multipart threshold must be smaller than the maximum object size.',
        path: ['S3_MULTIPART_THRESHOLD_BYTES'],
      });
    }
    if (environment.S3_MULTIPART_PART_SIZE_BYTES > environment.S3_MAX_OBJECT_BYTES) {
      context.addIssue({
        code: 'custom',
        message: 'Multipart part size must not exceed the maximum object size.',
        path: ['S3_MULTIPART_PART_SIZE_BYTES'],
      });
    }
  })
  .strict();
export type StorageEnvironment = z.infer<typeof storageEnvironmentSchema>;

const identityEnvironmentSchema = phase1ABaseSchema
  .extend({
    SESSION_SIGNING_KEY: z.string().min(32).max(512),
    SYNTHETIC_IDENTITY_ENABLED: z.literal('true').transform(() => true as const),
  })
  .strict();
export type IdentityEnvironment = z.infer<typeof identityEnvironmentSchema>;

const observabilityEnvironmentSchema = phase1ABaseSchema
  .extend({
    BUILD_ID: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[A-Za-z0-9._-]+$/),
    OTEL_EXPORTER_OTLP_ENDPOINT: z
      .string()
      .url()
      .refine((value) => {
        const endpoint = new URL(value);
        return (
          ['http:', 'https:'].includes(endpoint.protocol) &&
          endpoint.username === '' &&
          endpoint.password === '' &&
          endpoint.search === '' &&
          endpoint.hash === ''
        );
      }, 'OTLP endpoint must be an uncredentialed HTTP(S) base URL.')
      .optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().min(1).max(2_048).optional(),
  })
  .strict();
export type ObservabilityEnvironment = z.infer<typeof observabilityEnvironmentSchema>;

export const serverOnlyEnvironmentKeys = [
  'DATABASE_URL',
  'MIGRATION_DATABASE_URL',
  'OTEL_EXPORTER_OTLP_HEADERS',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'SESSION_SIGNING_KEY',
] as const;

export function parseWebServerEnvironment(source: EnvironmentSource): WebServerEnvironment {
  return parseEnvironment('web server', webServerEnvironmentSchema, source, webServerKeys);
}

export function parseWorkerEnvironment(source: EnvironmentSource): WorkerEnvironment {
  return parseEnvironment('worker', workerEnvironmentSchema, source, workerKeys);
}

export function parseDatabaseEnvironment(source: EnvironmentSource): DatabaseEnvironment {
  return parseEnvironment('database', databaseEnvironmentSchema, source, [
    ...baseKeys,
    'DATABASE_STATEMENT_TIMEOUT_MS',
    'DATABASE_URL',
  ]);
}

export function parseMigrationEnvironment(source: EnvironmentSource): MigrationEnvironment {
  return parseEnvironment('migration', migrationEnvironmentSchema, source, [
    ...baseKeys,
    'MIGRATION_DATABASE_URL',
    'WORKER_RUNTIME_DATABASE_ROLE',
  ]);
}

export function parseStorageEnvironment(source: EnvironmentSource): StorageEnvironment {
  return parseEnvironment('storage', storageEnvironmentSchema, source, [
    ...baseKeys,
    'S3_ACCESS_KEY_ID',
    'S3_BUCKET_PRIVATE',
    'S3_BUCKET_PUBLIC',
    'S3_BUCKET_QUARANTINE',
    'S3_ENDPOINT',
    'S3_FORCE_PATH_STYLE',
    'S3_MAX_OBJECT_BYTES',
    'S3_MAX_ATTEMPTS',
    'S3_MULTIPART_PART_SIZE_BYTES',
    'S3_MULTIPART_THRESHOLD_BYTES',
    'S3_REGION',
    'S3_REQUEST_TIMEOUT_MS',
    'S3_SECRET_ACCESS_KEY',
    'SIGNED_URL_TTL_SECONDS',
  ]);
}

export function parseIdentityEnvironment(source: EnvironmentSource): IdentityEnvironment {
  return parseEnvironment('identity', identityEnvironmentSchema, source, [
    ...baseKeys,
    'SESSION_SIGNING_KEY',
    'SYNTHETIC_IDENTITY_ENABLED',
  ]);
}

export function parseObservabilityEnvironment(source: EnvironmentSource): ObservabilityEnvironment {
  return parseEnvironment('observability', observabilityEnvironmentSchema, source, [
    ...baseKeys,
    'BUILD_ID',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'OTEL_EXPORTER_OTLP_HEADERS',
  ]);
}
