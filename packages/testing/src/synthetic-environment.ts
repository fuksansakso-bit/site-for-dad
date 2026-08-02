import { randomBytes } from 'node:crypto';

import type { EnvironmentSource } from '@project-name/config';

export interface SyntheticFoundationEnvironmentOptions {
  readonly buildId?: string;
  readonly databasePort: number;
  readonly storagePort: number;
  readonly workerHealthPort: number;
}

function token(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

function assertPort(port: number): void {
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new TypeError('Synthetic environment port is invalid.');
  }
}

export function createSyntheticFoundationEnvironment(
  options: SyntheticFoundationEnvironmentOptions,
): EnvironmentSource {
  assertPort(options.databasePort);
  assertPort(options.storagePort);
  assertPort(options.workerHealthPort);
  const runtimePassword = token(24);
  const migrationPassword = token(24);
  const postgresScheme = ['postgre', 'sql'].join('');
  return {
    APP_ENV: 'test',
    BUILD_ID: options.buildId ?? 'phase-1a-synthetic',
    DATABASE_STATEMENT_TIMEOUT_MS: '3000',
    DATABASE_URL: `${postgresScheme}://foundation_runtime:${runtimePassword}@127.0.0.1:${options.databasePort}/foundation`,
    HEALTH_CHECK_TIMEOUT_MS: '1000',
    LOG_LEVEL: 'info',
    MIGRATION_DATABASE_URL: `${postgresScheme}://foundation_migrator:${migrationPassword}@127.0.0.1:${options.databasePort}/foundation`,
    NEXT_PUBLIC_APP_ENV: 'test',
    REQUEST_BODY_LIMIT_BYTES: '1048576',
    S3_ACCESS_KEY_ID: token(16),
    S3_BUCKET_PRIVATE: 'project-name-synthetic-private',
    S3_BUCKET_PUBLIC: 'project-name-synthetic-public',
    S3_BUCKET_QUARANTINE: 'project-name-synthetic-quarantine',
    S3_ENDPOINT: `http://127.0.0.1:${options.storagePort}`,
    S3_FORCE_PATH_STYLE: 'true',
    S3_MAX_OBJECT_BYTES: '1048576',
    S3_REGION: 'local',
    S3_REQUEST_TIMEOUT_MS: '2000',
    S3_SECRET_ACCESS_KEY: token(32),
    SESSION_SIGNING_KEY: token(32),
    SIGNED_URL_TTL_SECONDS: '300',
    SYNTHETIC_IDENTITY_ENABLED: 'true',
    WORKER_CONCURRENCY: '1',
    WORKER_HEALTH_HOST: '127.0.0.1',
    WORKER_HEALTH_PORT: String(options.workerHealthPort),
    WORKER_JOB_TIMEOUT_MS: '3000',
    WORKER_MAX_ATTEMPTS: '3',
    WORKER_POLL_INTERVAL_MS: '250',
    WORKER_RUNTIME_DATABASE_ROLE: 'foundation_runtime',
    WORKER_SHUTDOWN_TIMEOUT_MS: '6000',
  };
}
