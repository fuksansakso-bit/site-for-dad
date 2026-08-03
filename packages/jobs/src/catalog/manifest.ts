import { hashCanonicalSource } from '@project-name/catalog';
import type { PoolClient } from 'pg';

import { CatalogPipelineError } from './errors.js';

interface ManifestPayloadReference {
  readonly catalogSourceId: string;
  readonly syncRunId: string;
}

interface ManifestRunRow {
  readonly cancelled_at: Date | string | null;
  readonly catalog_source_id: string;
  readonly completed_at: Date | string | null;
  readonly error_count: number;
  readonly mapping_version: string;
  readonly parser_version: string;
  readonly source_type: string;
  readonly source_version: string | null;
  readonly started_at: Date | string | null;
  readonly status: string;
  readonly trigger: string;
}

interface CheckpointRow {
  readonly checksum: string | null;
  readonly completed_at: Date | string | null;
  readonly error_count: number;
  readonly expected_count: number;
  readonly partition_key: string;
  readonly processed_count: number;
  readonly resume_count: number;
  readonly safe_cursor: unknown;
  readonly stage: string;
  readonly status: string;
}

interface SnapshotRow {
  readonly capture_key: string;
  readonly content_hash: string;
  readonly source_url: string;
}

interface SyncItemRow {
  readonly source_type: string;
  readonly status: string;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function diagnosticCounts(cursor: unknown): {
  readonly duplicates: number;
  readonly failures: number;
  readonly warnings: number;
} {
  const diagnostics = asRecord(cursor)?.['diagnostics'];
  if (!Array.isArray(diagnostics)) return { duplicates: 0, failures: 0, warnings: 0 };
  let duplicates = 0;
  let failures = 0;
  let warnings = 0;
  for (const candidate of diagnostics) {
    const diagnostic = asRecord(candidate);
    if (diagnostic?.['code'] === 'DUPLICATE_SOURCE_ID') duplicates += 1;
    if (diagnostic?.['severity'] === 'FAILURE') failures += 1;
    if (diagnostic?.['severity'] === 'WARNING') warnings += 1;
  }
  return { duplicates, failures, warnings };
}

function snapshotCount(rows: readonly SnapshotRow[], prefix: string): number {
  return rows.filter((row) => row.capture_key.startsWith(`${prefix}:`)).length;
}

export async function sealCatalogImportManifest(
  client: PoolClient,
  payload: ManifestPayloadReference,
  forcedStatus?: 'CANCELLED',
): Promise<{ readonly checksum: string; readonly complete: boolean; readonly status: string }> {
  const existing = await client.query<{
    complete: boolean;
    manifest_checksum: string;
    status: string;
  }>(
    `
      SELECT complete, manifest_checksum, status::text
      FROM catalog_import_manifest
      WHERE sync_run_id = $1::uuid
    `,
    [payload.syncRunId],
  );
  const previous = existing.rows[0];
  if (previous !== undefined) {
    return {
      checksum: previous.manifest_checksum,
      complete: previous.complete,
      status: previous.status,
    };
  }

  const runResult = await client.query<ManifestRunRow>(
    `
      SELECT run.catalog_source_id::text, run.trigger::text, run.status::text,
             run.started_at, run.completed_at, run.cancelled_at, run.error_count,
             run.parser_version, run.mapping_version, run.source_version,
             source.source_type::text
      FROM catalog_sync_run run
      JOIN catalog_source source ON source.id = run.catalog_source_id
      WHERE run.id = $1::uuid
      FOR UPDATE OF run
    `,
    [payload.syncRunId],
  );
  const run = runResult.rows[0];
  if (run === undefined || run.catalog_source_id !== payload.catalogSourceId) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
  }

  const checkpointResult = await client.query<CheckpointRow>(
    `
          SELECT stage, partition_key, status::text, expected_count, processed_count,
                 error_count, resume_count, safe_cursor, checksum, completed_at
          FROM catalog_sync_checkpoint
          WHERE sync_run_id = $1::uuid
          ORDER BY stage, partition_key
        `,
    [payload.syncRunId],
  );
  const snapshotResult = await client.query<SnapshotRow>(
    `
          SELECT capture_key, content_hash, source_url
          FROM source_snapshot
          WHERE sync_run_id = $1::uuid
          ORDER BY capture_key
        `,
    [payload.syncRunId],
  );
  const itemResult = await client.query<SyncItemRow>(
    `
          SELECT source_type::text, status::text
          FROM catalog_sync_item
          WHERE sync_run_id = $1::uuid
        `,
    [payload.syncRunId],
  );
  const attachmentResult = await client.query<{
    media_imported_count: string;
    media_reference_count: string;
    price_record_count: string;
  }>(
    `
          SELECT
            (
              SELECT count(*)::text
              FROM source_media_asset media
              JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
              WHERE item.sync_run_id = $1::uuid
            ) AS media_reference_count,
            (
              SELECT count(*)::text
              FROM source_media_asset media
              JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
              WHERE item.sync_run_id = $1::uuid AND media.media_asset_id IS NOT NULL
            ) AS media_imported_count,
            (
              SELECT count(*)::text
              FROM source_price_record price
              JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
              JOIN catalog_sync_run price_run ON price_run.id = item.sync_run_id
                                              AND price_run.source_version = price.source_version
              WHERE item.sync_run_id = $1::uuid
            ) AS price_record_count
        `,
    [payload.syncRunId],
  );
  const artifactResult = await client.query<{
    catalog_version_count: string;
    difference_count: string;
    price_version_count: string;
  }>(
    `
          SELECT
            (SELECT count(*)::text FROM catalog_sync_difference
             WHERE sync_run_id = $1::uuid) AS difference_count,
            (SELECT count(*)::text FROM catalog_version
             WHERE sync_run_id = $1::uuid) AS catalog_version_count,
            (SELECT count(*)::text FROM price_version
             WHERE sync_run_id = $1::uuid) AS price_version_count
        `,
    [payload.syncRunId],
  );
  const timeResult = await client.query<{ sealed_at: Date }>(
    'SELECT clock_timestamp() AS sealed_at',
  );

