import {
  AmigoCatalogSourceAdapter,
  type CapturedSource,
  type CatalogSourceAdapter,
  type CatalogSourceType,
  type SourceCategory,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourcePrice,
  type SourceSystem,
} from '@project-name/catalog';
import type { JobHelpers } from 'graphile-worker';

import { FoundationJobError } from '../errors.js';
import {
  type CatalogActivateVersionPayload,
  type CatalogApproveVersionPayload,
  type CatalogBuildDiffPayload,
  type CatalogMediaImportPayload,
  type CatalogNormalizePayload,
  type CatalogRollbackVersionPayload,
  type CatalogSourceDiscoveryPayload,
  type CatalogSyncRunPayload,
} from './contracts.js';
import { CatalogPipelineError, toCatalogPipelineError } from './errors.js';
import { normalizeCatalogSnapshots } from './normalizer.js';
import { importCatalogMedia, type CatalogMediaImportDependencies } from './media.js';
import {
  activateCatalogVersions,
  approveCatalogVersions,
  buildCatalogVersionDiff,
  rollbackCatalogVersions,
} from './versioning.js';
import {
  catalogSafeSnapshotPayloadSchema,
  emptyCatalogSafeSnapshotPayload,
  type CatalogSafeSnapshotPayload,
} from './snapshot.js';

interface CatalogSourceRecord {
  readonly enabled: boolean;
  readonly mapping_version: string;
  readonly parser_version: string;
  readonly source_type: CatalogSourceType;
}

export type CatalogAdapterFactory = (
  source: CatalogSourceRecord,
) => CatalogSourceAdapter | Promise<CatalogSourceAdapter>;

export type CatalogMediaDependenciesFactory = () =>
  CatalogMediaImportDependencies | Promise<CatalogMediaImportDependencies>;

