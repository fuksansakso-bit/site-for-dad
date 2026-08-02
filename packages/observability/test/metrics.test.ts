import { describe, expect, it } from 'vitest';

import { FoundationMetrics } from '../src/metrics.js';

describe('foundation metrics', () => {
  it('distinguishes unknown telemetry from observed zero errors', () => {
    const metrics = new FoundationMetrics();

    expect(metrics.read('database', 'database.readiness')).toEqual({ status: 'unknown' });
    metrics.record({
      component: 'database',
      durationMs: 12,
      operation: 'database.readiness',
      outcome: 'success',
    });
    expect(metrics.read('database', 'database.readiness')).toMatchObject({
      count: 1,
      errorCount: 0,
      maximumDurationMs: 12,
      status: 'observed',
      totalDurationMs: 12,
    });
  });

  it('rejects dynamic/high-cardinality operation labels', () => {
    const metrics = new FoundationMetrics();
    expect(() =>
      metrics.record({
        component: 'http',
        durationMs: 1,
        operation: '/api/v1/private?id=synthetic',
        outcome: 'success',
      }),
    ).toThrow('operation');
  });
});