  const checkpoints = checkpointResult.rows;
  const snapshots = snapshotResult.rows;
  const items = itemResult.rows;
  const discoveryCheckpoint = checkpoints.find((checkpoint) => checkpoint.stage === 'discovery');
  const discoveryCursor = asRecord(discoveryCheckpoint?.safe_cursor);
  const discoveryComplete = discoveryCursor?.['complete'] === true;
  const diagnostics = diagnosticCounts(discoveryCheckpoint?.safe_cursor);
  const failedItems = items.filter((item) =>
    ['FAILED', 'MEDIA_ERROR', 'PARSE_ERROR'].includes(item.status),
  ).length;
  const sourceRemoved = items.filter((item) => item.status === 'SOURCE_REMOVED').length;
  const expectedStages = new Set([
    'capture-categories',
    'capture-materials',
    'capture-media-manifests',
    'capture-models',
    'capture-pages',
    'capture-prices',
    'capture-systems',
    'discovery',
  ]);
  const completedStages = new Set(
    checkpoints
      .filter((checkpoint) => checkpoint.status === 'COMPLETED')
      .map((checkpoint) => checkpoint.stage),
  );
  const stagesComplete = [...expectedStages].every((stage) => completedStages.has(stage));
  const failureCount = Math.max(run.error_count, diagnostics.failures + failedItems);
  const complete =
    forcedStatus !== 'CANCELLED' && discoveryComplete && stagesComplete && failureCount === 0;
  const status = forcedStatus ?? (complete ? 'COMPLETE' : 'PARTIAL_FAILED');
  const sealedAt = timeResult.rows[0]?.sealed_at;
  if (sealedAt === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  const attachments = attachmentResult.rows[0];
  const artifacts = artifactResult.rows[0];
  const manifest = {
    schemaVersion: 1,
    syncRunId: payload.syncRunId,
    catalogSourceId: payload.catalogSourceId,
    complete,
    status,
    trigger: run.trigger,
    timing: {
      startedAt: iso(run.started_at),
      completedAt: sealedAt.toISOString(),
      cancelledAt: iso(run.cancelled_at),
    },
    source: {
      type: run.source_type,
      version: run.source_version,
      parserVersion: run.parser_version,
      mappingVersion: run.mapping_version,
    },
    discovery: discoveryCursor ?? {},
    counts: {
      pages: snapshotCount(snapshots, 'page'),
      categories: snapshotCount(snapshots, 'category'),
      systems: snapshotCount(snapshots, 'system'),
      models: snapshotCount(snapshots, 'model'),
      materialVariants: snapshotCount(snapshots, 'material'),
      mediaManifests: snapshotCount(snapshots, 'media-manifest'),
      priceSnapshots: snapshotCount(snapshots, 'price'),
      snapshots: snapshots.length,
      normalizedItems: items.length,
      mediaReferences: Number(attachments?.media_reference_count ?? '0'),
      mediaImported: Number(attachments?.media_imported_count ?? '0'),
      priceRecords: Number(attachments?.price_record_count ?? '0'),
      warnings: diagnostics.warnings,
      failures: failureCount,
      skips: 0,
      duplicates: diagnostics.duplicates,
      sourceRemoved,
      differences: Number(artifacts?.difference_count ?? '0'),
      catalogVersions: Number(artifacts?.catalog_version_count ?? '0'),
      priceVersions: Number(artifacts?.price_version_count ?? '0'),
      resumedSnapshots: checkpoints.reduce(
        (total, checkpoint) => total + checkpoint.resume_count,
        0,
      ),
    },
    checkpoints: checkpoints.map((checkpoint) => ({
      stage: checkpoint.stage,
      partitionKey: checkpoint.partition_key,
      status: checkpoint.status,
      expectedCount: checkpoint.expected_count,
      processedCount: checkpoint.processed_count,
      errorCount: checkpoint.error_count,
      resumeCount: checkpoint.resume_count,
      checksum: checkpoint.checksum,
      completedAt: iso(checkpoint.completed_at),
    })),
    checksumSummary: {
      sourceVersion: run.source_version,
      snapshotChecksum: hashCanonicalSource(
        snapshots.map((snapshot) => ({
          captureKey: snapshot.capture_key,
          contentHash: snapshot.content_hash,
          sourceUrl: snapshot.source_url,
        })),
      ),
      checkpointChecksum: hashCanonicalSource(
        checkpoints.map((checkpoint) => ({
          checksum: checkpoint.checksum,
          partitionKey: checkpoint.partition_key,
          stage: checkpoint.stage,
          status: checkpoint.status,
        })),
      ),
    },
  } as const;
  const checksum = hashCanonicalSource(manifest);
  await client.query(
    `
      INSERT INTO catalog_import_manifest (
        sync_run_id, status, complete, safe_manifest, manifest_checksum, sealed_at
      ) VALUES (
        $1::uuid, $2::catalog_import_manifest_status, $3, $4::jsonb, $5,
        $6::timestamptz
      )
    `,
    [payload.syncRunId, status, complete, JSON.stringify(manifest), checksum, sealedAt],
  );
  return { checksum, complete, status };
}
