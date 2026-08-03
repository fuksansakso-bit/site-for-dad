import { describe, expect, it } from 'vitest';

import { livenessResponseSchema, readinessResponseSchema } from '../src/index.js';

describe('health contracts', () => {
  it('accepts a minimal safe liveness response', () => {
    expect(
      livenessResponseSchema.parse({
        correlationId: 'test-correlation-1234',
        status: 'ok',
      }),
    ).toBeDefined();
  });

  it('rejects readiness that hides an unavailable dependency', () => {
    expect(() =>
      readinessResponseSchema.parse({
        checks: { database: 'unavailable' },
        correlationId: 'test-correlation-1234',
        status: 'ok',
      }),
    ).toThrow();
  });
});
