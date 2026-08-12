import type { DependencyHealth } from '@project-name/contracts/health';

import type { FoundationMetrics } from './metrics.js';

export const foundationDependencyNames = [
  'database',
  'process',
  'queue',
  'storage',
  'worker',
] as const;
export type FoundationDependencyName = (typeof foundationDependencyNames)[number];

export interface FoundationReadinessCheck {
  readonly check: () => Promise<DependencyHealth>;
  readonly name: FoundationDependencyName;
}

export interface FoundationReadinessOptions {
  readonly metrics?: FoundationMetrics;
  readonly timeoutMs: number;
}

async function boundedCheck(
  readinessCheck: FoundationReadinessCheck,
  timeoutMs: number,
): Promise<DependencyHealth> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      readinessCheck.check(),
      new Promise<'unavailable'>((resolve) => {
        timeout = setTimeout(() => resolve('unavailable'), timeoutMs);
        timeout.unref();
      }),
    ]);
  } catch {
    return 'unavailable';
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

export async function runFoundationReadinessChecks(
  checks: readonly FoundationReadinessCheck[],
  options: FoundationReadinessOptions,
): Promise<Readonly<Record<string, DependencyHealth>>> {
  if (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1) {
    throw new TypeError('Readiness timeout is invalid.');
  }
  if (new Set(checks.map((check) => check.name)).size !== checks.length) {
    throw new TypeError('Readiness check names must be unique.');
  }
  const results = await Promise.all(
    checks.map(async (readinessCheck) => {
      const startedAt = performance.now();
      const status = await boundedCheck(readinessCheck, options.timeoutMs);
      options.metrics?.record({
        component: readinessCheck.name === 'process' ? 'http' : readinessCheck.name,
        durationMs: performance.now() - startedAt,
        operation: `health.${readinessCheck.name}.readiness`,
        outcome: status === 'ok' ? 'success' : 'failure',
      });
      return [readinessCheck.name, status] as const;
    }),
  );
  return Object.fromEntries(results);
}
