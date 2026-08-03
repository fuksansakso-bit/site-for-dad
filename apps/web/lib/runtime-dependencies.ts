import {
  parseDatabaseEnvironment,
  parseStorageEnvironment,
  parseWebServerEnvironment,
} from '@project-name/config/server';
import { checkDatabaseReadiness, createPrismaClient } from '@project-name/db';
import { runFoundationReadinessChecks } from '@project-name/observability/health';
import { createS3ObjectStorage } from '@project-name/storage';

import { getWebObservability } from './observability';

let readinessProvider: (() => Promise<Readonly<Record<string, 'ok' | 'unavailable'>>>) | undefined;

export function getWebReadinessProvider(): () => Promise<
  Readonly<Record<string, 'ok' | 'unavailable'>>
> {
  if (readinessProvider !== undefined) return readinessProvider;
  const webEnvironment = parseWebServerEnvironment(process.env);
  const databaseEnvironment = parseDatabaseEnvironment(process.env);
  const storageEnvironment = parseStorageEnvironment(process.env);
  const database = createPrismaClient(databaseEnvironment);
  const storage = createS3ObjectStorage(storageEnvironment);

  readinessProvider = () =>
    runFoundationReadinessChecks(
      [
        { check: async () => 'ok', name: 'process' },
        {
          check: () => checkDatabaseReadiness(database, webEnvironment.HEALTH_CHECK_TIMEOUT_MS),
          name: 'database',
        },
        { check: () => storage.checkReadiness(), name: 'storage' },
      ],
      {
        metrics: getWebObservability().metrics,
        timeoutMs: webEnvironment.HEALTH_CHECK_TIMEOUT_MS,
      },
    );
  return readinessProvider;
}
