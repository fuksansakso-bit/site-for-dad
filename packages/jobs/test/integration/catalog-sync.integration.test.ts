import { randomUUID } from 'node:crypto';

import {
  FixtureCatalogSourceAdapter,
  CatalogSourceError,
  hashCanonicalSource,
  type FixtureCatalogDataset,
} from '@project-name/catalog';
import {
  parseDatabaseEnvironment,
  parseMigrationEnvironment,
  parseWorkerEnvironment,
  type WorkerEnvironment,
} from '@project-name/config/server';
import { createCatalogManagementAdapter, createCatalogReadAdapter } from '@project-name/db';
import type { JobHelpers } from 'graphile-worker';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createFoundationJobPool,
  enqueueCatalogSourceDiscovery,
  requestCatalogSyncCancellation,
  runFoundationJobsOnce,
  verifyFoundationQueueSchema,
} from '../../src/adapter.js';
import { catalogJobIdentifiers, catalogStageIdempotencyKey } from '../../src/catalog/contracts.js';
import { failCatalogExecution } from '../../src/catalog/idempotency.js';
import type { CatalogMediaStoragePort } from '../../src/catalog/media.js';
import type { CatalogTaskLifecycleEvent } from '../../src/catalog/task.js';
import { createCatalogJobServices } from '../../src/catalog/services.js';
import {
  activateCatalogVersions,
  approveCatalogVersions,
  reviewCatalogDifferences,
  rollbackCatalogVersions,
} from '../../src/catalog/versioning.js';
import {
  createJobsCatalogFixture,
  createMemoryCatalogStorage,
} from '../support/catalog-fixture.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const runTag = randomUUID().slice(0, 8);
const databaseEnvironment = parseDatabaseEnvironment(process.env);
const migrationEnvironment = parseMigrationEnvironment(process.env);
const workerEnvironment: WorkerEnvironment = {
  ...parseWorkerEnvironment(process.env),
  WORKER_JOB_TIMEOUT_MS: 5_000,
};
const pool = createFoundationJobPool(databaseEnvironment, 4);
const migrationPool = new Pool({ connectionString: migrationEnvironment.MIGRATION_DATABASE_URL });
const objectStorage = createMemoryCatalogStorage();
const ownerActorId = randomUUID();
const adminActorId = randomUUID();
const services = createCatalogJobServices(
  () => new FixtureCatalogSourceAdapter(createJobsCatalogFixture()),
  () => ({ maximumBytes: 1_048_576, maximumItemsPerBatch: 2, objectStorage }),
);
const management = createCatalogManagementAdapter(databaseEnvironment);
const catalogRead = createCatalogReadAdapter(databaseEnvironment);
const versionHelpers = {
  query: <T extends QueryResultRow>(text: string, values?: unknown[]): Promise<QueryResult<T>> =>
    pool.query<T>(text, values),
  withPgClient: async <T>(operation: (client: PoolClient) => Promise<T>) => {
    const client = await pool.connect();
    try {
      return await operation(client);
    } finally {
      client.release();
    }
  },
} as unknown as JobHelpers;

interface ReleaseEvidence {
  readonly catalogDifferenceChecksum: string;
  readonly catalogVersionId: string;
  readonly priceDifferenceChecksum: string;
  readonly priceVersionId: string;
}

function changedJobsCatalogFixture(): FixtureCatalogDataset {
  const fixture = createJobsCatalogFixture();
  const contentHash = hashCanonicalSource({ fixture: 'jobs-catalog-pipeline-v2' });
  const material = fixture.materials[0];
  if (material === undefined) throw new Error('Fixture material is unavailable.');
  const capture = {
    ...material.capture,
    contentHash,
    sourceVersion: 'jobs-fixture-v2',
  };
  const updateCapture = <T extends { readonly capture: typeof material.capture }>(
    record: T,
  ): T => ({
    ...record,
    capture: { ...record.capture, contentHash, sourceVersion: 'jobs-fixture-v2' },
  });
  return {
    ...fixture,
    categories: fixture.categories.map(updateCapture),
    materials: [
      {
        capture,
        data: {
          ...material.data,
          identity: {
            ...material.data.identity,
            sourceHash: hashCanonicalSource({
              article: material.data.article,
              revision: 2,
              sourceId: material.data.identity.sourceId,
            }),
          },
          variantName: `${material.data.variantName} v2`,
        },
      },
    ],
    mediaManifests: fixture.mediaManifests.map(updateCapture),
    models: (fixture.models ?? []).map(updateCapture),
    prices: fixture.prices.map(updateCapture),
    sourceVersion: { ...fixture.sourceVersion, version: 'jobs-fixture-v2' },
    systems: fixture.systems.map(updateCapture),
  };
}

function priceChangedJobsCatalogFixture(): FixtureCatalogDataset {
  const fixture = createJobsCatalogFixture();
  const contentHash = hashCanonicalSource({ fixture: 'jobs-catalog-prices-v3' });
  const template = fixture.materials[0];
  if (template === undefined) throw new Error('Fixture material is unavailable.');
  const sourceVersion = 'jobs-fixture-v3';
  const updateCapture = <T extends { readonly capture: typeof template.capture }>(
    record: T,
  ): T => ({
    ...record,
    capture: { ...record.capture, contentHash, sourceVersion },
  });
  return {
    ...fixture,
    categories: fixture.categories.map(updateCapture),
    materials: fixture.materials.map(updateCapture),
    mediaManifests: fixture.mediaManifests.map(updateCapture),
    models: (fixture.models ?? []).map(updateCapture),
    prices: fixture.prices.map((record) => {
      const isMaterial = record.data.identity.sourceId === 'jobs-material-roller-1001';
      const amountMinor = isMaterial ? 175_000 : 249_900;
      const status = 'AVAILABLE' as const;
      return updateCapture({
        ...record,
        data: {
          ...record.data,
          amountMinor,
          identity: {
            ...record.data.identity,
            sourceHash: hashCanonicalSource({
              amountMinor,
              kind: record.data.kind,
              sourceId: record.data.identity.sourceId,
              status,
            }),
          },
          sourceContext: {
            ...record.data.sourceContext,
            label: isMaterial ? 'от 1 750 ₽' : '2 499 ₽',
          },
          status,
        },
      });
    }),
    sourceVersion: { ...fixture.sourceVersion, version: sourceVersion },
    systems: fixture.systems.map(updateCapture),
  };
}

async function runPipeline(
  idempotencySuffix: string,
  retryOfSyncRunId?: string,
  expectedStatus:
    'AWAITING_APPROVAL' | 'COMPLETED' | 'FAILED' | 'IMPORTING_MEDIA' = 'AWAITING_APPROVAL',
  pipelineServices = services,
): Promise<string> {
  const uniqueSuffix = `${runTag}-${idempotencySuffix}`;
  const idempotencyKey = `catalog:test:${catalogSourceId}:${uniqueSuffix}`;
  await enqueueCatalogSourceDiscovery(pool, {
    catalogSourceId,
    correlationId: `catalog-integration-${uniqueSuffix}`,
    idempotencyKey,
    ...(retryOfSyncRunId === undefined ? {} : { retryOfSyncRunId }),
    schemaVersion: 1,
    trigger: 'TEST',
  });
  const lifecycleEvents: CatalogTaskLifecycleEvent[] = [];
  let result:
    | { rows: Array<{ id: string; retry_of_sync_run_id: string | null; status: string }> }
    | undefined;
  for (let stage = 0; stage < 12; stage += 1) {
    await runFoundationJobsOnce(
      pool,
      workerEnvironment,
      undefined,
      undefined,
      (event) => lifecycleEvents.push(event),
      pipelineServices,
    );
    result = await pool.query<{
      id: string;
      retry_of_sync_run_id: string | null;
      status: string;
    }>(
      `SELECT id::text, status::text,
              audit_context->>'retryOfSyncRunId' AS retry_of_sync_run_id
       FROM catalog_sync_run WHERE idempotency_key = $1`,
      [idempotencyKey],
    );
    if (['AWAITING_APPROVAL', 'COMPLETED', 'FAILED'].includes(result.rows[0]?.status ?? '')) break;
  }
  if (result === undefined) throw new Error('Catalog sync run was not inspected.');
  expect(result.rows[0]?.status, JSON.stringify(lifecycleEvents)).toBe(expectedStatus);
  expect(result.rows[0]?.retry_of_sync_run_id).toBe(retryOfSyncRunId ?? null);
  const syncRunId = result.rows[0]?.id;
  if (syncRunId === undefined) throw new Error('Catalog sync run was not created.');
  return syncRunId;
}

