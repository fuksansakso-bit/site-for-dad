import { randomUUID } from 'node:crypto';

import { FixtureCatalogSourceAdapter } from '@project-name/catalog';
import {
  parseDatabaseEnvironment,
  parseWorkerEnvironment,
  type WorkerEnvironment,
} from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  createFoundationJobPool,
  enqueueCatalogSourceDiscovery,
  runFoundationJobsOnce,
  verifyFoundationQueueSchema,
} from '../../src/adapter.js';
import type { CatalogTaskLifecycleEvent } from '../../src/catalog/task.js';
import { createCatalogJobServices } from '../../src/catalog/services.js';
import {
  createJobsCatalogFixture,
  createMemoryCatalogStorage,
} from '../support/catalog-fixture.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const runTag = randomUUID().slice(0, 8);
const databaseEnvironment = parseDatabaseEnvironment(process.env);
const workerEnvironment: WorkerEnvironment = {
  ...parseWorkerEnvironment(process.env),
  WORKER_JOB_TIMEOUT_MS: 5_000,
};
const pool = createFoundationJobPool(databaseEnvironment, 4);
const objectStorage = createMemoryCatalogStorage();
const services = createCatalogJobServices(
  () => new FixtureCatalogSourceAdapter(createJobsCatalogFixture()),
  () => ({ maximumBytes: 1_048_576, objectStorage }),
);

async function runPipeline(
  idempotencySuffix: string,
  retryOfSyncRunId?: string,
  expectedStatus: 'AWAITING_APPROVAL' | 'COMPLETED' = 'AWAITING_APPROVAL',
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
      services,
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

beforeAll(() => verifyFoundationQueueSchema(pool));
afterAll(() => pool.end());

describe.sequential('catalog synchronization pipeline', () => {
  let firstSyncRunId: string | undefined;

  it('captures safe snapshots and normalizes the fixture through all pre-approval stages', async () => {
    const syncRunId = await runPipeline('pipeline-001');
    firstSyncRunId = syncRunId;
    const counts = await pool.query<{
      audit_count: string;
      catalog_difference_count: string;
      catalog_version_count: string;
      material_count: string;
      media_reference_count: string;
      media_asset_count: string;
      media_audit_count: string;
      media_metadata_filename: string;
      price_count: string;
      price_version_count: string;
      snapshot_count: string;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM source_snapshot WHERE sync_run_id = $1::uuid) AS snapshot_count,
          (SELECT count(*)::text FROM catalog_version WHERE sync_run_id = $1::uuid)
            AS catalog_version_count,
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
            SELECT safe_metadata->>'originalFilename'
            FROM catalog_sync_item
            WHERE sync_run_id = $1::uuid
              AND source_type = 'MEDIA'
            LIMIT 1
          ) AS media_metadata_filename,
          (
            SELECT count(*)::text
            FROM source_price_record
            WHERE catalog_source_id = '${catalogSourceId}'::uuid
              AND source_id = 'jobs-material-roller-1001'
          ) AS price_count,
          (SELECT count(*)::text FROM audit_event WHERE target_id = $1::text) AS audit_count
      `,
      [syncRunId],
    );
    expect(Number(counts.rows[0]?.catalog_difference_count ?? '0')).toBeGreaterThan(0);
    expect(counts.rows[0]).toMatchObject({
      audit_count: '4',
      catalog_version_count: '1',
      material_count: '1',
      media_asset_count: '1',
      media_audit_count: '1',
      media_metadata_filename: 'jobs-material-roller-1001.png',
      media_reference_count: '1',
      price_count: '1',
      price_version_count: '1',
      snapshot_count: '1',
    });
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
            AND source_id = 'jobs-material-roller-1001'
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
      price_count: '1',
      source_identity_count: '1',
      version_count: '2',
    });
  });
});
