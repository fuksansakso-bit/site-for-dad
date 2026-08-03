import { describe, expect, it, vi } from 'vitest';

import {
  automaticCatalogDiscoveryPayload,
  catalogJobIdentifiers,
  catalogSourceDiscoveryPayloadSchema,
} from '../../src/catalog/contracts.js';
import {
  catalogSafeSnapshotPayloadSchema,
  emptyCatalogSafeSnapshotPayload,
} from '../../src/catalog/snapshot.js';
import { type CatalogJobServices } from '../../src/catalog/services.js';
import { createCatalogTaskList } from '../../src/catalog/task.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';

describe('catalog synchronization job contracts', () => {
  it('registers exactly the six owner-authorized Phase 1B.1 jobs', () => {
    const services = {
      activateVersion: vi.fn(),
      buildDiff: vi.fn(),
      discoverSource: vi.fn(),
      importMedia: vi.fn(),
      normalize: vi.fn(),
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
