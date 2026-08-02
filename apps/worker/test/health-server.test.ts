import { once } from 'node:events';

import { livenessResponseSchema, readinessResponseSchema } from '@project-name/contracts/health';
import { afterEach, describe, expect, it } from 'vitest';

import { createWorkerHealthServer } from '../src/health-server.js';

const activeServers: ReturnType<typeof createWorkerHealthServer>[] = [];

afterEach(async () => {
  await Promise.all(
    activeServers.splice(0).map(async (server) => {
      server.close();
      await once(server, 'close');
    }),
  );
});

async function startServer(
  checkReadiness: () => Promise<Readonly<Record<string, 'ok' | 'unavailable'>>>,
): Promise<string> {
  const server = createWorkerHealthServer({ checkReadiness });
  activeServers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Worker test server did not expose a TCP address');
  }
  return `http://127.0.0.1:${address.port}`;
}

describe('worker health server', () => {
  it('separates liveness from readiness', async () => {
    const baseUrl = await startServer(async () => ({ queue: 'unavailable', worker: 'ok' }));
    const liveResponse = await fetch(`${baseUrl}/health/live`);
    const readyResponse = await fetch(`${baseUrl}/health/ready`);

    expect(liveResponse.status).toBe(200);
    expect(liveResponse.headers.get('x-request-id')).toMatch(/^[A-Za-z0-9._:-]+$/);
    expect(livenessResponseSchema.parse(await liveResponse.json()).status).toBe('ok');
    expect(readyResponse.status).toBe(503);
    expect(readinessResponseSchema.parse(await readyResponse.json())).toMatchObject({
      checks: { queue: 'unavailable', worker: 'ok' },
      status: 'unavailable',
    });
  });

  it('returns a safe not-found error without internal details', async () => {
    const baseUrl = await startServer(async () => ({ queue: 'ok', worker: 'ok' }));
    const response = await fetch(`${baseUrl}/internal-path`);
    const text = await response.text();

    expect(response.status).toBe(404);
    expect(text).not.toMatch(/stack|C:\\|connection|password/i);
  });

  it('maps a readiness dependency exception to a safe unavailable response', async () => {
    const baseUrl = await startServer(async () => {
      throw new Error('synthetic connection details that must stay private');
    });
    const response = await fetch(`${baseUrl}/health/ready`);
    const text = await response.text();

    expect(response.status).toBe(503);
    expect(readinessResponseSchema.parse(JSON.parse(text))).toMatchObject({
      checks: { database: 'unavailable', queue: 'unavailable', worker: 'unavailable' },
      status: 'unavailable',
    });
    expect(text).not.toContain('synthetic connection details');
  });
});
