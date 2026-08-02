import { parseDatabaseEnvironment, parseWorkerEnvironment } from '@project-name/config/server';
import { readinessResponseSchema } from '@project-name/contracts/health';
import { createFoundationJobPool, enqueueFoundationProbe } from '@project-name/jobs';
import { afterAll, describe, expect, it } from 'vitest';

import { startWorkerProcess, type WorkerEvent } from '../../src/runtime.js';

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const workerEnvironment = parseWorkerEnvironment(process.env);
const pool = createFoundationJobPool(databaseEnvironment, 2);

afterAll(() => pool.end());

describe('worker process integration', () => {
  it('serves readiness, executes a probe, and follows the graceful signal path', async () => {
    const events: WorkerEvent[] = [];
    const worker = await startWorkerProcess(databaseEnvironment, workerEnvironment, (event) => {
      events.push(event);
    });
    const readiness = await fetch(`${worker.baseUrl}/health/ready`);
    expect(readiness.status).toBe(200);
    expect(readinessResponseSchema.parse(await readiness.json())).toMatchObject({
      checks: { database: 'ok', queue: 'ok', worker: 'ok' },
      status: 'ok',
    });

    const idempotencyKey = 'foundation-probe:worker-process-001';
    await enqueueFoundationProbe(
      pool,
      {
        correlationId: 'correlation-worker-process-001',
        delayMilliseconds: 100,
        idempotencyKey,
        mode: 'SUCCEED',
        schemaVersion: 1,
      },
      workerEnvironment.WORKER_MAX_ATTEMPTS,
    );
    const deadline = Date.now() + 5_000;
    let status: string | undefined;
    while (Date.now() < deadline) {
      const result = await pool.query<{ status: string }>(
        `SELECT status FROM idempotency_record WHERE scope = 'foundation_probe_v1' AND key = $1`,
        [idempotencyKey],
      );
      status = result.rows[0]?.status;
      if (status === 'SUCCEEDED') break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    if (status !== 'SUCCEEDED') {
      const queueState = await pool.query<{
        attempts: number;
        last_error: string | null;
        locked: boolean;
        runnable: boolean;
        task_identifier: string;
      }>(
        `
          SELECT task_identifier, attempts, locked_at IS NOT NULL AS locked,
                 run_at <= NOW() AS runnable, last_error
          FROM graphile_worker.jobs
          WHERE task_identifier = 'foundation_probe_v1'
          ORDER BY id DESC
          LIMIT 1
        `,
      );
      throw new Error(
        JSON.stringify({
          events: events.map((event) => ({ event: event.event, level: event.level })),
          queueState: queueState.rows[0],
          status,
        }),
      );
    }

    await worker.shutdown('SIGTERM');
    await worker.completion;
    expect(events.map((event) => event.event)).toEqual(
      expect.arrayContaining([
        'worker.started',
        'worker.job.started',
        'worker.job.succeeded',
        'worker.shutdown.started',
        'worker.shutdown.completed',
      ]),
    );
    await expect(fetch(`${worker.baseUrl}/health/live`)).rejects.toThrow();
  });
});
