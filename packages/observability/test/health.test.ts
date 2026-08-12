import { describe, expect, it } from 'vitest';

import { runFoundationReadinessChecks } from '../src/health.js';
import { FoundationMetrics } from '../src/metrics.js';

describe('readiness isolation', () => {
  it('classifies each dependency independently and records failure separately', async () => {
    const metrics = new FoundationMetrics();
    const checks = await runFoundationReadinessChecks(
      [
        { check: async () => 'ok', name: 'database' },
        {
          check: async () => {
            throw new Error('private endpoint detail');
          },
          name: 'storage',
        },
      ],
      { metrics, timeoutMs: 100 },
    );

    expect(checks).toEqual({ database: 'ok', storage: 'unavailable' });
    expect(metrics.read('database', 'health.database.readiness')).toMatchObject({
      errorCount: 0,
      status: 'observed',
    });
    expect(metrics.read('storage', 'health.storage.readiness')).toMatchObject({
      errorCount: 1,
      status: 'observed',
    });
  });

  it('rejects duplicate dependency names', async () => {
    await expect(
      runFoundationReadinessChecks(
        [
          { check: async () => 'ok', name: 'database' },
          { check: async () => 'ok', name: 'database' },
        ],
        { timeoutMs: 100 },
      ),
    ).rejects.toThrow('unique');
  });
});
