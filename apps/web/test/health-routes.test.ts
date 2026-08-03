import { livenessResponseSchema, readinessResponseSchema } from '@project-name/contracts/health';
import { createFoundationLogger } from '@project-name/observability/logger';
import { FoundationMetrics } from '@project-name/observability/metrics';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { createLivenessHandler } from '../app/api/v1/health/live/route';
import { createReadinessHandler } from '../app/api/v1/health/ready/route';
import { createContentSecurityPolicy, proxy } from '../proxy';

function testTelemetry() {
  return {
    logger: createFoundationLogger({
      buildId: 'test-build',
      environment: 'test' as const,
      minimumSeverity: 'error' as const,
      service: 'web',
      sink: () => undefined,
    }),
    metrics: new FoundationMetrics(),
  };
}

describe('web health route contracts', () => {
  it('returns a safe liveness response and preserves a valid correlation ID', async () => {
    const response = await createLivenessHandler(testTelemetry)(
      new NextRequest('http://localhost/api/v1/health/live', {
        headers: { 'x-correlation-id': 'test-correlation-1234' },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(livenessResponseSchema.parse(await response.json())).toMatchObject({
      correlationId: 'test-correlation-1234',
      status: 'ok',
    });
  });

  it('returns only generic readiness checks', async () => {
    const response = await createReadinessHandler(
      async () => ({ database: 'ok', process: 'ok', storage: 'ok' }),
      testTelemetry,
    )(new NextRequest('http://localhost/api/v1/health/ready'));
    const payload = readinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      checks: { database: 'ok', process: 'ok', storage: 'ok' },
      status: 'ok',
    });
    expect(JSON.stringify(payload)).not.toMatch(/postgres|password|version|https?:\/\//i);
  });

  it('returns generic 503 readiness without dependency error details', async () => {
    const response = await createReadinessHandler(async () => {
      throw new Error('private connection and endpoint details');
    }, testTelemetry)(new NextRequest('http://localhost/api/v1/health/ready'));
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(readinessResponseSchema.parse(JSON.parse(text))).toMatchObject({
      checks: { database: 'unavailable', process: 'ok', storage: 'unavailable' },
      status: 'unavailable',
    });
    expect(text).not.toContain('private connection');
  });

  it('propagates safe correlation and request IDs through the web proxy', () => {
    const response = proxy(
      new NextRequest('http://localhost/foundation-path', {
        headers: {
          'x-correlation-id': 'correlation-proxy-1234',
          'x-request-id': 'request-proxy-1234',
        },
      }),
    );

    expect(response.headers.get('x-correlation-id')).toBe('correlation-proxy-1234');
    expect(response.headers.get('x-request-id')).toBe('request-proxy-1234');
    expect(response.headers.get('content-security-policy')).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
  });

  it('keeps production CSP strict while allowing only development diagnostics', () => {
    const production = createContentSecurityPolicy('synthetic-nonce', false);
    const development = createContentSecurityPolicy('synthetic-nonce', true);

    expect(production).toContain("object-src 'none'");
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).not.toContain("'unsafe-inline'");
    expect(production).not.toContain("'unsafe-eval'");
    expect(development).toContain("'unsafe-eval'");
    expect(development).toContain("style-src 'self' 'unsafe-inline'");
    expect(development).not.toContain("style-src 'self' 'nonce-synthetic-nonce'");
  });
});
