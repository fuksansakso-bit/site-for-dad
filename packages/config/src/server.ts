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
    WORKER_SHUTDOWN_TIMEOUT_MS: positiveIntegerString(1_000, 120_000),
  })
  .strict();
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;
const workerKeys = [
  ...baseKeys,
  'WORKER_CONCURRENCY',
  'WORKER_HEALTH_HOST',
  'WORKER_HEALTH_PORT',
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
  })
  .strict();
export type MigrationEnvironment = z.infer<typeof migrationEnvironmentSchema>;

const storageEnvironmentSchema = phase1ABaseSchema
  .extend({
    S3_ACCESS_KEY_ID: z.string().min(1).max(256),
    S3_BUCKET: z
      .string()
      .min(3)
      .max(63)
      .regex(/^[a-z0-9][a-z0-9.-]+[a-z0-9]$/),
    S3_ENDPOINT: z.string().url(),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).transform((value) => value === 'true'),
    S3_REGION: z.string().min(1).max(64),
    S3_SECRET_ACCESS_KEY: z.string().min(16).max(512),
    SIGNED_URL_TTL_SECONDS: positiveIntegerString(30, 900),
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
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
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
  ]);
}

export function parseStorageEnvironment(source: EnvironmentSource): StorageEnvironment {
  return parseEnvironment('storage', storageEnvironmentSchema, source, [
    ...baseKeys,
    'S3_ACCESS_KEY_ID',
    'S3_BUCKET',
    'S3_ENDPOINT',
    'S3_FORCE_PATH_STYLE',
    'S3_REGION',
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
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'OTEL_EXPORTER_OTLP_HEADERS',
  ]);
}
