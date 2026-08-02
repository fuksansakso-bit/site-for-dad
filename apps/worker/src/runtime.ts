import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import type { DatabaseEnvironment, WorkerEnvironment } from '@project-name/config/server';
import {
  startFoundationJobRuntime,
  type FoundationQueueLogEvent,
  type FoundationTaskLifecycleEvent,
} from '@project-name/jobs';

import { createWorkerHealthServer } from './health-server.js';

export type WorkerShutdownReason = NodeJS.Signals | 'WORKER_RUNTIME_FAILURE';
export type WorkerEvent = Readonly<Record<string, unknown>> & {
  readonly event: string;
  readonly level: string;
  readonly service: 'worker';
};
export type WorkerEventSink = (event: WorkerEvent) => void;

export interface RunningWorkerProcess {
  readonly baseUrl: string;
  readonly completion: Promise<void>;
  shutdown(reason: WorkerShutdownReason): Promise<void>;
}

export function writeWorkerEvent(event: WorkerEvent): void {
  const stream = event.level === 'error' ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(event)}\n`);
}

export async function startWorkerProcess(
  databaseEnvironment: DatabaseEnvironment,
  workerEnvironment: WorkerEnvironment,
  eventSink: WorkerEventSink = writeWorkerEvent,
): Promise<RunningWorkerProcess> {
  let stopping = false;
  let stopped = false;
  let shutdownPromise: Promise<void> | undefined;
  let jobRuntime: Awaited<ReturnType<typeof startFoundationJobRuntime>> | undefined;

  const server = createWorkerHealthServer({
    async checkReadiness() {
      if (stopping || jobRuntime === undefined) {
        return { database: 'unavailable', queue: 'unavailable', worker: 'unavailable' };
      }
      const queue = await jobRuntime.checkReadiness();
      return { database: queue, queue, worker: queue };
    },
  });
  server.listen(workerEnvironment.WORKER_HEALTH_PORT, workerEnvironment.WORKER_HEALTH_HOST);
  await once(server, 'listening');

  const closeHealthServer = async (): Promise<void> => {
    if (!server.listening) return;
    server.close();
    await once(server, 'close');
  };

  const queueLog = (event: FoundationQueueLogEvent): void => {
    eventSink({ ...event, service: 'worker' });
  };
  const lifecycleLog = (event: FoundationTaskLifecycleEvent): void => {
    eventSink({ ...event, event: `worker.job.${event.event}`, level: 'info', service: 'worker' });
  };

  try {
    jobRuntime = await startFoundationJobRuntime(
      databaseEnvironment,
      workerEnvironment,
      lifecycleLog,
      queueLog,
    );
  } catch (error) {
    await closeHealthServer();
    throw error;
  }

  eventSink({ event: 'worker.started', level: 'info', service: 'worker' });
  const address = server.address() as AddressInfo;

  const runShutdown = async (reason: WorkerShutdownReason): Promise<void> => {
    if (stopped) return;
    stopping = true;
    eventSink({ event: 'worker.shutdown.started', level: 'info', reason, service: 'worker' });

    let timeout: NodeJS.Timeout | undefined;
    const outcome = await Promise.race([
      jobRuntime.stop().then(() => 'graceful' as const),
      new Promise<'timeout'>((resolve) => {
        timeout = setTimeout(
          () => resolve('timeout'),
          workerEnvironment.WORKER_SHUTDOWN_TIMEOUT_MS,
        );
        timeout.unref();
      }),
    ]);
    if (timeout !== undefined) clearTimeout(timeout);
    if (outcome === 'timeout') {
      eventSink({ event: 'worker.shutdown.timeout', level: 'error', service: 'worker' });
      await jobRuntime.forceStop();
      process.exitCode = 1;
    }
    await closeHealthServer();
    stopped = true;
    eventSink({ event: 'worker.shutdown.completed', level: 'info', service: 'worker' });
  };

  return {
    baseUrl: `http://${address.address === '::1' ? '[::1]' : address.address}:${address.port}`,
    completion: jobRuntime.promise,
    shutdown(reason) {
      shutdownPromise ??= runShutdown(reason);
      return shutdownPromise;
    },
  };
}
