import {
  AmigoCatalogSourceAdapter,
  hashCanonicalSource,
  type CapturedSource,
  type CatalogSourceVersion,
  type CatalogSourceAdapter,
  type CatalogSourceType,
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
import {
  catalogCancellationRequested,
  catalogCaptureKey,
  loadReusableCatalogCaptureKeys,
  markCatalogRunCancelled,
  persistCatalogSnapshot,
  recordCatalogCaptureFailure,
  writeCatalogCheckpoint,
  type CatalogCaptureStage,
  type CatalogSnapshotWrite,
} from './capture.js';
import { sealCatalogImportManifest } from './manifest.js';
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
  ): Promise<'CANCELLED' | 'COMPLETED'>;
  discoverSource(
    payload: CatalogSourceDiscoveryPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<string>;
  importMedia(
    payload: CatalogMediaImportPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<'CANCELLED' | 'COMPLETED' | 'CONTINUE'>;
  normalize(
    payload: CatalogNormalizePayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<'CANCELLED' | 'COMPLETED'>;
  rollbackVersion(
    payload: CatalogRollbackVersionPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<void>;
  synchronize(
    payload: CatalogSyncRunPayload,
    helpers: JobHelpers,
    signal: AbortSignal,
  ): Promise<'CANCELLED' | 'CAPTURED'>;
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

const captureCheckpointInterval = 25;

type SnapshotCollection =
  'categories' | 'materials' | 'mediaManifests' | 'models' | 'prices' | 'systems';

type CaptureFailureSourceType =
  'CATEGORY' | 'MATERIAL_VARIANT' | 'MEDIA' | 'MODEL' | 'PRICE' | 'SYSTEM';

interface CapturePartitionItem {
  readonly captureKey: string;
  readonly sourceId: string;
  produce(): Promise<CatalogSnapshotWrite>;
}

interface CapturePartitionResult {
  readonly cancelled: boolean;
  readonly errorCount: number;
  readonly processedCount: number;
  readonly resumeCount: number;
}

interface CapturePartitionDefinition {
  readonly failureSourceType: CaptureFailureSourceType;
  readonly items: readonly CapturePartitionItem[];
  readonly stage: Exclude<CatalogCaptureStage, 'discovery'>;
}

function snapshotPayload<T>(
  sourceVersion: CatalogSourceVersion,
  collection: SnapshotCollection,
  record?: CapturedSource<T>,
): CatalogSafeSnapshotPayload {
  const empty = emptyCatalogSafeSnapshotPayload(sourceVersion);
  return catalogSafeSnapshotPayloadSchema.parse({
    ...empty,
    ...(record === undefined ? {} : { [collection]: [record] }),
  });
}

function capturedRecordItem<T>(
  sourceId: string,
  kind: string,
  collection: SnapshotCollection,
  record: CapturedSource<T>,
  sourceVersion: CatalogSourceVersion,
): CapturePartitionItem {
  const captureKey = catalogCaptureKey(kind, sourceId);
  return {
    captureKey,
    sourceId,
    async produce() {
      return {
        capture: record.capture,
        captureKey,
        payload: snapshotPayload(sourceVersion, collection, record),
        semanticSourceVersion: sourceVersion.version,
      };
    },
  };
}

function fetchedRecordItem<T>(
  sourceId: string,
  kind: string,
  collection: SnapshotCollection,
  sourceVersion: CatalogSourceVersion,
  fetch: (sourceId: string) => Promise<CapturedSource<T>>,
): CapturePartitionItem {
  const captureKey = catalogCaptureKey(kind, sourceId);
  return {
    captureKey,
    sourceId,
    async produce() {
      const record = await fetch(sourceId);
      return {
        capture: record.capture,
        captureKey,
        payload: snapshotPayload(sourceVersion, collection, record),
        semanticSourceVersion: sourceVersion.version,
      };
    },
  };
}

async function capturePartition(
  helpers: JobHelpers,
  payload: CatalogSyncRunPayload,
  signal: AbortSignal,
  input: {
    readonly failureSourceType: CaptureFailureSourceType;
    readonly items: readonly CapturePartitionItem[];
    readonly sourceVersion: string;
    readonly stage: Exclude<CatalogCaptureStage, 'discovery'>;
  },
): Promise<CapturePartitionResult> {
  let errorCount = 0;
  let processedCount = 0;
  let resumeCount = 0;
  let lastSourceId: string | null = null;
  const checkpoint = async (status: 'COMPLETED' | 'IN_PROGRESS'): Promise<void> =>
    writeCatalogCheckpoint(helpers, payload.syncRunId, {
      errorCount,
      expectedCount: input.items.length,
      processedCount,
      resumeCount,
      safeCursor: {
        lastSourceId,
        sourceVersion: input.sourceVersion,
      },
      stage: input.stage,
      status,
    });

  const reusableCaptureKeys = await loadReusableCatalogCaptureKeys(
    helpers,
    payload.syncRunId,
    input.items.map((item) => item.captureKey),
    input.sourceVersion,
  );
  await checkpoint('IN_PROGRESS');
  for (let index = 0; index < input.items.length; index += 1) {
    assertRunning(signal);
    if (
      index % captureCheckpointInterval === 0 &&
      (await catalogCancellationRequested(helpers, payload.syncRunId))
    ) {
      await checkpoint('IN_PROGRESS');
      return { cancelled: true, errorCount, processedCount, resumeCount };
    }
    const item = input.items[index];
    if (item === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
    lastSourceId = item.sourceId;
    if (reusableCaptureKeys.has(item.captureKey)) {
      processedCount += 1;
      resumeCount += 1;
      if ((index + 1) % captureCheckpointInterval === 0) await checkpoint('IN_PROGRESS');
      continue;
    }
    try {
      const result = await persistCatalogSnapshot(helpers, payload, await item.produce());
      processedCount += 1;
      if (result === 'RESUMED') resumeCount += 1;
    } catch (error) {
      const pipelineError = toCatalogPipelineError(error);
      if (pipelineError.retryable) {
        await checkpoint('IN_PROGRESS');
        throw pipelineError;
      }
      errorCount += 1;
      await recordCatalogCaptureFailure(helpers, payload, {
        errorCode: pipelineError.code,
        sourceId: item.sourceId,
        sourceType: input.failureSourceType,
        stage: input.stage,
      });
    }
    if ((index + 1) % captureCheckpointInterval === 0) await checkpoint('IN_PROGRESS');
  }
  await checkpoint('COMPLETED');
  return { cancelled: false, errorCount, processedCount, resumeCount };
}

async function sealCancellation(
  payload: CatalogSyncRunPayload,
  helpers: JobHelpers,
): Promise<'CANCELLED'> {
  await markCatalogRunCancelled(payload, helpers);
  await helpers.withPgClient((client) => sealCatalogImportManifest(client, payload, 'CANCELLED'));
  return 'CANCELLED';
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
        await helpers.query(
          `
            UPDATE catalog_sync_run
            SET status = 'CAPTURING', last_heartbeat_at = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [syncRunId],
        );
        await helpers.query(
          `
            INSERT INTO audit_event (
              actor_type, actor_identity_id, action, outcome, correlation_id,
              target_type, target_id
            ) VALUES (
              CASE WHEN $1::uuid IS NULL THEN 'SYSTEM_WORKER'::audit_actor_type
                   ELSE 'IDENTITY'::audit_actor_type END,
              $1::uuid, 'CATALOG_SYNC_INITIALIZED', 'SUCCEEDED', $2,
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
        const runState = await helpers.query<{
          cancel_requested: boolean;
          manifest_status: string | null;
          source_version: string | null;
          status: string;
        }>(
          `
            SELECT run.status::text, run.source_version,
                   run.cancel_requested_at IS NOT NULL AS cancel_requested,
                   manifest.status::text AS manifest_status
            FROM catalog_sync_run run
            LEFT JOIN catalog_import_manifest manifest ON manifest.sync_run_id = run.id
            WHERE run.id = $1::uuid AND run.catalog_source_id = $2::uuid
          `,
          [payload.syncRunId, payload.catalogSourceId],
        );
        const currentRun = runState.rows[0];
        if (currentRun === undefined) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
        }
        if (currentRun.status === 'CANCELLED' || currentRun.cancel_requested) {
          return await sealCancellation(payload, helpers);
        }
        if (currentRun.manifest_status !== null || currentRun.status !== 'CAPTURING') {
          throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
        }

        const source = await loadSource(helpers, payload.catalogSourceId);
        const adapter = await adapterFactory(source);
        const discovery = await adapter.discoverCatalog();
        assertRunning(signal);
        const pinned = await helpers.query<{ source_version: string }>(
          `
            UPDATE catalog_sync_run
            SET source_version = $2, last_heartbeat_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid
              AND status = 'CAPTURING'
              AND (source_version IS NULL OR source_version = $2)
            RETURNING source_version
          `,
          [payload.syncRunId, discovery.sourceVersion.version],
        );
        if (pinned.rows[0]?.source_version !== discovery.sourceVersion.version) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
        }

        const discoveryFailureCount = discovery.diagnostics.filter(
          (diagnostic) => diagnostic.severity === 'FAILURE',
        ).length;
        const discoveryCursor = {
          schemaVersion: 1,
          complete: discovery.complete,
          sourceVersion: discovery.sourceVersion.version,
          counts: {
            categories: discovery.categories.length,
            materialVariants: discovery.materialSourceIds.length,
            models: discovery.modelSourceIds.length,
            pages: discovery.pages.length,
            prices: discovery.materialSourceIds.length + discovery.modelSourceIds.length,
            systems: discovery.systemSourceIds.length,
          },
          diagnostics: discovery.diagnostics.map((diagnostic) => ({
            code: diagnostic.code,
            ...(diagnostic.entitySourceId === undefined
              ? {}
              : { entitySourceId: diagnostic.entitySourceId }),
            message: diagnostic.message.slice(0, 512),
            severity: diagnostic.severity,
            sourceUrl: diagnostic.sourceUrl,
          })),
          pages: discovery.pages.map((page) => ({
            contentHash: page.capture.contentHash,
            kind: page.kind,
            pageNumber: page.pageNumber,
            sourceReference: page.sourceReference,
            sourceUrl: page.capture.sourceUrl,
          })),
        } as const;
        await writeCatalogCheckpoint(helpers, payload.syncRunId, {
          errorCount: discoveryFailureCount,
          expectedCount: discovery.pages.length + discoveryFailureCount,
          processedCount: discovery.pages.length,
          resumeCount: 0,
          safeCursor: discoveryCursor,
          stage: 'discovery',
          status: 'COMPLETED',
        });

        const pageItems: CapturePartitionItem[] = discovery.pages.map((page) => {
          const sourceId = hashCanonicalSource({
            kind: page.kind,
            pageNumber: page.pageNumber,
            sourceReference: page.sourceReference,
          });
          const captureKey = catalogCaptureKey('page', sourceId);
          return {
            captureKey,
            sourceId,
            async produce() {
              return {
                capture: page.capture,
                captureKey,
                payload: snapshotPayload(discovery.sourceVersion, 'categories'),
                semanticSourceVersion: discovery.sourceVersion.version,
              };
            },
          };
        });
        const priceSourceIds = [...discovery.materialSourceIds, ...discovery.modelSourceIds];
        if (new Set(priceSourceIds).size !== priceSourceIds.length) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
        }
        const partitions: CapturePartitionDefinition[] = [
          {
            failureSourceType: 'CATEGORY',
            items: pageItems,
            stage: 'capture-pages',
          },
          {
            failureSourceType: 'CATEGORY',
            items: discovery.categories.map((record) =>
              capturedRecordItem(
                record.data.identity.sourceId,
                'category',
                'categories',
                record,
                discovery.sourceVersion,
              ),
            ),
            stage: 'capture-categories',
          },
          {
            failureSourceType: 'SYSTEM',
            items: discovery.systemSourceIds.map((sourceId) =>
              fetchedRecordItem(sourceId, 'system', 'systems', discovery.sourceVersion, (id) =>
                adapter.fetchProduct(id),
              ),
            ),
            stage: 'capture-systems',
          },
          {
            failureSourceType: 'MODEL',
            items: discovery.modelSourceIds.map((sourceId) =>
              fetchedRecordItem(sourceId, 'model', 'models', discovery.sourceVersion, (id) =>
                adapter.fetchModel(id),
              ),
            ),
            stage: 'capture-models',
          },
          {
            failureSourceType: 'MATERIAL_VARIANT',
            items: discovery.materialSourceIds.map((sourceId) =>
              fetchedRecordItem(sourceId, 'material', 'materials', discovery.sourceVersion, (id) =>
                adapter.fetchMaterial(id),
              ),
            ),
            stage: 'capture-materials',
          },
          {
            failureSourceType: 'PRICE',
            items: priceSourceIds.map((sourceId) =>
              fetchedRecordItem(sourceId, 'price', 'prices', discovery.sourceVersion, (id) =>
                adapter.fetchPrice(id),
              ),
            ),
            stage: 'capture-prices',
          },
          {
            failureSourceType: 'MEDIA',
            items: discovery.materialSourceIds.map((sourceId) =>
              fetchedRecordItem(
                sourceId,
                'media-manifest',
                'mediaManifests',
                discovery.sourceVersion,
                (id) => adapter.fetchMediaManifest(id),
              ),
            ),
            stage: 'capture-media-manifests',
          },
        ];
        const results: CapturePartitionResult[] = [];
        for (const partition of partitions) {
          const result = await capturePartition(helpers, payload, signal, {
            ...partition,
            sourceVersion: discovery.sourceVersion.version,
          });
          results.push(result);
          if (result.cancelled) return await sealCancellation(payload, helpers);
        }

        const familyCount = new Set(
          discovery.categories.map((record) => record.data.family.sourceId),
        ).size;
        const expectedEntityCount =
          familyCount +
          discovery.categories.length +
          discovery.systemSourceIds.length +
          discovery.modelSourceIds.length * 2 +
          discovery.materialSourceIds.length * 3;
        const captureErrorCount = results.reduce(
          (total, result) => total + result.errorCount,
          discoveryFailureCount,
        );
        await helpers.withPgClient(async (client) => {
          await client.query('BEGIN');
          try {
            await client.query(
              `
                UPDATE catalog_sync_run
                SET status = 'NORMALIZING', discovered_count = $2,
                    error_count = $3, last_heartbeat_at = NOW(), updated_at = NOW(),
                    audit_context = audit_context || jsonb_build_object(
                      'captureComplete', $4::boolean,
                      'captureCheckpointCount', $5::integer
                    )
                WHERE id = $1::uuid
              `,
              [
                payload.syncRunId,
                expectedEntityCount,
                captureErrorCount,
                discovery.complete && captureErrorCount === 0,
                partitions.length + 1,
              ],
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
        return 'CAPTURED';
      } catch (error) {
        if (error instanceof FoundationJobError) throw error;
        throw toCatalogPipelineError(error);
      }
    },

    async normalize(payload, helpers, signal) {
      assertRunning(signal);
      if (await catalogCancellationRequested(helpers, payload.syncRunId)) {
        return await sealCancellation(payload, helpers);
      }
      await normalizeCatalogSnapshots(payload, helpers);
      return 'COMPLETED';
    },

    async importMedia(payload, helpers, signal) {
      try {
        assertRunning(signal);
        if (await catalogCancellationRequested(helpers, payload.syncRunId)) {
          return await sealCancellation(payload, helpers);
        }
        const source = await loadSource(helpers, payload.catalogSourceId);
        const adapter = await adapterFactory(source);
        const dependencies = await mediaDependenciesFactory();
        const result = await importCatalogMedia(payload, helpers, adapter, dependencies, signal);
        if (result.cancelled) return await sealCancellation(payload, helpers);
        return result.remainingCount > 0 ? 'CONTINUE' : 'COMPLETED';
      } catch (error) {
        if (error instanceof FoundationJobError) throw error;
        throw toCatalogPipelineError(error);
      }
    },

    async buildDiff(payload, helpers, signal) {
      assertRunning(signal);
      if (await catalogCancellationRequested(helpers, payload.syncRunId)) {
        return await sealCancellation(payload, helpers);
      }
      await buildCatalogVersionDiff(payload, helpers);
      return 'COMPLETED';
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
