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
import { createCatalogJobServices } from '../../src/catalog/services.js';
import { createJobsCatalogFixture } from '../support/catalog-fixture.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const runTag = randomUUID().slice(0, 8);
const databaseEnvironment = parseDatabaseEnvironment(process.env);
const workerEnvironment: WorkerEnvironment = {
  ...parseWorkerEnvironment(process.env),
  WORKER_JOB_TIMEOUT_MS: 5_000,
};
const pool = createFoundationJobPool(databaseEnvironment, 4);
const services = createCatalogJobServices(
  () => new FixtureCatalogSourceAdapter(createJobsCatalogFixture()),
);

async function runPipeline(idempotencySuffix: string): Promise<string> {
  const uniqueSuffix = `${runTag}-${idempotencySuffix}`;
  const idempotencyKey = `catalog:test:${catalogSourceId}:${uniqueSuffix}`;
  await enqueueCatalogSourceDiscovery(pool, {
    catalogSourceId,
    correlationId: `catalog-integration-${uniqueSuffix}`,
    idempotencyKey,
    schemaVersion: 1,
    trigger: 'TEST',
  });
  for (let stage = 0; stage < 5; stage += 1) {
    await runFoundationJobsOnce(pool, workerEnvironment, undefined, undefined, undefined, services);
  }
  const result = await pool.query<{ id: string; status: string }>(
    'SELECT id::text, status::text FROM catalog_sync_run WHERE idempotency_key = $1',
    [idempotencyKey],
  );
  expect(result.rows[0]?.status).toBe('AWAITING_APPROVAL');
  const syncRunId = result.rows[0]?.id;
  if (syncRunId === undefined) throw new Error('Catalog sync run was not created.');
  return syncRunId;
}

beforeAll(() => verifyFoundationQueueSchema(pool));
afterAll(() => pool.end());

describe.sequential('catalog synchronization pipeline', () => {
  it('captures safe snapshots and normalizes the fixture through all pre-approval stages', async () => {
    const syncRunId = await runPipeline('pipeline-001');
    const counts = await pool.query<{
      audit_count: string;
      material_count: string;
      media_reference_count: string;
      price_count: string;
      snapshot_count: string;
    }>(
      `
        SELECT
          (SELECT count(*)::text FROM source_snapshot WHERE sync_run_id = $1::uuid) AS snapshot_count,
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
            SELECT count(*)::text
            FROM source_price_record
            WHERE catalog_source_id = '${catalogSourceId}'::uuid
              AND source_id = 'jobs-material-roller-1001'
          ) AS price_count,
          (SELECT count(*)::text FROM audit_event WHERE target_id = $1::text) AS audit_count
      `,
      [syncRunId],
    );
    expect(counts.rows[0]).toEqual({
      audit_count: '3',
      material_count: '1',
      media_reference_count: '1',
      price_count: '1',
      snapshot_count: '1',
    });
  });

  it('does not duplicate normalized identities or immutable source prices on a repeat import', async () => {
    await runPipeline('pipeline-002');
    const counts = await pool.query<{
      material_count: string;
      price_count: string;
      source_identity_count: string;
    }>(`
      SELECT
        (
          SELECT count(*)::text
          FROM material_variant variant
          JOIN source_entity source ON source.id = variant.source_entity_id
          WHERE source.catalog_source_id = '${catalogSourceId}'::uuid
            AND source.source_id = 'jobs-material-roller-1001'
        ) AS material_count,
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
        ) AS source_identity_count
    `);
    expect(counts.rows[0]).toEqual({
      material_count: '1',
      price_count: '1',
      source_identity_count: '1',
    });
  });
});
