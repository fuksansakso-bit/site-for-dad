import { createHash } from 'node:crypto';

import type { JobHelpers } from 'graphile-worker';
import { describe, expect, it, vi } from 'vitest';

import {
  automaticCatalogDiscoveryPayload,
  catalogActivateVersionPayloadSchema,
  catalogApproveVersionPayloadSchema,
  catalogJobIdentifiers,
  catalogMediaBatchIdempotencyKey,
  catalogMediaImportPayloadSchema,
  catalogReviewDifferencesPayloadSchema,
  catalogRollbackVersionPayloadSchema,
  catalogSourceDiscoveryPayloadSchema,
  catalogSyncCancellationRequestSchema,
} from '../../src/catalog/contracts.js';
import {
  catalogSafeSnapshotPayloadSchema,
  emptyCatalogSafeSnapshotPayload,
} from '../../src/catalog/snapshot.js';
import { type CatalogJobServices } from '../../src/catalog/services.js';
import { CatalogPipelineError } from '../../src/catalog/errors.js';
import { createCatalogTaskList } from '../../src/catalog/task.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';

describe('catalog synchronization job contracts', () => {
  it('registers exactly the owner-authorized Phase 1B.2 catalog jobs', () => {
    const services = {
      activateVersion: vi.fn(),
      approveVersion: vi.fn(),
      buildDiff: vi.fn(),
      discoverSource: vi.fn(),
      importMedia: vi.fn(),
      normalize: vi.fn(),
      reviewDifferences: vi.fn(),
      rollbackVersion: vi.fn(),
      synchronize: vi.fn(),
    } satisfies CatalogJobServices;

    expect(Object.keys(createCatalogTaskList(services, 1_000)).sort()).toEqual(
      Object.values(catalogJobIdentifiers).sort(),
    );
  });

  it('requires an actor for a manual run and rejects secret or raw fields', () => {
    const base = {
      catalogSourceId,
      correlationId: 'catalog-manual-unit-001',
      idempotencyKey: `catalog:manual:${catalogSourceId}:unit-001`,
      schemaVersion: 1,
      trigger: 'MANUAL',
    } as const;

    expect(() => catalogSourceDiscoveryPayloadSchema.parse(base)).toThrow();
    expect(() =>
      catalogSourceDiscoveryPayloadSchema.parse({
        ...base,
        requestedByActorId: '00000000-0000-4000-8000-000000000201',
        secret: 'not-allowed',
      }),
    ).toThrow();
  });

  it('creates a deterministic daily payload without credentials', () => {
    const payload = automaticCatalogDiscoveryPayload(
      catalogSourceId,
      new Date('2026-08-03T00:00:00.000Z'),
    );
    expect(payload).toMatchObject({
      catalogSourceId,
      correlationId: 'catalog-auto-2026-08-03',
      schemaVersion: 1,
      trigger: 'AUTOMATIC',
    });
    expect(JSON.stringify(payload)).not.toMatch(/password|secret|token/i);
  });

  it('schedules the next daily run before a retryable discovery failure', async () => {
    const payload = automaticCatalogDiscoveryPayload(
      catalogSourceId,
      new Date('2026-08-03T00:00:00.000Z'),
    );
    const services = {
      activateVersion: vi.fn(),
      approveVersion: vi.fn(),
      buildDiff: vi.fn(),
      discoverSource: vi.fn().mockRejectedValue(
        new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_UNAVAILABLE', {
          retryable: true,
        }),
      ),
      importMedia: vi.fn(),
      normalize: vi.fn(),
      reviewDifferences: vi.fn(),
      rollbackVersion: vi.fn(),
      synchronize: vi.fn(),
    } satisfies CatalogJobServices;
    const addJob = vi.fn().mockResolvedValue(undefined);
    const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const helpers = {
      abortSignal: new AbortController().signal,
      addJob,
      job: { attempts: 1, max_attempts: 5 },
      query: vi.fn(async (text: string) =>
        text.includes('SELECT payload_digest, status')
          ? { rows: [{ payload_digest: digest, status: 'IN_PROGRESS' }] }
          : { rows: [] },
      ),
    } as unknown as JobHelpers;
    const task = createCatalogTaskList(services, 1_000)[catalogJobIdentifiers.sourceDiscovery];
    if (task === undefined) throw new Error('Catalog discovery task is unavailable.');

    await expect(task(payload, helpers)).rejects.toMatchObject({
      code: 'CATALOG_PIPELINE_SOURCE_UNAVAILABLE',
    });
    expect(addJob).toHaveBeenCalledTimes(1);
    expect(addJob.mock.calls[0]?.[0]).toBe(catalogJobIdentifiers.sourceDiscovery);
    expect(addJob.mock.calls[0]?.[1]).toMatchObject({ trigger: 'AUTOMATIC' });
    expect(addJob.mock.calls[0]?.[2]).toMatchObject({
      flags: ['catalog-full', 'automatic'],
      maxAttempts: 5,
      queueName: 'catalog-full-sync',
    });
  });

  it('accepts an explicit safe retry link to a historical sync run', () => {
    expect(
      catalogSourceDiscoveryPayloadSchema.parse({
        catalogSourceId,
        correlationId: 'catalog-retry-unit-001',
        idempotencyKey: `catalog:test:${catalogSourceId}:retry-unit-001`,
        retryOfSyncRunId: '798d5513-27b1-48e3-ab8e-389eeb672db4',
        schemaVersion: 1,
        trigger: 'TEST',
      }),
    ).toMatchObject({ retryOfSyncRunId: '798d5513-27b1-48e3-ab8e-389eeb672db4' });
  });

  it('requires a bounded actor-attributed cancellation request', () => {
    expect(
      catalogSyncCancellationRequestSchema.parse({
        actorId: '00000000-0000-4000-8000-000000000201',
        catalogSourceId,
        correlationId: 'catalog-cancel-unit-001',
        reason: 'Operator stopped the current capture.',
        syncRunId: '00000000-0000-4000-8000-000000000301',
      }),
    ).toMatchObject({ reason: 'Operator stopped the current capture.' });
    expect(() =>
      catalogSyncCancellationRequestSchema.parse({
        actorId: '00000000-0000-4000-8000-000000000201',
        catalogSourceId,
        correlationId: 'catalog-cancel-unit-001',
        reason: 'x'.repeat(513),
        secret: 'not-allowed',
        syncRunId: '00000000-0000-4000-8000-000000000301',
      }),
    ).toThrow();
  });

  it('uses a distinct bounded idempotency key for every media batch', () => {
    const syncRunId = '00000000-0000-4000-8000-000000000301';
    const firstKey = catalogMediaBatchIdempotencyKey(syncRunId, 1);
    const secondKey = catalogMediaBatchIdempotencyKey(syncRunId, 2);

    expect(firstKey).not.toBe(secondKey);
    expect(
      catalogMediaImportPayloadSchema.parse({
        batchNumber: 2,
        catalogSourceId,
        correlationId: 'catalog-media-batch-unit-001',
        idempotencyKey: secondKey,
        schemaVersion: 1,
        syncRunId,
      }),
    ).toMatchObject({ batchNumber: 2, idempotencyKey: secondKey });
    expect(() => catalogMediaBatchIdempotencyKey(syncRunId, 0)).toThrow();
    expect(() => catalogMediaBatchIdempotencyKey(syncRunId, 100_001)).toThrow();
  });

  it('enqueues the next media batch without advancing to diff', async () => {
    const syncRunId = '00000000-0000-4000-8000-000000000301';
    const payload = catalogMediaImportPayloadSchema.parse({
      batchNumber: 2,
      catalogSourceId,
      correlationId: 'catalog-media-batch-unit-002',
      idempotencyKey: catalogMediaBatchIdempotencyKey(syncRunId, 2),
      schemaVersion: 1,
      syncRunId,
    });
    const services = {
      activateVersion: vi.fn(),
      approveVersion: vi.fn(),
      buildDiff: vi.fn(),
      discoverSource: vi.fn(),
      importMedia: vi.fn().mockResolvedValue('CONTINUE'),
      normalize: vi.fn(),
      reviewDifferences: vi.fn(),
      rollbackVersion: vi.fn(),
      synchronize: vi.fn(),
    } satisfies CatalogJobServices;
    const addJob = vi.fn().mockResolvedValue(undefined);
    const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    const helpers = {
      abortSignal: new AbortController().signal,
      addJob,
      job: { attempts: 1, max_attempts: 5 },
      query: vi.fn(async (text: string) =>
        text.includes('SELECT payload_digest, status')
          ? { rows: [{ payload_digest: digest, status: 'IN_PROGRESS' }] }
          : { rows: [] },
      ),
    } as unknown as JobHelpers;
    const task = createCatalogTaskList(services, 1_000)[catalogJobIdentifiers.mediaImport];
    if (task === undefined) throw new Error('Catalog media task is unavailable.');

    await task(payload, helpers);

    const nextKey = catalogMediaBatchIdempotencyKey(syncRunId, 3);
    expect(addJob).toHaveBeenCalledTimes(1);
    expect(addJob).toHaveBeenCalledWith(
      catalogJobIdentifiers.mediaImport,
      expect.objectContaining({ batchNumber: 3, idempotencyKey: nextKey }),
      expect.objectContaining({
        jobKey: `${catalogJobIdentifiers.mediaImport}:${nextKey}`,
        queueName: 'catalog-full-sync',
      }),
    );
    expect(services.buildDiff).not.toHaveBeenCalled();
  });

  it('binds approval, activation and rollback commands to explicit version pairs', () => {
    const common = {
      catalogSourceId,
      correlationId: 'catalog-governance-unit-001',
      idempotencyKey: 'catalog:governance:unit-001',
      schemaVersion: 1,
      syncRunId: '00000000-0000-4000-8000-000000000301',
    } as const;
    const catalogVersionId = '00000000-0000-4000-8000-000000000302';
    const checksum = 'a'.repeat(64);

    expect(() =>
      catalogApproveVersionPayloadSchema.parse({
        ...common,
        approvedByActorId: '00000000-0000-4000-8000-000000000201',
        approvalReason: 'Reviewed exact pilot diff.',
        catalogVersionId,
      }),
    ).toThrow();
    expect(
      catalogActivateVersionPayloadSchema.parse({
        ...common,
        activatedByActorId: '00000000-0000-4000-8000-000000000202',
        activationReason: 'Activate the approved pilot release.',
        catalogVersionId,
        expectedCatalogDifferenceChecksum: checksum,
      }),
    ).toMatchObject({ catalogVersionId, expectedCatalogDifferenceChecksum: checksum });
    expect(() =>
      catalogRollbackVersionPayloadSchema.parse({
        catalogSourceId,
        correlationId: 'catalog-rollback-unit-001',
        idempotencyKey: 'catalog:rollback:unit-001',
        schemaVersion: 1,
        approvedByActorId: '00000000-0000-4000-8000-000000000201',
        rolledBackByActorId: '00000000-0000-4000-8000-000000000202',
        rollbackReason: 'Recovery test.',
        expectedActiveCatalogVersionId: catalogVersionId,
      }),
    ).toThrow();
  });

  it('binds selected/all diff review to one exact candidate checksum', () => {
    const common = {
      catalogSourceId,
      catalogVersionId: '00000000-0000-4000-8000-000000000302',
      correlationId: 'catalog-review-unit-001',
      expectedDifferenceChecksum: 'b'.repeat(64),
      idempotencyKey: 'catalog:review:differences-unit-001',
      resolution: 'APPROVED',
      reviewedByActorId: '00000000-0000-4000-8000-000000000201',
      reviewReason: 'Reviewed the exact catalog differences.',
      schemaVersion: 1,
      scope: 'CATALOG',
      syncRunId: '00000000-0000-4000-8000-000000000301',
    } as const;
    expect(
      catalogReviewDifferencesPayloadSchema.parse({
        ...common,
        differenceIds: [],
        selectionMode: 'ALL',
      }),
    ).toMatchObject({ scope: 'CATALOG', selectionMode: 'ALL' });
    expect(() =>
      catalogReviewDifferencesPayloadSchema.parse({
        ...common,
        differenceIds: ['00000000-0000-4000-8000-000000000303'],
        selectionMode: 'ALL',
      }),
    ).toThrow();
    expect(() =>
      catalogReviewDifferencesPayloadSchema.parse({
        ...common,
        catalogVersionId: undefined,
        differenceIds: [],
        priceVersionId: '00000000-0000-4000-8000-000000000304',
        selectionMode: 'ALL',
      }),
    ).toThrow();
  });

  it('accepts only safe structured snapshots and rejects raw HTML', () => {
    const payload = emptyCatalogSafeSnapshotPayload({
      capturedAt: '2026-08-02T12:00:00.000Z',
      sourceType: 'FIXTURE',
      version: 'fixture-v1',
    });
    expect(catalogSafeSnapshotPayloadSchema.parse(payload)).toEqual(payload);
    expect(() =>
      catalogSafeSnapshotPayloadSchema.parse({ ...payload, rawHtml: '<script />' }),
    ).toThrow();
  });
});
