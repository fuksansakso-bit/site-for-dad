import { livenessResponseSchema, readinessResponseSchema } from '@project-name/contracts/health';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET as live } from '../app/api/v1/health/live/route';
import { GET as ready } from '../app/api/v1/health/ready/route';

describe('web health route contracts', () => {
  it('returns a safe liveness response and preserves a valid correlation ID', async () => {
    const response = live(
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
    const response = ready(new NextRequest('http://localhost/api/v1/health/ready'));
    const payload = readinessResponseSchema.parse(await response.json());

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ checks: { process: 'ok' }, status: 'ok' });
    expect(JSON.stringify(payload)).not.toMatch(/postgres|password|version|https?:\/\//i);
  });
});
