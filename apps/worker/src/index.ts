import { once } from 'node:events';

import { parseWorkerEnvironment } from '@project-name/config/server';

import { createWorkerHealthServer } from './health-server.js';

const environment = parseWorkerEnvironment(process.env);

let acceptingWork = true;
let stopping = false;
const server = createWorkerHealthServer({ isReady: () => acceptingWork });
server.listen(environment.WORKER_HEALTH_PORT, environment.WORKER_HEALTH_HOST);
await once(server, 'listening');

process.stdout.write(
  `${JSON.stringify({ event: 'worker.started', level: 'info', service: 'worker' })}\n`,
);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  acceptingWork = false;
  process.stdout.write(
    `${JSON.stringify({ event: 'worker.shutdown.started', level: 'info', service: 'worker', signal })}\n`,
  );

  const forceTimer = setTimeout(() => {
    process.stderr.write(
      `${JSON.stringify({ event: 'worker.shutdown.timeout', level: 'error', service: 'worker' })}\n`,
    );
    process.exitCode = 1;
  }, environment.WORKER_SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  server.close();
  await once(server, 'close');
  clearTimeout(forceTimer);
  process.stdout.write(
    `${JSON.stringify({ event: 'worker.shutdown.completed', level: 'info', service: 'worker' })}\n`,
  );
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void shutdown(signal).catch(() => {
      process.exitCode = 1;
    });
  });
}
