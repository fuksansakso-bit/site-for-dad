import type { JobHelpers } from 'graphile-worker';
import type { PoolClient } from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { catalogJobIdentifiers } from '../../src/catalog/contracts.js';
import { failCatalogExecution } from '../../src/catalog/idempotency.js';
import { persistMediaLink } from '../../src/catalog/media.js';

describe('catalog media placement persistence', () => {
  it('rebinds a semantic placement when a parser upgrade changes the source media identity', async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (text: string) => {
        statements.push(text);
        if (text.includes('INSERT INTO media_asset')) {
          return { rows: [{ id: '00000000-0000-4000-8000-000000000501' }] };
        }
        return { rows: [] };
      }),
    } as unknown as PoolClient;
    const helpers = {
      withPgClient: async <T>(operation: (databaseClient: PoolClient) => Promise<T>) =>
        operation(client),
    } as unknown as JobHelpers;

    await persistMediaLink(
      helpers,
      {
        batchNumber: 1,
        catalogSourceId: '00000000-0000-4000-8000-000000000103',
        correlationId: 'catalog-media-placement-regression-001',
        idempotencyKey: 'catalog:media:placement:regression:001',
        schemaVersion: 1,
        syncRunId: '00000000-0000-4000-8000-000000000301',
      },
      {
        asset_byte_size: null,
        asset_file_hash: null,
        asset_mime_type: null,
        asset_object_key: null,
        category_id: null,
        id: '00000000-0000-4000-8000-000000000401',
        material_variant_id: '00000000-0000-4000-8000-000000000402',
        media_asset_id: null,
        model_id: null,
        role: 'PRIMARY',
        sort_order: 0,
        source_entity_id: '00000000-0000-4000-8000-000000000403',
        source_id: 'material-1001:remapped-primary',
        source_type: 'FIXTURE',
        source_url: 'https://fixture.invalid/media/material-1001.png',
        system_id: null,
      },
      {
        byteSize: 68,
        capturedAt: '2026-08-03T20:00:00.000Z',
        extension: 'png',
        fileHash: 'a'.repeat(64),
        height: 1,
        httpStatus: 200,
        mimeType: 'image/png',
        originalFilename: 'material-1001.png',
        width: 1,
      },
      `catalog/amigo/aa/${'a'.repeat(64)}.png`,
      0,
    );

    const placementStatement = statements.find((text) =>
      text.includes('INSERT INTO material_media_asset'),
    );
    expect(placementStatement).toContain(
      'ON CONFLICT (material_variant_id, role, sort_order) DO UPDATE',
    );
    expect(placementStatement).toContain('source_media_asset_id = EXCLUDED.source_media_asset_id');
    expect(placementStatement).not.toContain('ON CONFLICT (source_media_asset_id)');
  });

  it('marks the sync run failed when media import exhausts its retries', async () => {
    const statements: string[] = [];
    const client = {
      query: vi.fn(async (text: string) => {
        statements.push(text);
        return { rows: [] };
      }),
    } as unknown as PoolClient;
    const helpers = {
      withPgClient: async <T>(operation: (databaseClient: PoolClient) => Promise<T>) =>
        operation(client),
    } as unknown as JobHelpers;

    await failCatalogExecution(
      catalogJobIdentifiers.mediaImport,
      {
        catalogSourceId: '00000000-0000-4000-8000-000000000103',
        correlationId: 'catalog-media-permanent-failure-001',
        idempotencyKey: 'catalog:media:permanent:failure:001',
        schemaVersion: 1,
        syncRunId: '00000000-0000-4000-8000-000000000301',
      },
      helpers,
      'CATALOG_PIPELINE_DATABASE',
    );

    expect(statements.some((text) => text.includes('UPDATE catalog_sync_run'))).toBe(true);
    expect(statements.some((text) => text.includes('CATALOG_JOB_PERMANENT_FAILURE'))).toBe(true);
  });
});
