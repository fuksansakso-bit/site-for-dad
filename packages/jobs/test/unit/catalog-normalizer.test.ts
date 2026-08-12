import { describe, expect, it } from 'vitest';

import { resolveCatalogSnapshotSourceVersion } from '../../src/catalog/normalizer.js';
import {
  emptyCatalogSafeSnapshotPayload,
  type CatalogSafeSnapshotPayload,
} from '../../src/catalog/snapshot.js';

const sourceVersion = {
  capturedAt: '2026-08-03T18:55:00.166Z',
  sourceType: 'AUTHORIZED_PUBLIC_WEB' as const,
  version: `sha256:${'a'.repeat(64)}`,
};

describe('catalog snapshot normalization', () => {
  it('accepts resumed snapshots captured at different times for one semantic source version', () => {
    const resumedSourceVersion = {
      ...sourceVersion,
      capturedAt: '2026-08-03T19:20:43.697Z',
    };

    expect(
      resolveCatalogSnapshotSourceVersion([
        emptyCatalogSafeSnapshotPayload(resumedSourceVersion),
        emptyCatalogSafeSnapshotPayload(sourceVersion),
      ]),
    ).toEqual(sourceVersion);
  });

  it('rejects a resumed batch that mixes semantic source versions or source types', () => {
    const assertResumeConflict = (candidate: CatalogSafeSnapshotPayload['sourceVersion']): void => {
      try {
        resolveCatalogSnapshotSourceVersion([
          emptyCatalogSafeSnapshotPayload(sourceVersion),
          emptyCatalogSafeSnapshotPayload(candidate),
        ]);
        throw new Error('Expected a resume conflict.');
      } catch (error) {
        expect(error).toMatchObject({ code: 'CATALOG_PIPELINE_RESUME_CONFLICT' });
      }
    };

    assertResumeConflict({ ...sourceVersion, version: `sha256:${'b'.repeat(64)}` });
    assertResumeConflict({ ...sourceVersion, sourceType: 'PARTNER_EXPORT' });
  });
});
