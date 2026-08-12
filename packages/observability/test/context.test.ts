import { describe, expect, it } from 'vitest';

import {
  createFoundationTelemetryContext,
  currentFoundationTelemetryContext,
  runWithFoundationTelemetryContext,
  traceIdFromTraceparent,
} from '../src/context.js';

describe('telemetry context', () => {
  it('keeps safe request context across asynchronous boundaries', async () => {
    const context = createFoundationTelemetryContext({
      correlationId: 'correlation-test-1234',
      requestId: 'request-test-1234',
    });

    await runWithFoundationTelemetryContext(context, async () => {
      await Promise.resolve();
      expect(currentFoundationTelemetryContext()).toEqual(context);
    });
    expect(currentFoundationTelemetryContext()).toBeUndefined();
  });

  it('accepts a valid W3C trace ID and rejects an all-zero trace ID', () => {
    expect(traceIdFromTraceparent('00-0123456789abcdef0123456789abcdef-0123456789abcdef-01')).toBe(
      '0123456789abcdef0123456789abcdef',
    );
    expect(
      traceIdFromTraceparent('00-00000000000000000000000000000000-0123456789abcdef-01'),
    ).toBeUndefined();
  });
});