beforeAll(async () => {
  await verifyFoundationQueueSchema(pool);
  await pool.query(
    `
      INSERT INTO actor_identity (id, provider, subject, updated_at)
      VALUES
        ($1::uuid, 'synthetic-user', $3, NOW()),
        ($2::uuid, 'synthetic-user', $4, NOW())
    `,
    [ownerActorId, adminActorId, `catalog-owner-${runTag}`, `catalog-admin-${runTag}`],
  );
  await pool.query(
    `INSERT INTO role_grant (actor_id, role)
     VALUES ($1::uuid, 'OWNER'), ($2::uuid, 'ADMIN')`,
    [ownerActorId, adminActorId],
  );
});
afterAll(async () => {
  await catalogRead.close();
  await management.close();
  await pool.end();
  await migrationPool.end();
});

describe.sequential('catalog synchronization pipeline', () => {
  let firstSyncRunId: string | undefined;
  let firstRelease: ReleaseEvidence | undefined;

  it('captures safe snapshots and normalizes the fixture through all pre-approval stages', async () => {
    const syncRunId = await runPipeline('pipeline-001');
    firstSyncRunId = syncRunId;
    const counts = await pool.query<{
      audit_count: string;
      catalog_difference_count: string;
      catalog_version_count: string;
      checkpoint_count: string;
      import_manifest_complete: boolean;
      import_manifest_count: string;
      material_count: string;
      model_count: string;
      category_media_count: string;
      exact_target_media_count: string;
      media_reference_count: string;
      media_asset_count: string;
      media_audit_count: string;
      media_batch_number: string;
      media_metadata_filename: string;
      model_media_count: string;
      exact_target_price_count: string;
      model_price_count: string;
      price_count: string;
      price_on_request_count: string;
      price_version_record_count: string;
      price_version_count: string;
      snapshot_count: string;
      system_media_count: string;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM source_snapshot WHERE sync_run_id = $1::uuid) AS snapshot_count,
          (SELECT count(*)::text FROM catalog_version WHERE sync_run_id = $1::uuid)
            AS catalog_version_count,
          (SELECT count(*)::text FROM catalog_sync_checkpoint WHERE sync_run_id = $1::uuid)
            AS checkpoint_count,
          (SELECT count(*)::text FROM catalog_import_manifest WHERE sync_run_id = $1::uuid)
            AS import_manifest_count,
          (SELECT complete FROM catalog_import_manifest WHERE sync_run_id = $1::uuid)
            AS import_manifest_complete,
          (SELECT count(*)::text FROM price_version WHERE sync_run_id = $1::uuid)
            AS price_version_count,
          (SELECT count(*)::text FROM catalog_sync_difference WHERE sync_run_id = $1::uuid)
            AS catalog_difference_count,
          (
            SELECT count(*)::text
            FROM material_variant variant
            JOIN source_entity source ON source.id = variant.source_entity_id
            WHERE source.catalog_source_id = '${catalogSourceId}'::uuid
              AND source.source_id = 'jobs-material-roller-1001'
          ) AS material_count,
          (
            SELECT count(*)::text
            FROM product_model model
            JOIN source_entity source ON source.id = model.source_entity_id
            WHERE source.catalog_source_id = '${catalogSourceId}'::uuid
              AND source.source_id = 'jobs-model-roller-ready-1001'
              AND model.category_id IS NOT NULL
              AND model.system_id IS NOT NULL
          ) AS model_count,
          (
            SELECT count(*)::text
            FROM source_media_asset media
            JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid
              AND media.category_id IS NOT NULL
          ) AS category_media_count,
          (
            SELECT count(*)::text
            FROM source_media_asset media
            JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid
              AND num_nonnulls(
                media.material_variant_id,
                media.category_id,
                media.system_id,
                media.model_id
              ) = 1
          ) AS exact_target_media_count,
          (
            SELECT count(*)::text
            FROM source_media_asset
            WHERE catalog_source_id = '${catalogSourceId}'::uuid
              AND source_id = 'jobs-material-roller-1001:primary:1'
          ) AS media_reference_count,
          (
            SELECT count(DISTINCT asset.id)::text
            FROM media_asset asset
            JOIN source_media_asset source_media ON source_media.media_asset_id = asset.id
            WHERE source_media.catalog_source_id = '${catalogSourceId}'::uuid
              AND source_media.source_id = 'jobs-material-roller-1001:primary:1'
          ) AS media_asset_count,
          (
            SELECT count(*)::text
            FROM audit_event
            WHERE correlation_id = (
              SELECT correlation_id FROM catalog_sync_run WHERE id = $1::uuid
            )
              AND action = 'CATALOG_MEDIA_IMPORTED'
          ) AS media_audit_count,
          (
            SELECT audit_context->>'mediaBatchNumber'
            FROM catalog_sync_run
            WHERE id = $1::uuid
          ) AS media_batch_number,
          (
            SELECT safe_metadata->>'originalFilename'
            FROM catalog_sync_item
            WHERE sync_run_id = $1::uuid
              AND source_type = 'MEDIA'
              AND source_id = 'jobs-material-roller-1001:primary:1'
          ) AS media_metadata_filename,
          (
            SELECT count(*)::text
            FROM source_media_asset media
            JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid
              AND media.model_id IS NOT NULL
          ) AS model_media_count,
          (
            SELECT count(*)::text
            FROM source_media_asset media
            JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid
              AND media.system_id IS NOT NULL
          ) AS system_media_count,
          (
            SELECT count(*)::text
            FROM source_price_record
            WHERE catalog_source_id = '${catalogSourceId}'::uuid
              AND source_id = 'jobs-material-roller-1001'
          ) AS price_count,
          (
            SELECT count(*)::text
            FROM source_price_record price
            JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
            JOIN catalog_sync_run price_run ON price_run.id = item.sync_run_id
                                            AND price_run.source_version = price.source_version
            WHERE item.sync_run_id = $1::uuid
              AND num_nonnulls(price.material_variant_id, price.model_id) = 1
          ) AS exact_target_price_count,
          (
            SELECT count(*)::text
            FROM source_price_record price
            JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
            JOIN catalog_sync_run price_run ON price_run.id = item.sync_run_id
                                            AND price_run.source_version = price.source_version
            WHERE item.sync_run_id = $1::uuid AND price.model_id IS NOT NULL
          ) AS model_price_count,
          (
            SELECT count(*)::text
            FROM source_price_record price
            JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
            JOIN catalog_sync_run price_run ON price_run.id = item.sync_run_id
                                            AND price_run.source_version = price.source_version
            WHERE item.sync_run_id = $1::uuid
              AND price.status = 'PRICE_ON_REQUEST'
              AND price.amount_minor IS NULL
          ) AS price_on_request_count,
          (
            SELECT count(*)::text
            FROM price_version_record record
            JOIN price_version version ON version.id = record.price_version_id
            WHERE version.sync_run_id = $1::uuid
          ) AS price_version_record_count,
          (SELECT count(*)::text FROM audit_event WHERE target_id = $1::text) AS audit_count
      `,
      [syncRunId],
    );
    expect(Number(counts.rows[0]?.catalog_difference_count ?? '0')).toBeGreaterThan(0);
    expect(counts.rows[0]).toMatchObject({
      audit_count: '4',
      category_media_count: '1',
      catalog_version_count: '1',
      checkpoint_count: '8',
      exact_target_media_count: '4',
      exact_target_price_count: '2',
      import_manifest_complete: true,
      import_manifest_count: '1',
      material_count: '1',
      model_count: '1',
      media_asset_count: '1',
      media_audit_count: '4',
      media_batch_number: '2',
      media_metadata_filename: 'jobs-material-roller-1001.png',
      media_reference_count: '1',
      model_media_count: '1',
      model_price_count: '1',
      price_count: '1',
      price_on_request_count: '1',
      price_version_record_count: '2',
      price_version_count: '1',
      snapshot_count: '7',
      system_media_count: '1',
    });
  });

  it('resumes the same run from immutable snapshots after a retryable source interruption', async () => {
    let failNextPriceFetch = true;
    const fetchCounts = { material: 0, media: 0, model: 0, price: 0, system: 0 };
    class RetryOnceFixtureAdapter extends FixtureCatalogSourceAdapter {
      override async fetchMaterial(sourceId: string) {
        fetchCounts.material += 1;
        return super.fetchMaterial(sourceId);
      }

      override async fetchMediaManifest(sourceId: string) {
        fetchCounts.media += 1;
        return super.fetchMediaManifest(sourceId);
      }

      override async fetchModel(sourceId: string) {
        fetchCounts.model += 1;
        return super.fetchModel(sourceId);
      }

      override async fetchPrice(sourceId: string) {
        fetchCounts.price += 1;
        if (failNextPriceFetch) {
          failNextPriceFetch = false;
          throw new CatalogSourceError(
            'SOURCE_TRANSPORT_UNAVAILABLE',
            'Synthetic retryable source interruption.',
            { retryable: true },
          );
        }
        return super.fetchPrice(sourceId);
      }

      override async fetchProduct(sourceId: string) {
        fetchCounts.system += 1;
        return super.fetchProduct(sourceId);
      }
    }
    const resumableServices = createCatalogJobServices(
      () => new RetryOnceFixtureAdapter(createJobsCatalogFixture()),
      () => ({ maximumBytes: 1_048_576, objectStorage }),
    );
    const correlationId = `catalog-resume-${runTag}`;
    const syncRunId = await resumableServices.discoverSource(
      {
        catalogSourceId,
        correlationId,
        idempotencyKey: `catalog:test:${catalogSourceId}:${runTag}:resume`,
        schemaVersion: 1,
        trigger: 'TEST',
      },
      versionHelpers,
      new AbortController().signal,
    );
    const stagePayload = {
      catalogSourceId,
      correlationId,
      idempotencyKey: catalogStageIdempotencyKey(catalogJobIdentifiers.syncRun, syncRunId),
      schemaVersion: 1 as const,
      syncRunId,
    };
    await expect(
      resumableServices.synchronize(stagePayload, versionHelpers, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_SOURCE_UNAVAILABLE' });
    const interrupted = await pool.query<{ snapshot_count: string }>(
      'SELECT count(*)::text AS snapshot_count FROM source_snapshot WHERE sync_run_id = $1::uuid',
      [syncRunId],
    );
    expect(interrupted.rows[0]?.snapshot_count).toBe('4');

    await expect(
      resumableServices.synchronize(stagePayload, versionHelpers, new AbortController().signal),
    ).resolves.toBe('CAPTURED');
    const resumed = await pool.query<{
      completed_checkpoints: string;
      resume_count: string;
      snapshot_count: string;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM source_snapshot
           WHERE sync_run_id = $1::uuid) AS snapshot_count,
          (SELECT COALESCE(sum(resume_count), 0)::text FROM catalog_sync_checkpoint
           WHERE sync_run_id = $1::uuid) AS resume_count,
          (SELECT count(*)::text FROM catalog_sync_checkpoint
           WHERE sync_run_id = $1::uuid AND status = 'COMPLETED') AS completed_checkpoints
      `,
      [syncRunId],
    );
    expect(resumed.rows[0]).toEqual({
      completed_checkpoints: '8',
      resume_count: '4',
      snapshot_count: '7',
    });
    expect(fetchCounts).toEqual({ material: 1, media: 1, model: 1, price: 3, system: 1 });
  });

  it('durably cancels an in-flight run and seals retained evidence without a candidate', async () => {
    const correlationId = `catalog-cancel-${runTag}`;
    const syncRunId = await services.discoverSource(
      {
        catalogSourceId,
        correlationId,
        idempotencyKey: `catalog:test:${catalogSourceId}:${runTag}:cancel`,
        schemaVersion: 1,
        trigger: 'TEST',
      },
      versionHelpers,
      new AbortController().signal,
    );
    const command = {
      actorId: ownerActorId,
      catalogSourceId,
      correlationId,
      reason: 'Synthetic operator cancellation verification.',
      syncRunId,
    } as const;
    await expect(requestCatalogSyncCancellation(pool, command)).resolves.toBe('REQUESTED');
    await expect(requestCatalogSyncCancellation(pool, command)).resolves.toBe('ALREADY_REQUESTED');
    await expect(
      services.synchronize(
        {
          catalogSourceId,
          correlationId,
          idempotencyKey: catalogStageIdempotencyKey(catalogJobIdentifiers.syncRun, syncRunId),
          schemaVersion: 1,
          syncRunId,
        },
        versionHelpers,
        new AbortController().signal,
      ),
    ).resolves.toBe('CANCELLED');
    const state = await pool.query<{
      candidate_count: string;
      complete: boolean;
      manifest_status: string;
      run_status: string;
    }>(
      `
        SELECT run.status::text AS run_status,
               manifest.status::text AS manifest_status,
               manifest.complete,
               (
                 (SELECT count(*) FROM catalog_version WHERE sync_run_id = run.id) +
                 (SELECT count(*) FROM price_version WHERE sync_run_id = run.id)
               )::text AS candidate_count
        FROM catalog_sync_run run
        JOIN catalog_import_manifest manifest ON manifest.sync_run_id = run.id
        WHERE run.id = $1::uuid
      `,
      [syncRunId],
    );
    expect(state.rows[0]).toEqual({
      candidate_count: '0',
      complete: false,
      manifest_status: 'CANCELLED',
      run_status: 'CANCELLED',
    });
    await expect(
      pool.query(
        `UPDATE catalog_import_manifest SET complete = true WHERE sync_run_id = $1::uuid`,
        [syncRunId],
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      migrationPool.query(
        `UPDATE catalog_import_manifest SET complete = true WHERE sync_run_id = $1::uuid`,
        [syncRunId],
      ),
    ).rejects.toMatchObject({ code: '55000' });
  });

  it('seals a partial manifest when retryable capture exhausts its attempts', async () => {
    class UnavailablePriceFixtureAdapter extends FixtureCatalogSourceAdapter {
      override async fetchPrice(_sourceId: string): Promise<never> {
        throw new CatalogSourceError(
          'SOURCE_TRANSPORT_UNAVAILABLE',
          'Synthetic exhausted source interruption.',
          { retryable: true },
        );
      }
    }
    const failingServices = createCatalogJobServices(
      () => new UnavailablePriceFixtureAdapter(createJobsCatalogFixture()),
      () => ({ maximumBytes: 1_048_576, objectStorage }),
    );
    const correlationId = `catalog-permanent-failure-${runTag}`;
    const syncRunId = await failingServices.discoverSource(
      {
        catalogSourceId,
        correlationId,
        idempotencyKey: `catalog:test:${catalogSourceId}:${runTag}:permanent-failure`,
        schemaVersion: 1,
        trigger: 'TEST',
      },
      versionHelpers,
      new AbortController().signal,
    );
    const stagePayload = {
      catalogSourceId,
      correlationId,
      idempotencyKey: catalogStageIdempotencyKey(catalogJobIdentifiers.syncRun, syncRunId),
      schemaVersion: 1 as const,
      syncRunId,
    };
    await expect(
      failingServices.synchronize(stagePayload, versionHelpers, new AbortController().signal),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_SOURCE_UNAVAILABLE' });
    await failCatalogExecution(
      catalogJobIdentifiers.syncRun,
      stagePayload,
      versionHelpers,
      'CATALOG_PIPELINE_SOURCE_UNAVAILABLE',
    );
    const state = await pool.query<{
      candidate_count: string;
      complete: boolean;
      manifest_status: string;
      run_status: string;
    }>(
      `
        SELECT run.status::text AS run_status,
               manifest.status::text AS manifest_status,
               manifest.complete,
               (
                 (SELECT count(*) FROM catalog_version WHERE sync_run_id = run.id) +
                 (SELECT count(*) FROM price_version WHERE sync_run_id = run.id)
               )::text AS candidate_count
        FROM catalog_sync_run run
        JOIN catalog_import_manifest manifest ON manifest.sync_run_id = run.id
        WHERE run.id = $1::uuid
      `,
      [syncRunId],
    );
    expect(state.rows[0]).toEqual({
      candidate_count: '0',
      complete: false,
      manifest_status: 'PARTIAL_FAILED',
      run_status: 'FAILED',
    });
  });

  it('keeps owner overlays separate, composes them immutably and activates with distinct governance actors', async () => {
    if (firstSyncRunId === undefined) throw new Error('First catalog sync run is unavailable.');
    const release = await pool.query<{
      catalog_difference_checksum: string;
      catalog_version_id: string;
      price_difference_checksum: string;
      price_version_id: string;
    }>(
      `
        SELECT catalog.id::text AS catalog_version_id,
               catalog.difference_checksum AS catalog_difference_checksum,
               price.id::text AS price_version_id,
               price.difference_checksum AS price_difference_checksum
        FROM catalog_version catalog
        JOIN price_version price ON price.sync_run_id = catalog.sync_run_id
        WHERE catalog.sync_run_id = $1::uuid
      `,
      [firstSyncRunId],
    );
    const row = release.rows[0];
    if (row === undefined) throw new Error('Candidate versions are unavailable.');
    firstRelease = {
      catalogDifferenceChecksum: row.catalog_difference_checksum,
      catalogVersionId: row.catalog_version_id,
      priceDifferenceChecksum: row.price_difference_checksum,
      priceVersionId: row.price_version_id,
    };
    const command = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: row.catalog_version_id,
      correlationId: `catalog-publication-${runTag}`,
      expectedCatalogDifferenceChecksum: row.catalog_difference_checksum,
      expectedVariantCount: 1,
      syncRunId: firstSyncRunId,
    } as const;
    const publication = await management.publishPilot(command);
    expect(publication).toEqual({
      categoryCount: 1,
      mediaApprovedCount: 1,
      systemCount: 1,
      variantCount: 1,
    });
    await expect(management.publishPilot(command)).resolves.toEqual(publication);

    const business = await pool.query<{ entity_id: string; id: string }>(
      `SELECT id::text, material_variant_id::text AS entity_id
       FROM business_catalog_entry WHERE entity_type = 'MATERIAL_VARIANT'
       AND material_variant_id = (
         SELECT variant.id FROM material_variant variant
         JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
         WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MATERIAL_VARIANT'
         LIMIT 1
       )`,
      [firstSyncRunId],
    );
    const businessId = business.rows[0]?.id;
    const businessEntityId = business.rows[0]?.entity_id;
    if (businessId === undefined || businessEntityId === undefined) {
      throw new Error('Business overlay is unavailable.');
    }
    await management.setBusinessOverlay({
      actorId: ownerActorId,
      availabilityReason: 'Manager confirmation remains required.',
      availabilityStatus: 'INQUIRY_ONLY',
      correlationId: `catalog-bulk-preserved-fields-${runTag}`,
      entityId: businessEntityId,
      entityType: 'MATERIAL_VARIANT',
      localDescription: 'Owner description preserved by bulk local-state controls.',
      localOrder: 17,
      manualReviewState: 'APPROVED',
      ownerNotes: 'Owner note outside the bulk patch.',
      publicationReason: 'Owner retained reviewed publication.',
      publicationStatus: 'PUBLISHED',
      visibility: 'VISIBLE',
    });
    const overrideId = await management.setLocalPriceOverride({
      actorId: ownerActorId,
      amountMinor: 199_900,
      businessCatalogEntryId: businessId,
      correlationId: `catalog-override-${runTag}`,
      currency: 'RUB',
      effectiveFrom: '2026-08-03T00:00:00.000Z',
      reason: 'Synthetic integration override.',
    });
    const sourcePriceBeforeBulk = await pool.query<{ amount_minor: number }>(
      `SELECT amount_minor FROM source_price_record WHERE source_id = 'jobs-material-roller-1001'`,
    );
    expect(sourcePriceBeforeBulk.rows[0]?.amount_minor).toBe(150_000);
    const category = await pool.query<{ id: string }>(
      `SELECT category.id::text
       FROM product_category category
       JOIN catalog_sync_item item ON item.source_entity_id = category.source_entity_id
       WHERE item.sync_run_id = $1::uuid
       ORDER BY category.id LIMIT 1`,
      [firstSyncRunId],
    );
    const categoryId = category.rows[0]?.id;
    if (categoryId === undefined) throw new Error('Bulk category is unavailable.');

    const staleSelectedPreviewInput = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: row.catalog_version_id,
      correlationId: `catalog-bulk-selected-stale-preview-${runTag}`,
      expectedCatalogDifferenceChecksum: row.catalog_difference_checksum,
      patch: { availabilityStatus: 'AVAILABLE' as const },
      reason: 'Owner previewed one selected local availability update.',
      selector: {
        businessCatalogEntryIds: [businessId],
        mode: 'SELECTED' as const,
      },
      syncRunId: firstSyncRunId,
    };
    const staleSelectedPreview =
      await management.previewBusinessOverlayBulk(staleSelectedPreviewInput);
    expect(staleSelectedPreview).toMatchObject({ matchedCount: 1, targetCount: 1 });

    const categoryBulkInput = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: row.catalog_version_id,
      correlationId: `catalog-bulk-category-${runTag}`,
      expectedCatalogDifferenceChecksum: row.catalog_difference_checksum,
      patch: { availabilityStatus: 'OUT_OF_STOCK' as const },
      reason: 'Owner marked the exact category selection out of stock for review.',
      selector: { categoryId, mode: 'CATEGORY' as const },
      syncRunId: firstSyncRunId,
    };
    const categoryPreview = await management.previewBusinessOverlayBulk(categoryBulkInput);
    expect(categoryPreview).toMatchObject({ matchedCount: 1, targetCount: 1 });
    const categoryCommand = {
      ...categoryBulkInput,
      confirmation: categoryPreview.confirmation,
      expectedSelectionChecksum: categoryPreview.selectionChecksum,
      expectedTargetCount: categoryPreview.targetCount,
      idempotencyKey: `catalog:bulk:${runTag}:category-out-of-stock`,
    };
    const categoryResult = await management.applyBusinessOverlayBulk(categoryCommand);
    expect(categoryResult).toMatchObject({ matchedCount: 1, reused: false, targetCount: 1 });
    await expect(management.applyBusinessOverlayBulk(categoryCommand)).resolves.toEqual({
      ...categoryResult,
      reused: true,
    });
    await expect(
      management.applyBusinessOverlayBulk({
        ...categoryCommand,
        reason: 'A conflicting payload cannot reuse the completed command key.',
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_MANAGEMENT_CONFLICT' });
    await expect(
      management.applyBusinessOverlayBulk({
        ...staleSelectedPreviewInput,
        confirmation: staleSelectedPreview.confirmation,
        expectedSelectionChecksum: staleSelectedPreview.selectionChecksum,
        expectedTargetCount: staleSelectedPreview.targetCount,
        idempotencyKey: `catalog:bulk:${runTag}:stale-selected`,
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_MANAGEMENT_CONFLICT' });

    const filterBulkInput = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: row.catalog_version_id,
      correlationId: `catalog-bulk-filter-${runTag}`,
      expectedCatalogDifferenceChecksum: row.catalog_difference_checksum,
      patch: { manualReviewState: 'NEEDS_REVIEW' as const },
      reason: 'Owner moved the exact out-of-stock filter result back to review.',
      selector: {
        filter: { availabilityStatus: 'OUT_OF_STOCK' as const },
        mode: 'FILTER' as const,
      },
      syncRunId: firstSyncRunId,
    };
    const filterPreview = await management.previewBusinessOverlayBulk(filterBulkInput);
    const filterResult = await management.applyBusinessOverlayBulk({
      ...filterBulkInput,
      confirmation: filterPreview.confirmation,
      expectedSelectionChecksum: filterPreview.selectionChecksum,
      expectedTargetCount: filterPreview.targetCount,
      idempotencyKey: `catalog:bulk:${runTag}:filter-review`,
    });
    expect(filterResult).toMatchObject({ matchedCount: 1, reused: false, targetCount: 1 });

    const selectedRestoreInput = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: row.catalog_version_id,
      correlationId: `catalog-bulk-selected-restore-${runTag}`,
      expectedCatalogDifferenceChecksum: row.catalog_difference_checksum,
      patch: {
        availabilityStatus: 'INQUIRY_ONLY' as const,
        manualReviewState: 'APPROVED' as const,
      },
      reason: 'Owner restored the selected local entry after explicit review.',
      selector: {
        businessCatalogEntryIds: [businessId],
        mode: 'SELECTED' as const,
      },
      syncRunId: firstSyncRunId,
    };
    const selectedRestorePreview =
      await management.previewBusinessOverlayBulk(selectedRestoreInput);
    const selectedRestoreResult = await management.applyBusinessOverlayBulk({
      ...selectedRestoreInput,
      confirmation: selectedRestorePreview.confirmation,
      expectedSelectionChecksum: selectedRestorePreview.selectionChecksum,
      expectedTargetCount: selectedRestorePreview.targetCount,
      idempotencyKey: `catalog:bulk:${runTag}:selected-restore`,
    });
    expect(selectedRestoreResult).toMatchObject({
      matchedCount: 1,
      reused: false,
      targetCount: 1,
    });

    await expect(
      management.previewBusinessOverlayBulk({
        ...selectedRestoreInput,
        actorId: adminActorId,
        correlationId: `catalog-bulk-admin-denied-${runTag}`,
        patch: { visibility: 'HIDDEN' },
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_MANAGEMENT_AUTHORIZATION' });
    await expect(
      management.previewBusinessOverlayBulk({
        ...selectedRestoreInput,
        correlationId: `catalog-bulk-partial-selection-${runTag}`,
        selector: {
          businessCatalogEntryIds: [businessId, randomUUID()],
          mode: 'SELECTED',
        },
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_MANAGEMENT_NOT_FOUND' });

    const bulkEvidence = await pool.query<{
      action_count: string;
      availability_status: string;
      command_count: string;
      local_description: string;
      local_order: number;
      manual_review_state: string;
      owner_notes: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM catalog_bulk_command
          WHERE catalog_version_id = $1::uuid) AS command_count,
         (SELECT count(*)::text FROM audit_event
          WHERE action = 'CATALOG_BUSINESS_BULK_APPLIED'
            AND target_type = 'CATALOG_BULK_COMMAND') AS action_count,
         (SELECT status::text FROM availability_record
          WHERE business_catalog_entry_id = $2::uuid AND ended_at IS NULL
          ORDER BY created_at DESC LIMIT 1) AS availability_status,
         (SELECT manual_review_state::text FROM business_catalog_entry
          WHERE id = $2::uuid) AS manual_review_state,
         (SELECT local_description FROM business_catalog_entry
          WHERE id = $2::uuid) AS local_description,
         (SELECT local_order FROM business_catalog_entry
          WHERE id = $2::uuid) AS local_order,
         (SELECT owner_notes FROM business_catalog_entry
          WHERE id = $2::uuid) AS owner_notes`,
      [row.catalog_version_id, businessId],
    );
    expect(bulkEvidence.rows[0]).toEqual({
      action_count: '3',
      availability_status: 'INQUIRY_ONLY',
      command_count: '3',
      local_description: 'Owner description preserved by bulk local-state controls.',
      local_order: 17,
      manual_review_state: 'APPROVED',
      owner_notes: 'Owner note outside the bulk patch.',
    });
    await expect(
      pool.query(
        `UPDATE catalog_bulk_command SET safe_reason = 'forbidden runtime mutation'
         WHERE id = $1::uuid`,
        [categoryResult.commandId],
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      migrationPool.query(
        `UPDATE catalog_bulk_command SET safe_reason = 'forbidden owner mutation'
         WHERE id = $1::uuid`,
        [categoryResult.commandId],
      ),
    ).rejects.toMatchObject({ code: '55000' });

    const priceLayersAfterBulk = await pool.query<{
      amount_minor: number;
      override_amount_minor: number;
      override_status: string;
    }>(
      `SELECT source.amount_minor,
              override_row.amount_minor AS override_amount_minor,
              override_row.status::text AS override_status
       FROM source_price_record source
       JOIN local_price_override override_row ON override_row.id = $1::uuid
       WHERE source.source_id = 'jobs-material-roller-1001'`,
      [overrideId],
    );
    expect(priceLayersAfterBulk.rows[0]).toEqual({
      amount_minor: 150_000,
      override_amount_minor: 199_900,
      override_status: 'ACTIVE',
    });
    await management.removeLocalPriceOverride({
      actorId: ownerActorId,
      businessCatalogEntryId: businessId,
      correlationId: `catalog-override-remove-${runTag}`,
      reason: 'Synthetic override recovery.',
    });
    const removedOverride = await pool.query<{ status: string }>(
      'SELECT status::text FROM local_price_override WHERE id = $1::uuid',
      [overrideId],
    );
    expect(removedOverride.rows[0]?.status).toBe('REMOVED');

    const composition = await management.composeCatalogVersion(command);
    expect(composition).toMatchObject({ entryCount: 3, reused: false, variantCount: 1 });
    await expect(
      management.previewBusinessOverlayBulk({
        ...categoryBulkInput,
        correlationId: `catalog-bulk-frozen-candidate-${runTag}`,
        patch: { visibility: 'HIDDEN' },
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_MANAGEMENT_CONFLICT' });
    await expect(management.composeCatalogVersion(command)).resolves.toMatchObject({
      differenceChecksum: composition.differenceChecksum,
      reused: true,
    });
    firstRelease = {
      ...firstRelease,
      catalogDifferenceChecksum: composition.differenceChecksum,
    };
    await reviewCatalogDifferences(
      {
        catalogSourceId,
        catalogVersionId: row.catalog_version_id,
        correlationId: `catalog-review-all-${runTag}`,
        differenceIds: [],
        expectedDifferenceChecksum: composition.differenceChecksum,
        idempotencyKey: `catalog:review:${runTag}:fixture-catalog-all`,
        resolution: 'APPROVED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner accepted every catalog difference in the exact fixture candidate.',
        schemaVersion: 1,
        scope: 'CATALOG',
        selectionMode: 'ALL',
        syncRunId: firstSyncRunId,
      },
      versionHelpers,
    );
    await reviewCatalogDifferences(
      {
        catalogSourceId,
        correlationId: `price-review-all-${runTag}`,
        differenceIds: [],
        expectedDifferenceChecksum: row.price_difference_checksum,
        idempotencyKey: `catalog:review:${runTag}:fixture-price-all`,
        priceVersionId: row.price_version_id,
        resolution: 'APPROVED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner accepted every price difference in the exact fixture candidate.',
        schemaVersion: 1,
        scope: 'PRICE',
        selectionMode: 'ALL',
        syncRunId: firstSyncRunId,
      },
      versionHelpers,
    );
    const adminOverview = await catalogRead.getAdminOverview();
    const adminRelease = adminOverview.releases.find(
      (release) => release.syncRunId === firstSyncRunId,
    );
    expect(adminRelease?.bulkCommandCount).toBe(3);
    expect(adminRelease?.catalogUnapprovedDifferenceCount).toBe(0);
    expect(adminRelease?.compositionCount).toBe(3);
    expect(adminRelease?.manifest).toMatchObject({
      complete: true,
      counts: {
        categories: 1,
        materialVariants: 1,
        models: 1,
        systems: 1,
      },
      status: 'COMPLETE',
    });
    expect(adminRelease?.priceUnapprovedDifferenceCount).toBe(0);
    expect(adminRelease?.publicationPrepared).toBe(true);
    expect(adminRelease?.reviewBatchCount).toBe(2);
    expect(adminRelease?.variantCount).toBe(1);
    expect(adminOverview.summary).toMatchObject({
      categoryCount: 1,
      materialVariantCount: 1,
      modelCount: 1,
      sourceRemovedCount: 0,
      systemCount: 1,
    });
    expect(
      adminOverview.runs.find((run) => run.id === firstSyncRunId)?.stages.length,
    ).toBeGreaterThanOrEqual(8);
    expect(adminOverview.reviewHistory).toHaveLength(2);
    expect(adminOverview.bulkHistory).toHaveLength(3);

    const adminVariants = await catalogRead.listAdminVariants({
      availability: 'INQUIRY_ONLY',
      media: 'READY',
      price: 'AVAILABLE',
      publication: 'PUBLISHED',
      review: 'APPROVED',
      sourceStatus: 'ACTIVE',
      visibility: 'VISIBLE',
    });
    expect(adminVariants).toMatchObject({
      limit: 50,
      offset: 0,
      total: 1,
    });
    expect(adminVariants.items[0]).toMatchObject({
      categoryPath: 'Рулонные ткани',
      sourcePriceStatus: 'AVAILABLE',
    });
    const adminCategoryId = adminVariants.categories[0]?.id;
    if (adminCategoryId === undefined) throw new Error('Admin category facet is unavailable.');
    await expect(
      catalogRead.listAdminVariants({ categoryId: adminCategoryId, limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ total: 1 });

    await expect(
      catalogRead.listAdminDifferences({
        limit: 1,
        offset: 0,
        scope: 'PRICE',
        syncRunId: firstSyncRunId,
      }),
    ).resolves.toMatchObject({ limit: 1, offset: 0, total: 2 });
    await expect(
      pool.query(
        `UPDATE catalog_difference_review_batch SET safe_reason = 'forbidden runtime mutation'
         WHERE idempotency_key = $1`,
        [`catalog:review:${runTag}:fixture-catalog-all`],
      ),
    ).rejects.toMatchObject({ code: '42501' });
    await expect(
      migrationPool.query(
        `UPDATE catalog_difference_review_batch SET safe_reason = 'forbidden owner mutation'
         WHERE idempotency_key = $1`,
        [`catalog:review:${runTag}:fixture-catalog-all`],
      ),
    ).rejects.toMatchObject({ code: '55000' });
    await approveCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        approvalReason: 'Owner reviewed the exact fixture catalog composition.',
        catalogSourceId,
        catalogVersionId: row.catalog_version_id,
        correlationId: `catalog-approval-catalog-${runTag}`,
        expectedCatalogDifferenceChecksum: composition.differenceChecksum,
        idempotencyKey: `catalog:approval:${runTag}:fixture-catalog`,
        schemaVersion: 1,
        syncRunId: firstSyncRunId,
      },
      versionHelpers,
    );
    await expect(
      activateCatalogVersions(
        {
          activatedByActorId: adminActorId,
          activationReason: 'This pair must remain inactive until both candidates are approved.',
          catalogSourceId,
          catalogVersionId: row.catalog_version_id,
          correlationId: `catalog-activation-blocked-${runTag}`,
          expectedCatalogDifferenceChecksum: composition.differenceChecksum,
          expectedPriceDifferenceChecksum: row.price_difference_checksum,
          idempotencyKey: `catalog:activation:${runTag}:fixture-blocked-pair`,
          priceVersionId: row.price_version_id,
          schemaVersion: 1,
          syncRunId: firstSyncRunId,
        },
        versionHelpers,
      ),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_VERSION_CONFLICT' });
    const blockedPair = await pool.query<{
      catalog_active: string;
      catalog_status: string;
      price_active: string;
      price_status: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM catalog_version WHERE activation_key = 'PUBLIC')
           AS catalog_active,
         (SELECT status::text FROM catalog_version WHERE id = $1::uuid) AS catalog_status,
         (SELECT count(*)::text FROM price_version WHERE activation_key = 'PUBLIC')
           AS price_active,
         (SELECT status::text FROM price_version WHERE id = $2::uuid) AS price_status`,
      [row.catalog_version_id, row.price_version_id],
    );
    expect(blockedPair.rows[0]).toEqual({
      catalog_active: '0',
      catalog_status: 'APPROVED',
      price_active: '0',
      price_status: 'AWAITING_APPROVAL',
    });
    await approveCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        approvalReason: 'Owner reviewed the exact fixture price candidate.',
        catalogSourceId,
        correlationId: `catalog-approval-price-${runTag}`,
        expectedPriceDifferenceChecksum: row.price_difference_checksum,
        idempotencyKey: `catalog:approval:${runTag}:fixture-price`,
        priceVersionId: row.price_version_id,
        schemaVersion: 1,
        syncRunId: firstSyncRunId,
      },
      versionHelpers,
    );
    await activateCatalogVersions(
      {
        activatedByActorId: adminActorId,
        activationReason: 'Administrator activated the approved fixture release.',
        catalogSourceId,
        catalogVersionId: row.catalog_version_id,
        correlationId: `catalog-activation-${runTag}`,
        expectedCatalogDifferenceChecksum: composition.differenceChecksum,
        expectedPriceDifferenceChecksum: row.price_difference_checksum,
        idempotencyKey: `catalog:activation:${runTag}:fixture-release`,
        priceVersionId: row.price_version_id,
        schemaVersion: 1,
        syncRunId: firstSyncRunId,
      },
      versionHelpers,
    );
    const active = await pool.query<{ catalog_active: string; price_active: string }>(`
      SELECT
        (SELECT count(*)::text FROM catalog_version WHERE activation_key = 'PUBLIC')
          AS catalog_active,
        (SELECT count(*)::text FROM price_version WHERE activation_key = 'PUBLIC')
          AS price_active
    `);
    expect(active.rows[0]).toEqual({ catalog_active: '1', price_active: '1' });
  });

  it('does not duplicate normalized identities or immutable source prices on a repeat import', async () => {
    if (firstSyncRunId === undefined) throw new Error('First catalog sync run is unavailable.');
    const repeatSyncRunId = await runPipeline('pipeline-002', firstSyncRunId, 'COMPLETED');
    const counts = await pool.query<{
      material_count: string;
      media_asset_count: string;
      media_link_count: string;
      price_count: string;
      source_identity_count: string;
      version_count: string;
    }>(
      `
      SELECT
        (
          SELECT count(*)::text
          FROM material_variant variant
          JOIN source_entity source ON source.id = variant.source_entity_id
          WHERE source.catalog_source_id = '${catalogSourceId}'::uuid
            AND source.source_id = 'jobs-material-roller-1001'
        ) AS material_count,
        (
          SELECT count(DISTINCT asset.id)::text
          FROM media_asset asset
          JOIN source_media_asset source_media ON source_media.media_asset_id = asset.id
          WHERE source_media.catalog_source_id = '${catalogSourceId}'::uuid
            AND source_media.source_id = 'jobs-material-roller-1001:primary:1'
        ) AS media_asset_count,
        (
          SELECT count(*)::text
          FROM material_media_asset material_media
          JOIN source_media_asset source_media ON source_media.id = material_media.source_media_asset_id
          WHERE source_media.catalog_source_id = '${catalogSourceId}'::uuid
            AND source_media.source_id = 'jobs-material-roller-1001:primary:1'
        ) AS media_link_count,
        (
          SELECT count(*)::text
          FROM source_price_record
          WHERE catalog_source_id = '${catalogSourceId}'::uuid
        ) AS price_count,
        (
          SELECT count(*)::text
          FROM source_entity
          WHERE catalog_source_id = '${catalogSourceId}'::uuid
            AND source_type = 'MATERIAL_VARIANT'
            AND source_id = 'jobs-material-roller-1001'
        ) AS source_identity_count,
        ((
          SELECT count(*) FROM catalog_version
          WHERE sync_run_id IN ($1::uuid, $2::uuid)
        ) + (
          SELECT count(*) FROM price_version
          WHERE sync_run_id IN ($1::uuid, $2::uuid)
        ))::text AS version_count
    `,
      [firstSyncRunId, repeatSyncRunId],
    );
    expect(counts.rows[0]).toEqual({
      material_count: '1',
      media_asset_count: '1',
      media_link_count: '1',
      price_count: '2',
      source_identity_count: '1',
      version_count: '2',
    });
  });

  it('versions full model and material prices without changing an active local override', async () => {
    if (firstSyncRunId === undefined || firstRelease === undefined) {
      throw new Error('First active release is unavailable.');
    }
    const business = await pool.query<{ id: string }>(
      `
        SELECT id::text
        FROM business_catalog_entry
        WHERE entity_type = 'MATERIAL_VARIANT'
        ORDER BY created_at
        LIMIT 1
      `,
    );
    const businessCatalogEntryId = business.rows[0]?.id;
    if (businessCatalogEntryId === undefined) {
      throw new Error('Business overlay is unavailable.');
    }
    const overrideId = await management.setLocalPriceOverride({
      actorId: ownerActorId,
      amountMinor: 199_900,
      businessCatalogEntryId,
      correlationId: `catalog-price-override-${runTag}`,
      currency: 'RUB',
      effectiveFrom: '2026-08-03T00:00:00.000Z',
      reason: 'Synthetic price-sync overlay persistence verification.',
    });
    const priceServices = createCatalogJobServices(
      () => new FixtureCatalogSourceAdapter(priceChangedJobsCatalogFixture()),
      () => ({ maximumBytes: 1_048_576, objectStorage }),
    );
    const syncRunId = await runPipeline(
      'pipeline-002-price-changed',
      firstSyncRunId,
      'AWAITING_APPROVAL',
      priceServices,
    );

    const candidate = await pool.query<{
      catalog_version_count: string;
      price_difference_checksum: string;
      price_version_id: string;
      price_version_count: string;
      price_version_record_count: string;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM catalog_version
           WHERE sync_run_id = $1::uuid) AS catalog_version_count,
          (SELECT count(*)::text FROM price_version
           WHERE sync_run_id = $1::uuid) AS price_version_count,
          (SELECT count(*)::text FROM price_version_record record
           JOIN price_version version ON version.id = record.price_version_id
           WHERE version.sync_run_id = $1::uuid) AS price_version_record_count,
          (SELECT id::text FROM price_version
           WHERE sync_run_id = $1::uuid) AS price_version_id,
          (SELECT difference_checksum FROM price_version
           WHERE sync_run_id = $1::uuid) AS price_difference_checksum
      `,
      [syncRunId],
    );
    expect(candidate.rows[0]).toMatchObject({
      catalog_version_count: '0',
      price_version_count: '1',
      price_version_record_count: '2',
    });
    const priceCandidate = candidate.rows[0];
    if (priceCandidate === undefined) throw new Error('Price candidate is unavailable.');

    const priceRows = await pool.query<{
      amount_minor: number | null;
      kind: string;
      source_id: string;
      source_price_category: string | null;
      source_version: string;
      status: string;
      target_type: string;
    }>(
      `
        SELECT price.source_id, price.source_version, price.status::text,
               price.kind::text, price.amount_minor, price.source_price_category,
               CASE WHEN price.material_variant_id IS NOT NULL
                    THEN 'MATERIAL_VARIANT' ELSE 'MODEL' END AS target_type
        FROM source_price_record price
        WHERE price.catalog_source_id = $1::uuid
          AND price.source_version = 'jobs-fixture-v3'
        ORDER BY price.source_id
      `,
      [catalogSourceId],
    );
    expect(priceRows.rows).toEqual([
      {
        amount_minor: 175_000,
        kind: 'FROM',
        source_id: 'jobs-material-roller-1001',
        source_price_category: '1',
        source_version: 'jobs-fixture-v3',
        status: 'AVAILABLE',
        target_type: 'MATERIAL_VARIANT',
      },
      {
        amount_minor: 249_900,
        kind: 'BASE',
        source_id: 'jobs-model-roller-ready-1001',
        source_price_category: 'Готовые изделия',
        source_version: 'jobs-fixture-v3',
        status: 'AVAILABLE',
        target_type: 'MODEL',
      },
    ]);

    const differences = await pool.query<{
      absolute_change_minor: number | null;
      after_status: string;
      id: string;
      new_price_minor: number | null;
      old_price_minor: number | null;
      percentage_change: string | null;
      source_id: string;
    }>(
      `
        SELECT difference.id::text, source.source_id,
               difference.old_price_minor, difference.new_price_minor,
               difference.absolute_change_minor,
               difference.percentage_change::text,
               difference.after_value #>> '{attachment,status}' AS after_status
        FROM catalog_sync_difference difference
        JOIN source_entity source ON source.id = difference.source_entity_id
        WHERE difference.sync_run_id = $1::uuid
          AND difference.type = 'PRICE_CHANGED'
        ORDER BY source.source_id
      `,
      [syncRunId],
    );
    expect(differences.rows).toMatchObject([
      {
        absolute_change_minor: 25_000,
        after_status: 'AVAILABLE',
        new_price_minor: 175_000,
        old_price_minor: 150_000,
        percentage_change: '16.6667',
        source_id: 'jobs-material-roller-1001',
      },
      {
        absolute_change_minor: null,
        after_status: 'AVAILABLE',
        new_price_minor: 249_900,
        old_price_minor: null,
        percentage_change: null,
        source_id: 'jobs-model-roller-ready-1001',
      },
    ]);

    const firstDifferenceId = differences.rows[0]?.id;
    if (firstDifferenceId === undefined) throw new Error('Price difference is unavailable.');
    const deferred = await reviewCatalogDifferences(
      {
        catalogSourceId,
        correlationId: `price-review-defer-${runTag}`,
        differenceIds: [firstDifferenceId],
        expectedDifferenceChecksum: priceCandidate.price_difference_checksum,
        idempotencyKey: `catalog:review:${runTag}:price-selected-defer`,
        priceVersionId: priceCandidate.price_version_id,
        resolution: 'DEFERRED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner deferred one price difference for an explicit second look.',
        schemaVersion: 1,
        scope: 'PRICE',
        selectionMode: 'SELECTED',
        syncRunId,
      },
      versionHelpers,
    );
    await expect(
      reviewCatalogDifferences(
        {
          catalogSourceId,
          correlationId: `price-review-defer-${runTag}`,
          differenceIds: [firstDifferenceId],
          expectedDifferenceChecksum: priceCandidate.price_difference_checksum,
          idempotencyKey: `catalog:review:${runTag}:price-selected-defer`,
          priceVersionId: priceCandidate.price_version_id,
          resolution: 'DEFERRED',
          reviewedByActorId: ownerActorId,
          reviewReason: 'Owner deferred one price difference for an explicit second look.',
          schemaVersion: 1,
          scope: 'PRICE',
          selectionMode: 'SELECTED',
          syncRunId,
        },
        versionHelpers,
      ),
    ).resolves.toEqual(deferred);
    await expect(
      approveCatalogVersions(
        {
          approvedByActorId: ownerActorId,
          approvalReason: 'This approval must remain blocked while review is incomplete.',
          catalogSourceId,
          correlationId: `price-approval-blocked-${runTag}`,
          expectedPriceDifferenceChecksum: priceCandidate.price_difference_checksum,
          idempotencyKey: `catalog:approval:${runTag}:price-blocked`,
          priceVersionId: priceCandidate.price_version_id,
          schemaVersion: 1,
          syncRunId,
        },
        versionHelpers,
      ),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_VERSION_NOT_READY' });
    await reviewCatalogDifferences(
      {
        catalogSourceId,
        correlationId: `price-review-reject-${runTag}`,
        differenceIds: [firstDifferenceId],
        expectedDifferenceChecksum: priceCandidate.price_difference_checksum,
        idempotencyKey: `catalog:review:${runTag}:price-selected-reject`,
        priceVersionId: priceCandidate.price_version_id,
        resolution: 'REJECTED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner recorded a rejected selected price decision before reconsideration.',
        schemaVersion: 1,
        scope: 'PRICE',
        selectionMode: 'SELECTED',
        syncRunId,
      },
      versionHelpers,
    );
    const accepted = await reviewCatalogDifferences(
      {
        catalogSourceId,
        correlationId: `price-review-accept-${runTag}`,
        differenceIds: [],
        expectedDifferenceChecksum: priceCandidate.price_difference_checksum,
        idempotencyKey: `catalog:review:${runTag}:price-all-accept`,
        priceVersionId: priceCandidate.price_version_id,
        resolution: 'APPROVED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner accepted the complete price diff after reconsideration.',
        schemaVersion: 1,
        scope: 'PRICE',
        selectionMode: 'ALL',
        syncRunId,
      },
      versionHelpers,
    );
    expect(accepted).toMatchObject({ affectedCount: 2, remainingUnapprovedCount: 0 });
    await approveCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        approvalReason: 'Owner approved the exact fully reviewed price candidate.',
        catalogSourceId,
        correlationId: `price-approval-${runTag}`,
        expectedPriceDifferenceChecksum: priceCandidate.price_difference_checksum,
        idempotencyKey: `catalog:approval:${runTag}:price-release`,
        priceVersionId: priceCandidate.price_version_id,
        schemaVersion: 1,
        syncRunId,
      },
      versionHelpers,
    );
    await activateCatalogVersions(
      {
        activatedByActorId: adminActorId,
        activationReason: 'Administrator activated the reviewed price candidate.',
        catalogSourceId,
        correlationId: `price-activation-${runTag}`,
        expectedPriceDifferenceChecksum: priceCandidate.price_difference_checksum,
        idempotencyKey: `catalog:activation:${runTag}:price-release`,
        priceVersionId: priceCandidate.price_version_id,
        schemaVersion: 1,
        syncRunId,
      },
      versionHelpers,
    );
    await rollbackCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        catalogSourceId,
        correlationId: `price-rollback-${runTag}`,
        expectedActivePriceVersionId: priceCandidate.price_version_id,
        idempotencyKey: `catalog:rollback:${runTag}:price-release`,
        priceRollbackTargetId: firstRelease.priceVersionId,
        rollbackReason: 'Restore the compatible verified price predecessor.',
        rolledBackByActorId: adminActorId,
        schemaVersion: 1,
      },
      versionHelpers,
    );

    const override = await pool.query<{ amount_minor: number; status: string }>(
      `SELECT amount_minor, status::text FROM local_price_override WHERE id = $1::uuid`,
      [overrideId],
    );
    expect(override.rows[0]).toEqual({ amount_minor: 199_900, status: 'ACTIVE' });
    await management.removeLocalPriceOverride({
      actorId: ownerActorId,
      businessCatalogEntryId,
      correlationId: `catalog-price-override-remove-${runTag}`,
      reason: 'Synthetic price-sync overlay cleanup.',
    });
  });

  it('activates a changed catalog candidate and atomically rolls back to the verified predecessor', async () => {
    if (firstSyncRunId === undefined || firstRelease === undefined) {
      throw new Error('First active release is unavailable.');
    }
    const localTarget = await pool.query<{ id: string }>(
      `SELECT id::text FROM material_variant ORDER BY created_at LIMIT 1`,
    );
    const localTargetId = localTarget.rows[0]?.id;
    if (localTargetId === undefined) throw new Error('Local overlay target is unavailable.');
    await management.setBusinessOverlay({
      actorId: ownerActorId,
      availabilityReason: 'Manager confirmation remains required after every source sync.',
      availabilityStatus: 'INQUIRY_ONLY',
      correlationId: `catalog-overlay-persistence-${runTag}`,
      entityId: localTargetId,
      entityType: 'MATERIAL_VARIANT',
      localDescription: 'Owner-authored description that the source sync must preserve.',
      localOrder: 41,
      manualReviewState: 'APPROVED',
      ownerNotes: 'Owner-only note retained outside AMIGO authority.',
      publicationReason: 'Keep the reviewed local material visible.',
      publicationStatus: 'PUBLISHED',
      visibility: 'VISIBLE',
    });
    const changedServices = createCatalogJobServices(
      () => new FixtureCatalogSourceAdapter(changedJobsCatalogFixture()),
      () => ({ maximumBytes: 1_048_576, objectStorage }),
    );
    const changedRunId = await runPipeline(
      'pipeline-003-changed',
      firstSyncRunId,
      'AWAITING_APPROVAL',
      changedServices,
    );
    const candidate = await pool.query<{
      difference_checksum: string;
      id: string;
    }>('SELECT id::text, difference_checksum FROM catalog_version WHERE sync_run_id = $1::uuid', [
      changedRunId,
    ]);
    const changed = candidate.rows[0];
    if (changed === undefined) throw new Error('Changed candidate is unavailable.');
    const command = {
      actorId: ownerActorId,
      catalogSourceId,
      catalogVersionId: changed.id,
      correlationId: `catalog-changed-publication-${runTag}`,
      expectedCatalogDifferenceChecksum: changed.difference_checksum,
      expectedVariantCount: 1,
      syncRunId: changedRunId,
    } as const;
    await management.publishPilot(command);
    const composition = await management.composeCatalogVersion(command);
    const preserved = await pool.query<{
      availability_status: string;
      local_description: string;
      local_order: number;
      owner_notes: string;
      publication_status: string;
      visibility: string;
    }>(
      `
        SELECT business.visibility::text, business.local_description,
               business.local_order, business.owner_notes,
               availability.status::text AS availability_status,
               publication.status::text AS publication_status
        FROM business_catalog_entry business
        JOIN availability_record availability
          ON availability.business_catalog_entry_id = business.id
         AND availability.ended_at IS NULL
        JOIN publication_record publication
          ON publication.business_catalog_entry_id = business.id
         AND publication.ended_at IS NULL
        WHERE business.material_variant_id = $1::uuid
      `,
      [localTargetId],
    );
    expect(preserved.rows[0]).toEqual({
      availability_status: 'INQUIRY_ONLY',
      local_description: 'Owner-authored description that the source sync must preserve.',
      local_order: 41,
      owner_notes: 'Owner-only note retained outside AMIGO authority.',
      publication_status: 'PUBLISHED',
      visibility: 'VISIBLE',
    });
    await reviewCatalogDifferences(
      {
        catalogSourceId,
        catalogVersionId: changed.id,
        correlationId: `catalog-changed-review-${runTag}`,
        differenceIds: [],
        expectedDifferenceChecksum: composition.differenceChecksum,
        idempotencyKey: `catalog:review:${runTag}:changed-catalog-all`,
        resolution: 'APPROVED',
        reviewedByActorId: ownerActorId,
        reviewReason: 'Owner accepted every changed catalog difference.',
        schemaVersion: 1,
        scope: 'CATALOG',
        selectionMode: 'ALL',
        syncRunId: changedRunId,
      },
      versionHelpers,
    );
    await approveCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        approvalReason: 'Owner reviewed the changed fixture diff.',
        catalogSourceId,
        catalogVersionId: changed.id,
        correlationId: `catalog-changed-approval-${runTag}`,
        expectedCatalogDifferenceChecksum: composition.differenceChecksum,
        idempotencyKey: `catalog:approval:${runTag}:changed-release`,
        schemaVersion: 1,
        syncRunId: changedRunId,
      },
      versionHelpers,
    );
    await activateCatalogVersions(
      {
        activatedByActorId: adminActorId,
        activationReason: 'Administrator activated the changed fixture release.',
        catalogSourceId,
        catalogVersionId: changed.id,
        correlationId: `catalog-changed-activation-${runTag}`,
        expectedCatalogDifferenceChecksum: composition.differenceChecksum,
        idempotencyKey: `catalog:activation:${runTag}:changed-release`,
        schemaVersion: 1,
        syncRunId: changedRunId,
      },
      versionHelpers,
    );
    await rollbackCatalogVersions(
      {
        approvedByActorId: ownerActorId,
        catalogRollbackTargetId: firstRelease.catalogVersionId,
        catalogSourceId,
        correlationId: `catalog-rollback-${runTag}`,
        expectedActiveCatalogVersionId: changed.id,
        idempotencyKey: `catalog:rollback:${runTag}:changed-release`,
        rollbackReason: 'Synthetic post-activation recovery verification.',
        rolledBackByActorId: adminActorId,
        schemaVersion: 1,
      },
      versionHelpers,
    );
    const rollback = await pool.query<{ active_id: string; changed_status: string }>(
      `
        SELECT
          (SELECT id::text FROM catalog_version WHERE activation_key = 'PUBLIC') AS active_id,
          (SELECT status::text FROM catalog_version WHERE id = $1::uuid) AS changed_status
      `,
      [changed.id],
    );
    expect(rollback.rows[0]).toEqual({
      active_id: firstRelease.catalogVersionId,
      changed_status: 'SUPERSEDED',
    });
  });

  it('fails closed before diff when a previously linked private media object is missing', async () => {
    if (firstSyncRunId === undefined) throw new Error('First catalog sync run is unavailable.');
    const missingObjectStorage: CatalogMediaStoragePort = {
      async head() {
        const error = Object.assign(new Error('Synthetic linked object is missing.'), {
          code: 'STORAGE_NOT_FOUND' as const,
        });
        error.name = 'StorageError';
        throw error;
      },
      put: (input) => objectStorage.put(input),
    };
    const missingObjectServices = createCatalogJobServices(
      () => new FixtureCatalogSourceAdapter(createJobsCatalogFixture()),
      () => ({
        maximumBytes: 1_048_576,
        maximumItemsPerBatch: 2,
        objectStorage: missingObjectStorage,
      }),
    );

    const failedRunId = await runPipeline(
      'pipeline-004-missing-linked-media',
      firstSyncRunId,
      'IMPORTING_MEDIA',
      missingObjectServices,
    );
    const evidence = await pool.query<{
      catalog_version_count: string;
      error_code: string | null;
      manifest_status: string | null;
    }>(
      `
        SELECT
          run.error_code,
          manifest.status::text AS manifest_status,
          (SELECT count(*)::text FROM catalog_version WHERE sync_run_id = run.id)
            AS catalog_version_count
        FROM catalog_sync_run run
        LEFT JOIN catalog_import_manifest manifest ON manifest.sync_run_id = run.id
        WHERE run.id = $1::uuid
      `,
      [failedRunId],
    );
    expect(evidence.rows[0]).toEqual({
      catalog_version_count: '0',
      error_code: null,
      manifest_status: null,
    });
  });
});
