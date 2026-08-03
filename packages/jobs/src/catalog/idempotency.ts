import { createHash } from 'node:crypto';
import type { JobHelpers } from 'graphile-worker';

import { type CatalogJobIdentifier } from './contracts.js';
import { CatalogPipelineError, type CatalogPipelineErrorCode } from './errors.js';

interface CatalogIdempotentPayload {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly schemaVersion: 1;
  readonly syncRunId?: string;
}

function payloadDigest(payload: CatalogIdempotentPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

export async function prepareCatalogExecution(
  identifier: CatalogJobIdentifier,
  payload: CatalogIdempotentPayload,
  helpers: JobHelpers,
  timeoutMilliseconds: number,
): Promise<'already-completed' | 'execute'> {
  const digest = payloadDigest(payload);
  await helpers.query(
    `
      INSERT INTO idempotency_record (
        scope, key, payload_digest, status, locked_until, updated_at
      ) VALUES (
        $1, $2, $3, 'IN_PROGRESS',
        NOW() + ($4::integer * INTERVAL '1 millisecond'), NOW()
      )
      ON CONFLICT (scope, key) DO NOTHING
    `,
    [identifier, payload.idempotencyKey, digest, timeoutMilliseconds],
  );
  const result = await helpers.query<{
    payload_digest: string;
    status: 'FAILED' | 'IN_PROGRESS' | 'SUCCEEDED';
  }>('SELECT payload_digest, status FROM idempotency_record WHERE scope = $1 AND key = $2', [
    identifier,
    payload.idempotencyKey,
  ]);
  const record = result.rows[0];
  if (record === undefined) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE', { retryable: true });
  }
  if (record.payload_digest !== digest || record.status === 'FAILED') {
    throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
  }
  if (record.status === 'SUCCEEDED') {
    return 'already-completed';
  }
  await helpers.query(
    `
      UPDATE idempotency_record
      SET locked_until = NOW() + ($3::integer * INTERVAL '1 millisecond'),
          updated_at = NOW()
      WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS'
    `,
    [identifier, payload.idempotencyKey, timeoutMilliseconds],
  );
  return 'execute';
}

export async function completeCatalogExecution(
  identifier: CatalogJobIdentifier,
  payload: CatalogIdempotentPayload,
  helpers: JobHelpers,
): Promise<void> {
  const resultDigest = createHash('sha256')
    .update(`completed:${identifier}:${payload.idempotencyKey}`)
    .digest('hex');
  await helpers.query(
    `
      UPDATE idempotency_record
      SET status = 'SUCCEEDED', result_digest = $3, locked_until = NULL,
          completed_at = NOW(), updated_at = NOW()
      WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS'
    `,
    [identifier, payload.idempotencyKey, resultDigest],
  );
}

export async function failCatalogExecution(
  identifier: CatalogJobIdentifier,
  payload: CatalogIdempotentPayload,
  helpers: JobHelpers,
  code: CatalogPipelineErrorCode,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(
        `
          UPDATE idempotency_record
          SET status = 'FAILED', locked_until = NULL, completed_at = NOW(), updated_at = NOW()
          WHERE scope = $1 AND key = $2 AND status = 'IN_PROGRESS'
        `,
        [identifier, payload.idempotencyKey],
      );
      if (
        payload.syncRunId !== undefined &&
        !['catalog-activate-version', 'catalog-approve-version'].includes(identifier)
      ) {
        await client.query(
          `
            UPDATE catalog_sync_run
            SET status = 'FAILED', error_count = error_count + 1,
                error_code = $2, completed_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [payload.syncRunId, code],
        );
      } else if (identifier === 'catalog-source-discovery') {
        await client.query(
          `
            UPDATE catalog_sync_run
            SET status = 'FAILED', error_count = error_count + 1,
                error_code = $2, completed_at = NOW(), updated_at = NOW()
            WHERE idempotency_key = $1
          `,
          [payload.idempotencyKey, code],
        );
      }
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, action, outcome, correlation_id, target_type,
            target_id, reason_code
          ) VALUES (
            'SYSTEM_WORKER', 'CATALOG_JOB_PERMANENT_FAILURE', 'FAILED', $1,
            'CATALOG_SYNC_RUN', $2, $3
          )
        `,
        [payload.correlationId, payload.syncRunId ?? payload.idempotencyKey, code],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}
