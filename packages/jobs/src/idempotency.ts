import type { JobHelpers } from 'graphile-worker';
import { createHash } from 'node:crypto';

import type { FoundationProbePayload } from './contracts.js';
import { FoundationJobError, type FoundationJobErrorCode } from './errors.js';

const idempotencyScope = 'foundation_probe_v1';

function payloadDigest(payload: FoundationProbePayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function prepareIdempotentExecution(
  payload: FoundationProbePayload,
  helpers: JobHelpers,
  timeoutMilliseconds: number,
): Promise<'already-completed' | 'execute'> {
  const digest = payloadDigest(payload);
  await helpers.query(
    `
      INSERT INTO idempotency_record (
        scope, key, payload_digest, status, locked_until, updated_at
      ) VALUES (
        $1, $2, $3, 'IN_PROGRESS', NOW() + ($4::integer * INTERVAL '1 millisecond'), NOW()
      )
      ON CONFLICT (scope, key) DO NOTHING
    `,
    [idempotencyScope, payload.idempotencyKey, digest, timeoutMilliseconds],
  );
  const result = await helpers.query<{
    payload_digest: string;
    status: 'FAILED' | 'IN_PROGRESS' | 'SUCCEEDED';
  }>(`SELECT payload_digest, status FROM idempotency_record WHERE scope = $1 AND key = $2`, [
    idempotencyScope,
    payload.idempotencyKey,
  ]);
  const record = result.rows[0];
  if (record === undefined) {
    throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
  }
  if (record.payload_digest !== digest) {
    throw new FoundationJobError('FOUNDATION_JOB_IDEMPOTENCY_CONFLICT');
  }
  if (record.status === 'FAILED') {
    throw new FoundationJobError('FOUNDATION_JOB_IDEMPOTENCY_FAILED');
  }
  if (record.status === 'SUCCEEDED') {
    return 'already-completed';
  }
  await helpers.query(
    `
      UPDATE idempotency_record
      SET locked_until = NOW() + ($3::integer * INTERVAL '1 millisecond'), updated_at = NOW()
      WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS'
    `,
    [idempotencyScope, payload.idempotencyKey, timeoutMilliseconds],
  );
  return 'execute';
}

export async function completeIdempotentExecution(
  payload: FoundationProbePayload,
  helpers: JobHelpers,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const result = await client.query<{ status: 'FAILED' | 'IN_PROGRESS' | 'SUCCEEDED' }>(
        `SELECT status FROM idempotency_record WHERE scope = $1 AND key = $2 FOR UPDATE`,
        [idempotencyScope, payload.idempotencyKey],
      );
      const record = result.rows[0];
      if (record === undefined) {
        throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
      }
      if (record.status === 'SUCCEEDED') {
        await client.query('COMMIT');
        return;
      }
      if (record.status === 'FAILED') {
        throw new FoundationJobError('FOUNDATION_JOB_IDEMPOTENCY_FAILED');
      }
      const resultDigest = createHash('sha256')
        .update(`completed:${payload.idempotencyKey}`)
        .digest('hex');
      await client.query(
        `
          UPDATE idempotency_record
          SET status = 'SUCCEEDED', result_digest = $3, locked_until = NULL,
              completed_at = NOW(), updated_at = NOW()
          WHERE scope = $1 AND key = $2
        `,
        [idempotencyScope, payload.idempotencyKey, resultDigest],
      );
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, action, outcome, correlation_id, target_type, target_id
          ) VALUES (
            'SYSTEM_WORKER', 'FOUNDATION_TEST_JOB_COMPLETED', 'SUCCEEDED', $1,
            'FOUNDATION_PROBE', $2
          )
        `,
        [payload.correlationId, payload.idempotencyKey],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function failIdempotentExecution(
  payload: FoundationProbePayload,
  helpers: JobHelpers,
  reasonCode: FoundationJobErrorCode,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const updated = await client.query(
        `
          UPDATE idempotency_record
          SET status = 'FAILED', locked_until = NULL, completed_at = NOW(), updated_at = NOW()
          WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS'
          RETURNING id
        `,
        [idempotencyScope, payload.idempotencyKey],
      );
      if (updated.rowCount === 1) {
        await client.query(
          `
            INSERT INTO audit_event (
              actor_type, action, outcome, correlation_id, target_type, target_id, reason_code
            ) VALUES (
              'SYSTEM_WORKER', 'FOUNDATION_TEST_JOB_PERMANENT_FAILURE', 'FAILED', $1,
              'FOUNDATION_PROBE', $2, $3
            )
          `,
          [payload.correlationId, payload.idempotencyKey, reasonCode],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}
