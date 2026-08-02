import { PrismaPg } from '@prisma/adapter-pg';
import type { DatabaseEnvironment } from '@project-name/config/server';

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
  try {
    await Promise.race([
      client.$queryRaw`SELECT 1`,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error('database readiness timeout')),
          timeoutMilliseconds,
        );
        timeout.unref();
      }),
    ]);
    return 'ok';
  } catch {
    return 'unavailable';
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
