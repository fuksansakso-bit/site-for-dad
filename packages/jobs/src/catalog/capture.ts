import { hashCanonicalSource, type SourceCaptureMetadata } from '@project-name/catalog';
import type { JobHelpers } from 'graphile-worker';

import { type CatalogSyncRunPayload } from './contracts.js';
import { CatalogPipelineError } from './errors.js';
import { type CatalogSafeSnapshotPayload } from './snapshot.js';

export type CatalogCaptureStage =
  | 'capture-categories'
  | 'capture-materials'
  | 'capture-media-manifests'
  | 'capture-models'
  | 'capture-pages'
  | 'capture-prices'
  | 'capture-systems'
  | 'discovery';

export interface CatalogCheckpointProgress {
  readonly checksum?: string;
  readonly errorCount: number;
  readonly expectedCount: number;
  readonly partitionKey?: string;
  readonly processedCount: number;
  readonly resumeCount: number;
  readonly safeCursor: Readonly<Record<string, unknown>>;
  readonly stage: CatalogCaptureStage;
  readonly status: 'CANCELLED' | 'COMPLETED' | 'FAILED' | 'IN_PROGRESS';
}

export interface CatalogSnapshotWrite {
  readonly capture: SourceCaptureMetadata;
  readonly captureKey: string;
  readonly payload: CatalogSafeSnapshotPayload;
  readonly semanticSourceVersion: string;
}

interface ExistingSnapshotRow {
  readonly content_hash: string;
  readonly mapping_version: string;
  readonly parser_version: string;
  readonly source_url: string;
  readonly source_version: string | null;
}

interface ReusableSnapshotRow extends ExistingSnapshotRow {
  readonly capture_key: string;
  readonly status: string;
}

export function catalogCaptureKey(kind: string, sourceId: string): string {
  const normalizedKind = kind
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-');
  if (normalizedKind.length === 0 || sourceId.length === 0 || sourceId.length > 400) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
  }
  return `${normalizedKind}:${sourceId}`;
}

export async function persistCatalogSnapshot(
  helpers: JobHelpers,
  payload: CatalogSyncRunPayload,
  snapshot: CatalogSnapshotWrite,
): Promise<'CREATED' | 'RESUMED'> {
  const inserted = await helpers.query<{ id: string }>(
    `
      INSERT INTO source_snapshot (
        catalog_source_id, sync_run_id, capture_key, source_url, captured_at,
        status, http_status, content_hash, safe_payload, parser_version,
        mapping_version, source_version
      ) VALUES (
        $1::uuid, $2::uuid, $3, $4, $5::timestamptz,
        'CAPTURED', $6, $7, $8::jsonb, $9,
        $10, $11
      )
      ON CONFLICT (sync_run_id, capture_key) DO NOTHING
      RETURNING id::text
    `,
    [
      payload.catalogSourceId,
      payload.syncRunId,
      snapshot.captureKey,
      snapshot.capture.sourceUrl,
      snapshot.capture.capturedAt,
      snapshot.capture.httpStatus,
      snapshot.capture.contentHash,
      JSON.stringify(snapshot.payload),
      snapshot.capture.parserVersion,
      snapshot.capture.mappingVersion,
      snapshot.semanticSourceVersion,
    ],
  );
  if (inserted.rows[0] !== undefined) return 'CREATED';

  const existing = await helpers.query<ExistingSnapshotRow>(
    `
      SELECT source_url, content_hash, parser_version, mapping_version, source_version
      FROM source_snapshot
      WHERE sync_run_id = $1::uuid AND capture_key = $2
    `,
    [payload.syncRunId, snapshot.captureKey],
  );
  const row = existing.rows[0];
  if (
    row === undefined ||
    row.source_url !== snapshot.capture.sourceUrl ||
    row.content_hash !== snapshot.capture.contentHash ||
    row.parser_version !== snapshot.capture.parserVersion ||
    row.mapping_version !== snapshot.capture.mappingVersion ||
    row.source_version !== snapshot.semanticSourceVersion
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
  }
  return 'RESUMED';
}

export async function loadReusableCatalogCaptureKeys(
  helpers: JobHelpers,
  syncRunId: string,
  captureKeys: readonly string[],
  semanticSourceVersion: string,
): Promise<ReadonlySet<string>> {
  if (captureKeys.length === 0) return new Set();
  if (new Set(captureKeys).size !== captureKeys.length) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
  }
  const existing = await helpers.query<ReusableSnapshotRow>(
    `
      SELECT capture_key, source_url, content_hash, parser_version,
             mapping_version, source_version, status::text
      FROM source_snapshot
      WHERE sync_run_id = $1::uuid AND capture_key = ANY($2::text[])
      ORDER BY capture_key
    `,
    [syncRunId, captureKeys],
  );
  const reusable = new Set<string>();
  for (const row of existing.rows) {
    if (
      row.status !== 'CAPTURED' ||
      row.source_version !== semanticSourceVersion ||
      row.source_url.length === 0 ||
      !/^[0-9a-f]{64}$/.test(row.content_hash) ||
      row.parser_version.length === 0 ||
      row.mapping_version.length === 0 ||
      reusable.has(row.capture_key)
    ) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
    }
    reusable.add(row.capture_key);
  }
  return reusable;
}

