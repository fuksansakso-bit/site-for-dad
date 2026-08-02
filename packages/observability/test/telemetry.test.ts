import { describe, expect, it } from 'vitest';

import { initializeNodeTelemetry, otlpSignalEndpoint, parseOtlpHeaders } from '../src/telemetry.js';

describe('OTLP configuration', () => {
  it('derives protocol signal endpoints from a provider-neutral base URL', () => {
    expect(otlpSignalEndpoint('http://127.0.0.1:4318', 'traces')).toBe(
      'http://127.0.0.1:4318/v1/traces',
    );
    expect(otlpSignalEndpoint('https://collector.example/tenant/', 'metrics')).toBe(
      'https://collector.example/tenant/v1/metrics',
    );
  });

  it('parses encoded headers without exposing values in validation failures', () => {
    expect(parseOtlpHeaders('x-project=foundation%20test')).toEqual({
      'x-project': 'foundation test',
    });
    expect(() => parseOtlpHeaders('invalid-header')).toThrow(
      'OTLP header configuration is invalid.',
    );
  });

  it('uses an explicit local no-export runtime when no collector is configured', async () => {
    const runtime = initializeNodeTelemetry(
      { APP_ENV: 'test', BUILD_ID: 'test-build', LOG_LEVEL: 'info' },
      'project-name-test',
    );

    expect(runtime.exportEnabled).toBe(false);
    await expect(runtime.shutdown()).resolves.toBeUndefined();
  });
});
