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

async function startServer(isReady: () => boolean): Promise<string> {
  const server = createWorkerHealthServer({ isReady });
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
    const baseUrl = await startServer(() => false);
    const liveResponse = await fetch(`${baseUrl}/health/live`);
    const readyResponse = await fetch(`${baseUrl}/health/ready`);

    expect(liveResponse.status).toBe(200);
    expect(livenessResponseSchema.parse(await liveResponse.json()).status).toBe('ok');
    expect(readyResponse.status).toBe(503);
    expect(readinessResponseSchema.parse(await readyResponse.json())).toMatchObject({
      checks: { worker: 'unavailable' },
      status: 'unavailable',
    });
  });

  it('returns a safe not-found error without internal details', async () => {
    const baseUrl = await startServer(() => true);
    const response = await fetch(`${baseUrl}/internal-path`);
    const text = await response.text();

    expect(response.status).toBe(404);
    expect(text).not.toMatch(/stack|C:\\|connection|password/i);
  });
});
