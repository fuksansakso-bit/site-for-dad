import { PrismaPg } from '@prisma/adapter-pg';
import type { DatabaseEnvironment } from '@project-name/config/server';
import { foundationMetrics } from '@project-name/observability/metrics';
import { runInFoundationSpan } from '@project-name/observability/tracing';

import { PrismaClient } from './generated/prisma/client.js';

export type FoundationPrismaClient = PrismaClient;

export function createPrismaClient(environment: DatabaseEnvironment): FoundationPrismaClient {
  const adapter = new PrismaPg({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(environment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return new PrismaClient({ adapter });
}

export async function checkDatabaseReadiness(
  client: FoundationPrismaClient,
  timeoutMilliseconds: number,
): Promise<'ok' | 'unavailable'> {
  let timeout: NodeJS.Timeout | undefined;
  const startedAt = performance.now();
  let outcome: 'failure' | 'success' = 'failure';
  try {
    await runInFoundationSpan(
      'database.readiness',
      { 'db.operation.name': 'readiness' },
      async () =>
        Promise.race([
          client.$queryRaw`SELECT 1`,
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(
              () => reject(new Error('database readiness timeout')),
              timeoutMilliseconds,
            );
            timeout.unref();
          }),
        ]),
    );
    outcome = 'success';
    return 'ok';
  } catch {
    return 'unavailable';
  } finally {
    foundationMetrics.record({
      component: 'database',
      durationMs: performance.now() - startedAt,
      operation: 'database.readiness',
      outcome,
    });
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
