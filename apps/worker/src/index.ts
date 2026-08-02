import { parseDatabaseEnvironment, parseWorkerEnvironment } from '@project-name/config/server';

import { startWorkerProcess, writeWorkerEvent } from './runtime.js';

const workerEnvironment = parseWorkerEnvironment(process.env);
const databaseEnvironment = parseDatabaseEnvironment(process.env);

let workerProcess: Awaited<ReturnType<typeof startWorkerProcess>> | undefined;
try {
  workerProcess = await startWorkerProcess(
    databaseEnvironment,
    workerEnvironment,
    writeWorkerEvent,
  );
} catch {
  writeWorkerEvent({
    errorCode: 'DEPENDENCY_UNAVAILABLE',
    event: 'worker.start.failed',
    level: 'error',
    service: 'worker',
  });
  process.exitCode = 1;
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void workerProcess?.shutdown(signal).catch(() => {
      process.exitCode = 1;
    });
  });
}

void workerProcess?.completion.catch(() => {
  writeWorkerEvent({
    errorCode: 'DEPENDENCY_UNAVAILABLE',
    event: 'worker.runtime.failed',
    level: 'error',
    service: 'worker',
  });
  process.exitCode = 1;
  return workerProcess?.shutdown('WORKER_RUNTIME_FAILURE');
});
