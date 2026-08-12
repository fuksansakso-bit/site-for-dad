import { describe, expect, it, vi } from 'vitest';

import { foundationProbePayloadSchema } from '../../src/contracts.js';
import { createFoundationGraphileLogger } from '../../src/logger.js';
import { runWithJobTimeout } from '../../src/timeout.js';

describe('foundation job contracts', () => {
  it('accepts only the versioned synthetic payload and rejects secret/raw fields', () => {
    const payload = {
      correlationId: 'correlation-unit-001',
      delayMilliseconds: 0,
      idempotencyKey: 'foundation-probe:unit-001',
      mode: 'SUCCEED',
      schemaVersion: 1,
    } as const;
    expect(foundationProbePayloadSchema.parse(payload)).toEqual(payload);
    expect(() =>
      foundationProbePayloadSchema.parse({ ...payload, token: 'not-allowed' }),
    ).toThrow();
    expect(() => foundationProbePayloadSchema.parse({ ...payload, bytes: [1, 2, 3] })).toThrow();
  });

  it('enforces the per-job timeout with a safe machine code', async () => {
    const shutdown = new AbortController();
    await expect(
      runWithJobTimeout(20, shutdown.signal, () => new Promise(() => undefined)),
    ).rejects.toMatchObject({ code: 'FOUNDATION_JOB_TIMEOUT' });
  });

  it('drops raw Graphile messages and metadata from structured logs', () => {
    const sink = vi.fn();
    const logger = createFoundationGraphileLogger(sink);
    logger.error('sensitive-provider-message', { password: 'sensitive-value' });

    expect(sink).toHaveBeenCalledOnce();
    const serialized = JSON.stringify(sink.mock.calls);
    expect(serialized).not.toContain('sensitive-provider-message');
    expect(serialized).not.toContain('sensitive-value');
    expect(sink.mock.calls[0]?.[0]).toMatchObject({
      event: 'queue.library',
      level: 'error',
      messageCode: 'QUEUE_INTERNAL_STATE',
    });
  });
});
