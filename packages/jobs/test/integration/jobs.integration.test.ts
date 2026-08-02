import {
  parseDatabaseEnvironment,
  parseWorkerEnvironment,
  type WorkerEnvironment,
} from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createFoundationJobPool,
  enqueueFoundationProbe,
  listPermanentFoundationFailures,
  runFoundationJobsOnce,
  startFoundationJobRuntime,
  verifyFoundationQueueSchema,
} from '../../src/adapter.js';
import type { FoundationProbePayload } from '../../src/contracts.js';

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const workerEnvironment = parseWorkerEnvironment(process.env);
const pool = createFoundationJobPool(databaseEnvironment, 4);

function payload(
  suffix: string,
  mode: FoundationProbePayload['mode'],
  delayMilliseconds = 0,
): FoundationProbePayload {
  return {
    correlationId: `correlation-${suffix}`,
    delayMilliseconds,
    idempotencyKey: `foundation-probe:${suffix}`,
    mode,
    schemaVersion: 1,
  };
}

async function idempotencyStatus(idempotencyKey: string): Promise<string | undefined> {
  const result = await pool.query<{ status: string }>(
    `SELECT status FROM idempotency_record WHERE scope = 'foundation_probe_v1' AND key = $1`,
    [idempotencyKey],
  );
  return result.rows[0]?.status;
}

async function auditCount(idempotencyKey: string, action: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM audit_event WHERE target_id = $1 AND action = $2`,
    [idempotencyKey, action],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function waitUntilRunnable(jobId: string): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ runnable: boolean }>(
      `SELECT run_at <= NOW() AS runnable FROM graphile_worker.jobs WHERE id = $1::bigint`,
      [jobId],
    );
    if (result.rows[0]?.runnable === true) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Retry did not become runnable within the integration deadline.');
}

beforeAll(() => verifyFoundationQueueSchema(pool));
afterAll(() => pool.end());

describe.sequential('Graphile Worker foundation', () => {
  it('executes once and suppresses a replay through durable idempotency', async () => {
    const probe = payload('success-001', 'SUCCEED');
    await enqueueFoundationProbe(pool, probe, workerEnvironment.WORKER_MAX_ATTEMPTS);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('SUCCEEDED');
    expect(await auditCount(probe.idempotencyKey, 'FOUNDATION_TEST_JOB_COMPLETED')).toBe(1);

    await enqueueFoundationProbe(pool, probe, workerEnvironment.WORKER_MAX_ATTEMPTS);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await auditCount(probe.idempotencyKey, 'FOUNDATION_TEST_JOB_COMPLETED')).toBe(1);
  });

  it('retries a transient failure and completes on the second attempt', async () => {
    const probe = payload('retry-001', 'FAIL_ONCE');
    const job = await enqueueFoundationProbe(pool, probe, 3);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('IN_PROGRESS');

    await waitUntilRunnable(job.id);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('SUCCEEDED');
    expect(await auditCount(probe.idempotencyKey, 'FOUNDATION_TEST_JOB_COMPLETED')).toBe(1);
  });

  it('times out cancellable work, retries it, and records one effect', async () => {
    const probe = payload('timeout-001', 'TIMEOUT_ONCE');
    const job = await enqueueFoundationProbe(pool, probe, 3);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('IN_PROGRESS');

    await waitUntilRunnable(job.id);
    await runFoundationJobsOnce(pool, workerEnvironment);
    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('SUCCEEDED');
    expect(await auditCount(probe.idempotencyKey, 'FOUNDATION_TEST_JOB_COMPLETED')).toBe(1);
  });

  it('retains permanent failure state without exposing a raw payload', async () => {
    const probe = payload('permanent-001', 'ALWAYS_FAIL');
    const job = await enqueueFoundationProbe(pool, probe, 1);
    await runFoundationJobsOnce(pool, workerEnvironment);

    expect(await idempotencyStatus(probe.idempotencyKey)).toBe('FAILED');
    expect(
      (await listPermanentFoundationFailures(pool)).find((failure) => failure.id === job.id),
    ).toMatchObject({
      attempts: 1,
      failureCode: 'FOUNDATION_JOB_FORCED_FAILURE',
      maxAttempts: 1,
      taskIdentifier: 'foundation_probe_v1',
    });
    expect(await auditCount(probe.idempotencyKey, 'FOUNDATION_TEST_JOB_PERMANENT_FAILURE')).toBe(1);
  });

  it('waits for an in-flight task during graceful shutdown', async () => {
    const gracefulEnvironment: WorkerEnvironment = {
      ...workerEnvironment,
      WORKER_JOB_TIMEOUT_MS: Math.min(2_000, workerEnvironment.WORKER_JOB_TIMEOUT_MS),
    };
    const runtime = await startFoundationJobRuntime(databaseEnvironment, gracefulEnvironment);
    const probe = payload('graceful-001', 'SUCCEED', 500);
    const enqueued = await enqueueFoundationProbe(runtime.pool, probe, 2);

    const deadline = Date.now() + 5_000;
    while (
      (await idempotencyStatus(probe.idempotencyKey)) !== 'IN_PROGRESS' &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await runtime.stop();

    const verificationPool = createFoundationJobPool(databaseEnvironment, 1);
    try {
      const result = await verificationPool.query<{ status: string }>(
        `SELECT status FROM idempotency_record WHERE scope = 'foundation_probe_v1' AND key = $1`,
        [probe.idempotencyKey],
      );
      expect(result.rows[0]?.status).toBe('SUCCEEDED');
      const residualJob = await verificationPool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM graphile_worker.jobs WHERE id = $1::bigint`,
        [enqueued.id],
      );
      expect(Number(residualJob.rows[0]?.count ?? 0)).toBe(0);
    } finally {
      await verificationPool.end();
    }
  });
});
