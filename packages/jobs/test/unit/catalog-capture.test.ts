import type { JobHelpers } from 'graphile-worker';
import { describe, expect, it, vi } from 'vitest';

import {
  catalogCaptureKey,
  loadReusableCatalogCaptureKeys,
  persistCatalogSnapshot,
} from '../../src/catalog/capture.js';
import { CatalogPipelineError } from '../../src/catalog/errors.js';
import {
  catalogSafeSnapshotPayloadSchema,
  emptyCatalogSafeSnapshotPayload,
} from '../../src/catalog/snapshot.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const syncRunId = '00000000-0000-4000-8000-000000000301';
const sourceVersion = {
  capturedAt: '2026-08-03T12:00:00.000Z',
  sourceType: 'FIXTURE' as const,
  version: `sha256:${'a'.repeat(64)}`,
};
const capture = {
  capturedAt: sourceVersion.capturedAt,
  contentHash: 'b'.repeat(64),
  httpStatus: 200,
  mappingVersion: 'fixture-mapping/2',
  parserVersion: 'fixture-parser/2',
  sourceUrl: 'https://fixture.invalid/catalog/material/1001',
  status: 'CAPTURED' as const,
};
const payload = {
  catalogSourceId,
  correlationId: 'catalog-capture-unit-001',
  idempotencyKey: `catalog:catalog-sync-run:${syncRunId}`,
  schemaVersion: 1 as const,
  syncRunId,
};

function helpersWithQuery(query: JobHelpers['query']): JobHelpers {
  return { query } as JobHelpers;
}

describe('resumable catalog capture', () => {
  it('builds bounded deterministic capture keys', () => {
    expect(catalogCaptureKey('Media Manifest', '1001')).toBe('media-manifest:1001');
    expect(() => catalogCaptureKey('', '1001')).toThrow(CatalogPipelineError);
    expect(() => catalogCaptureKey('material', 'x'.repeat(401))).toThrow(CatalogPipelineError);
  });

  it('inserts a new append-only snapshot and reuses only exact retry evidence', async () => {
    const safePayload = emptyCatalogSafeSnapshotPayload(sourceVersion);
    const snapshot = {
      capture,
      captureKey: catalogCaptureKey('material', '1001'),
      payload: safePayload,
      semanticSourceVersion: sourceVersion.version,
    };
    const createQuery = vi.fn().mockResolvedValue({ rows: [{ id: 'snapshot-1' }] });
    await expect(
      persistCatalogSnapshot(helpersWithQuery(createQuery), payload, snapshot),
    ).resolves.toBe('CREATED');

    const resumeQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            content_hash: capture.contentHash,
            mapping_version: capture.mappingVersion,
            parser_version: capture.parserVersion,
            source_url: capture.sourceUrl,
            source_version: sourceVersion.version,
          },
        ],
      });
    await expect(
      persistCatalogSnapshot(helpersWithQuery(resumeQuery), payload, snapshot),
    ).resolves.toBe('RESUMED');
  });

  it('fails closed when a retry capture conflicts with immutable evidence', async () => {
    const conflictQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            content_hash: 'c'.repeat(64),
            mapping_version: capture.mappingVersion,
            parser_version: capture.parserVersion,
            source_url: capture.sourceUrl,
            source_version: sourceVersion.version,
          },
        ],
      });
    await expect(
      persistCatalogSnapshot(helpersWithQuery(conflictQuery), payload, {
        capture,
        captureKey: catalogCaptureKey('material', '1001'),
        payload: emptyCatalogSafeSnapshotPayload(sourceVersion),
        semanticSourceVersion: sourceVersion.version,
      }),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_RESUME_CONFLICT' });
  });

  it('loads only immutable capture keys pinned to the current semantic source version', async () => {
    const captureKey = catalogCaptureKey('material', '1001');
    const reusableQuery = vi.fn().mockResolvedValue({
      rows: [
        {
          capture_key: captureKey,
          content_hash: capture.contentHash,
          mapping_version: capture.mappingVersion,
          parser_version: capture.parserVersion,
          source_url: capture.sourceUrl,
          source_version: sourceVersion.version,
          status: 'CAPTURED',
        },
      ],
    });
    await expect(
      loadReusableCatalogCaptureKeys(
        helpersWithQuery(reusableQuery),
        syncRunId,
        [captureKey],
        sourceVersion.version,
      ),
    ).resolves.toEqual(new Set([captureKey]));

    reusableQuery.mockResolvedValueOnce({
      rows: [
        {
          capture_key: captureKey,
          content_hash: capture.contentHash,
          mapping_version: capture.mappingVersion,
          parser_version: capture.parserVersion,
          source_url: capture.sourceUrl,
          source_version: 'sha256:conflict',
          status: 'CAPTURED',
        },
      ],
    });
    await expect(
      loadReusableCatalogCaptureKeys(
        helpersWithQuery(reusableQuery),
        syncRunId,
        [captureKey],
        sourceVersion.version,
      ),
    ).rejects.toMatchObject({ code: 'CATALOG_PIPELINE_RESUME_CONFLICT' });
  });

  it('upgrades legacy safe snapshot payloads without accepting raw fields', () => {
    const current = emptyCatalogSafeSnapshotPayload(sourceVersion);
    const legacy = {
      categories: current.categories,
      materials: current.materials,
      mediaManifests: current.mediaManifests,
      prices: current.prices,
      schemaVersion: 1,
      sourceVersion: current.sourceVersion,
      systems: current.systems,
    };
    expect(catalogSafeSnapshotPayloadSchema.parse(legacy)).toMatchObject({
      models: [],
      schemaVersion: 2,
    });
    expect(() =>
      catalogSafeSnapshotPayloadSchema.parse({ ...legacy, rawHtml: '<script />' }),
    ).toThrow();
  });
});