export interface CatalogJobServices {
  activateVersion(
    payload: CatalogActivateVersionPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  approveVersion(
    payload: CatalogApproveVersionPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  buildDiff(
    payload: CatalogBuildDiffPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  discoverSource(
    payload: CatalogSourceDiscoveryPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<string>;
  importMedia(
    payload: CatalogMediaImportPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  normalize(
    payload: CatalogNormalizePayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  rollbackVersion(
    payload: CatalogRollbackVersionPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  synchronize(
    payload: CatalogSyncRunPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
}

interface CapturedCatalogBatch {
  readonly categories: readonly CapturedSource<SourceCategory>[];
  readonly materials: readonly CapturedSource<SourceMaterial>[];
  readonly mediaManifests: readonly CapturedSource<SourceMediaManifest>[];
  readonly prices: readonly CapturedSource<SourcePrice>[];
  readonly sourceVersion: CatalogSafeSnapshotPayload['sourceVersion'];
  readonly systems: readonly CapturedSource<SourceSystem>[];
}

interface SnapshotEnvelope {
  readonly capturedAt: string;
  readonly contentHash: string;
  readonly httpStatus: number;
  readonly mappingVersion: string;
  readonly parserVersion: string;
  readonly payload: CatalogSafeSnapshotPayload;
  readonly sourceUrl: string;
  readonly sourceVersion?: string;
}

function assertRunning(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new FoundationJobError('FOUNDATION_JOB_ABORTED');
  }
}

async function defaultAdapterFactory(source: CatalogSourceRecord): Promise<CatalogSourceAdapter> {
  if (source.source_type !== 'AUTHORIZED_PUBLIC_WEB') {
    throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_INVALID');
  }
  return new AmigoCatalogSourceAdapter();
}

function defaultMediaDependenciesFactory(): CatalogMediaImportDependencies {
  throw new CatalogPipelineError('CATALOG_PIPELINE_STORAGE_UNAVAILABLE', { retryable: true });
}

async function loadSource(
  helpers: JobHelpers,
  catalogSourceId: string,
): Promise<CatalogSourceRecord> {
  const result = await helpers.query<CatalogSourceRecord>(
    `
      SELECT source_type, parser_version, mapping_version, enabled
      FROM catalog_source
      WHERE id = $1::uuid
    `,
    [catalogSourceId],
  );
  const source = result.rows[0];
  if (source === undefined || !source.enabled) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_INVALID');
  }
  return source;
}

async function captureCatalog(
  adapter: CatalogSourceAdapter,
  signal: AbortSignal,
): Promise<CapturedCatalogBatch> {
  assertRunning(signal);
  const categories = await adapter.discoverCategories();
  const systemSourceIds = [...new Set(categories.flatMap((record) => record.data.systemSourceIds))];
  const materialSourceIds = [
    ...new Set(categories.flatMap((record) => record.data.materialSourceIds)),
  ];
  const systems: CapturedSource<SourceSystem>[] = [];
  for (const sourceId of systemSourceIds) {
    assertRunning(signal);
    systems.push(await adapter.fetchProduct(sourceId));
  }
  const materials: CapturedSource<SourceMaterial>[] = [];
  const prices: CapturedSource<SourcePrice>[] = [];
  const mediaManifests: CapturedSource<SourceMediaManifest>[] = [];
  for (const sourceId of materialSourceIds) {
    assertRunning(signal);
    materials.push(await adapter.fetchMaterial(sourceId));
    prices.push(await adapter.fetchPrice(sourceId));
    mediaManifests.push(await adapter.fetchMediaManifest(sourceId));
  }
  const sourceVersion = await adapter.getSourceVersion();
  return {
    categories,
    materials,
    mediaManifests,
    prices,
    sourceVersion,
    systems,
  };
}

function groupSnapshots(batch: CapturedCatalogBatch): readonly SnapshotEnvelope[] {
  const grouped = new Map<string, SnapshotEnvelope>();
  const append = (
    collection: 'categories' | 'materials' | 'mediaManifests' | 'prices' | 'systems',
    record:
      | CapturedSource<SourceCategory>
      | CapturedSource<SourceMaterial>
      | CapturedSource<SourceMediaManifest>
      | CapturedSource<SourcePrice>
      | CapturedSource<SourceSystem>,
  ): void => {
    const existing = grouped.get(record.capture.sourceUrl);
    const envelope: SnapshotEnvelope =
      existing ??
      ({
        capturedAt: record.capture.capturedAt,
        contentHash: record.capture.contentHash,
        httpStatus: record.capture.httpStatus,
        mappingVersion: record.capture.mappingVersion,
        parserVersion: record.capture.parserVersion,
        payload: emptyCatalogSafeSnapshotPayload(batch.sourceVersion),
        sourceUrl: record.capture.sourceUrl,
        ...(record.capture.sourceVersion === undefined
          ? {}
          : { sourceVersion: record.capture.sourceVersion }),
      } satisfies SnapshotEnvelope);
    if (
      envelope.contentHash !== record.capture.contentHash ||
      envelope.parserVersion !== record.capture.parserVersion ||
      envelope.mappingVersion !== record.capture.mappingVersion
    ) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
    }
    (
      envelope.payload[collection] as Array<
        | CapturedSource<SourceCategory>
        | CapturedSource<SourceMaterial>
        | CapturedSource<SourceMediaManifest>
        | CapturedSource<SourcePrice>
        | CapturedSource<SourceSystem>
      >
    ).push(record);
    grouped.set(record.capture.sourceUrl, envelope);
  };

  for (const record of batch.categories) append('categories', record);
  for (const record of batch.systems) append('systems', record);
  for (const record of batch.materials) append('materials', record);
  for (const record of batch.prices) append('prices', record);
  for (const record of batch.mediaManifests) append('mediaManifests', record);

  return [...grouped.values()]
    .map((envelope) => ({
      ...envelope,
      payload: catalogSafeSnapshotPayloadSchema.parse(envelope.payload),
    }))
    .sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl));
}

function logicalEntityCount(batch: CapturedCatalogBatch): number {
  const familyCount = new Set(batch.categories.map((record) => record.data.family.sourceId)).size;
  const mediaCount = batch.mediaManifests.reduce(
    (count, manifest) => count + manifest.data.media.length,
    0,
  );
  return (
    familyCount +
    batch.categories.length +
    batch.systems.length +
    batch.materials.length +
    batch.prices.length +
    mediaCount
  );
}

export function createCatalogJobServices(
  adapterFactory: CatalogAdapterFactory = defaultAdapterFactory,
  mediaDependenciesFactory: CatalogMediaDependenciesFactory = defaultMediaDependenciesFactory,
): CatalogJobServices {
  return {
    async discoverSource(payload, helpers, signal) {
      try {
        assertRunning(signal);
        const source = await loadSource(helpers, payload.catalogSourceId);
        const syncRun = await helpers.query<{ id: string }>(
          `
            INSERT INTO catalog_sync_run (
              catalog_source_id, trigger, status, idempotency_key, correlation_id,
              requested_by_actor_id, started_at, last_heartbeat_at, parser_version,
              mapping_version, audit_context, updated_at
            ) VALUES (
              $1::uuid, $2::catalog_sync_trigger, 'DISCOVERING', $3, $4,
              $5::uuid, NOW(), NOW(), $6, $7, $8::jsonb, NOW()
            )
            ON CONFLICT (idempotency_key) DO UPDATE
            SET last_heartbeat_at = NOW(), updated_at = NOW()
            RETURNING id::text
          `,
          [
            payload.catalogSourceId,
            payload.trigger,
            payload.idempotencyKey,
            payload.correlationId,
            payload.requestedByActorId ?? null,
            source.parser_version,
            source.mapping_version,
            JSON.stringify({
              ...(payload.retryOfSyncRunId === undefined
                ? {}
                : { retryOfSyncRunId: payload.retryOfSyncRunId }),
              schemaVersion: 1,
              trigger: payload.trigger,
            }),
          ],
        );
        const syncRunId = syncRun.rows[0]?.id;
        if (syncRunId === undefined) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
        }

        const adapter = await adapterFactory(source);
        const health = await adapter.healthCheck();
        if (health.status !== 'healthy') {
          throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_UNAVAILABLE', {
            retryable: true,
          });
        }
        const categories = await adapter.discoverCategories();
        const discoveredCount =
          categories.length +
          new Set(categories.flatMap((record) => record.data.systemSourceIds)).size +
          new Set(categories.flatMap((record) => record.data.materialSourceIds)).size;
        await helpers.query(
          `
            UPDATE catalog_sync_run
            SET status = 'CAPTURING', discovered_count = $2, last_heartbeat_at = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [syncRunId, discoveredCount],
        );
        await helpers.query(
          `
            INSERT INTO audit_event (
              actor_type, actor_identity_id, action, outcome, correlation_id,
              target_type, target_id
            ) VALUES (
              CASE WHEN $1::uuid IS NULL THEN 'SYSTEM_WORKER'::audit_actor_type
                   ELSE 'IDENTITY'::audit_actor_type END,
              $1::uuid, 'CATALOG_SOURCE_DISCOVERED', 'SUCCEEDED', $2,
              'CATALOG_SYNC_RUN', $3
            )
          `,
          [payload.requestedByActorId ?? null, payload.correlationId, syncRunId],
        );
        return syncRunId;
      } catch (error) {
        if (error instanceof FoundationJobError) throw error;
        throw toCatalogPipelineError(error);
      }
    },

    async synchronize(payload, helpers, signal) {
      try {
        assertRunning(signal);
        const existing = await helpers.query<{ snapshot_count: string }>(
          'SELECT count(*)::text AS snapshot_count FROM source_snapshot WHERE sync_run_id = $1::uuid',
          [payload.syncRunId],
        );
        if (Number(existing.rows[0]?.snapshot_count ?? '0') > 0) {
          await helpers.query(
            `UPDATE catalog_sync_run
             SET status = 'NORMALIZING', last_heartbeat_at = NOW(), updated_at = NOW()
             WHERE id = $1::uuid`,
            [payload.syncRunId],
          );
          return;
        }

        const source = await loadSource(helpers, payload.catalogSourceId);
        const adapter = await adapterFactory(source);
        const batch = await captureCatalog(adapter, signal);
        const snapshots = groupSnapshots(batch);
        await helpers.withPgClient(async (client) => {
          await client.query('BEGIN');
          try {
            for (const snapshot of snapshots) {
              await client.query(
                `
                  INSERT INTO source_snapshot (
                    catalog_source_id, sync_run_id, source_url, captured_at, status,
                    http_status, content_hash, safe_payload, parser_version,
                    mapping_version, source_version
                  ) VALUES (
                    $1::uuid, $2::uuid, $3, $4::timestamptz, 'CAPTURED',
                    $5, $6, $7::jsonb, $8, $9, $10
                  )
                `,
                [
                  payload.catalogSourceId,
                  payload.syncRunId,
                  snapshot.sourceUrl,
                  snapshot.capturedAt,
                  snapshot.httpStatus,
                  snapshot.contentHash,
                  JSON.stringify(snapshot.payload),
                  snapshot.parserVersion,
                  snapshot.mappingVersion,
                  snapshot.sourceVersion ?? null,
                ],
              );
            }
            await client.query(
              `
                UPDATE catalog_sync_run
                SET status = 'NORMALIZING', source_version = $2,
                    discovered_count = $3, last_heartbeat_at = NOW(), updated_at = NOW()
                WHERE id = $1::uuid
              `,
              [payload.syncRunId, batch.sourceVersion.version, logicalEntityCount(batch)],
            );
            await client.query(
              `
                UPDATE catalog_source
                SET last_checked_at = NOW(), updated_at = NOW()
                WHERE id = $1::uuid
              `,
              [payload.catalogSourceId],
            );
            await client.query(
              `
                INSERT INTO audit_event (
                  actor_type, action, outcome, correlation_id, target_type, target_id
                ) VALUES (
                  'SYSTEM_WORKER', 'CATALOG_SOURCE_CAPTURED', 'SUCCEEDED', $1,
                  'CATALOG_SYNC_RUN', $2
                )
              `,
              [payload.correlationId, payload.syncRunId],
            );
            await client.query('COMMIT');
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        });
      } catch (error) {
        if (error instanceof FoundationJobError) throw error;
        throw toCatalogPipelineError(error);
      }
    },

    async normalize(payload, helpers, signal) {
      assertRunning(signal);
      await normalizeCatalogSnapshots(payload, helpers);
    },

    async importMedia(payload, helpers, signal) {
      try {
        assertRunning(signal);
        const source = await loadSource(helpers, payload.catalogSourceId);
        const adapter = await adapterFactory(source);
        const dependencies = await mediaDependenciesFactory();
        await importCatalogMedia(payload, helpers, adapter, dependencies, signal);
      } catch (error) {
        if (error instanceof FoundationJobError) throw error;
        throw toCatalogPipelineError(error);
      }
    },

    async buildDiff(payload, helpers, signal) {
      assertRunning(signal);
      await buildCatalogVersionDiff(payload, helpers);
    },

    async approveVersion(payload, helpers, signal) {
      assertRunning(signal);
      await approveCatalogVersions(payload, helpers);
    },

    async activateVersion(payload, helpers, signal) {
      assertRunning(signal);
      await activateCatalogVersions(payload, helpers);
    },

    async rollbackVersion(payload, helpers, signal) {
      assertRunning(signal);
      await rollbackCatalogVersions(payload, helpers);
    },
  };
}