export async function writeCatalogCheckpoint(
  helpers: JobHelpers,
  syncRunId: string,
  progress: CatalogCheckpointProgress,
): Promise<void> {
  const checksum = progress.checksum ?? hashCanonicalSource(progress.safeCursor);
  await helpers.query(
    `
      INSERT INTO catalog_sync_checkpoint (
        sync_run_id, stage, partition_key, status, expected_count,
        processed_count, error_count, resume_count, safe_cursor, checksum,
        completed_at, updated_at
      ) VALUES (
        $1::uuid, $2, $3, $4::catalog_sync_checkpoint_status, $5,
        $6, $7, $8, $9::jsonb, $10,
        CASE WHEN $4 = 'IN_PROGRESS' THEN NULL ELSE NOW() END, NOW()
      )
      ON CONFLICT (sync_run_id, stage, partition_key) DO UPDATE
      SET status = EXCLUDED.status,
          expected_count = EXCLUDED.expected_count,
          processed_count = EXCLUDED.processed_count,
          error_count = EXCLUDED.error_count,
          resume_count = EXCLUDED.resume_count,
          safe_cursor = EXCLUDED.safe_cursor,
          checksum = EXCLUDED.checksum,
          completed_at = EXCLUDED.completed_at,
          updated_at = NOW()
    `,
    [
      syncRunId,
      progress.stage,
      progress.partitionKey ?? 'all',
      progress.status,
      progress.expectedCount,
      progress.processedCount,
      progress.errorCount,
      progress.resumeCount,
      JSON.stringify(progress.safeCursor),
      checksum,
    ],
  );
  await helpers.query(
    `
      UPDATE catalog_sync_run
      SET last_heartbeat_at = NOW(), updated_at = NOW()
      WHERE id = $1::uuid
    `,
    [syncRunId],
  );
}

export async function catalogCancellationRequested(
  helpers: JobHelpers,
  syncRunId: string,
): Promise<boolean> {
  const result = await helpers.query<{ requested: boolean }>(
    `
      SELECT cancel_requested_at IS NOT NULL AS requested
      FROM catalog_sync_run
      WHERE id = $1::uuid
    `,
    [syncRunId],
  );
  const row = result.rows[0];
  if (row === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  return row.requested;
}

export async function markCatalogRunCancelled(
  payload: CatalogSyncRunPayload,
  helpers: JobHelpers,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      await client.query(
        `
          UPDATE catalog_sync_checkpoint
          SET status = 'CANCELLED', completed_at = NOW(), updated_at = NOW()
          WHERE sync_run_id = $1::uuid AND status = 'IN_PROGRESS'
        `,
        [payload.syncRunId],
      );
      const result = await client.query<{ id: string }>(
        `
          UPDATE catalog_sync_run
          SET status = 'CANCELLED', cancelled_at = NOW(), completed_at = NOW(),
              last_heartbeat_at = NOW(), updated_at = NOW()
          WHERE id = $1::uuid AND cancel_requested_at IS NOT NULL
            AND status NOT IN ('CANCELLED', 'COMPLETED', 'FAILED')
          RETURNING id::text
        `,
        [payload.syncRunId],
      );
      if (result.rows[0] !== undefined) {
        await client.query(
          `
            INSERT INTO audit_event (
              actor_type, action, outcome, correlation_id, target_type,
              target_id, reason_code
            ) VALUES (
              'SYSTEM_WORKER', 'CATALOG_SYNC_CANCELLED', 'SUCCEEDED', $1,
              'CATALOG_SYNC_RUN', $2, 'OPERATOR_REQUEST'
            )
          `,
          [payload.correlationId, payload.syncRunId],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function recordCatalogCaptureFailure(
  helpers: JobHelpers,
  payload: CatalogSyncRunPayload,
  input: {
    readonly errorCode: string;
    readonly sourceId: string;
    readonly sourceType: 'CATEGORY' | 'MATERIAL_VARIANT' | 'MEDIA' | 'MODEL' | 'PRICE' | 'SYSTEM';
    readonly stage: CatalogCaptureStage;
  },
): Promise<void> {
  await helpers.query(
    `
      INSERT INTO catalog_sync_item (
        sync_run_id, source_type, source_id, status, stage, progress,
        error_code, safe_metadata, updated_at
      ) VALUES (
        $1::uuid, $2::source_entity_type, $3, 'PARSE_ERROR', $4, 100,
        $5, $6::jsonb, NOW()
      )
      ON CONFLICT (sync_run_id, source_type, source_id) DO UPDATE
      SET status = 'PARSE_ERROR', stage = EXCLUDED.stage, progress = 100,
          error_code = EXCLUDED.error_code, safe_metadata = EXCLUDED.safe_metadata,
          updated_at = NOW()
    `,
    [
      payload.syncRunId,
      input.sourceType,
      input.sourceId,
      input.stage,
      input.errorCode,
      JSON.stringify({ isolated: true, retryable: false }),
    ],
  );
}
