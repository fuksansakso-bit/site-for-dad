import { describe, expect, it } from 'vitest';

import {
  catalogVersionSemanticArtifactHash,
  catalogVersionSemanticContentChecksum,
  type VersionEntity,
} from '../../src/catalog/versioning.js';

function entity(overrides: Partial<VersionEntity> = {}): VersionEntity {
  return {
    artifactHash: 'a'.repeat(64),
    attachment: null,
    facts: {
      identity: {
        sourceCapturedAt: '2026-08-03T12:00:00.000Z',
        sourceLastVerifiedAt: '2026-08-03T12:00:00.000Z',
      },
      name: 'Stable source fact',
    },
    key: 'MATERIAL_VARIANT:material-1',
    sourceCapturedAt: '2026-08-03T12:00:00.000Z',
    sourceCategory: 'category-1',
    sourceEntityId: '00000000-0000-4000-8000-000000000001',
    sourceHash: 'b'.repeat(64),
    sourceId: 'material-1',
    sourceSlug: 'material-1',
    sourceStatus: 'ACTIVE',
    sourceType: 'MATERIAL_VARIANT',
    sourceUrl: 'https://fixture.invalid/material/material-1',
    ...overrides,
  };
}

describe('catalog version semantic checksums', () => {
  it('ignores recapture metadata, persisted artifact hashes and local media governance', () => {
    const first = entity({
      attachment: {
        byteSize: 128,
        fileHash: 'c'.repeat(64),
        height: 10,
        imported: true,
        mediaAssetId: '00000000-0000-4000-8000-000000000010',
        mimeType: 'image/png',
        objectKey: 'private/first.png',
        publicationStatus: 'PENDING',
        rightsStatus: 'PARTNER_LICENSE',
        width: 20,
      },
      key: 'MEDIA:media-1',
      sourceId: 'media-1',
      sourceType: 'MEDIA',
      sourceUrl: 'https://fixture.invalid/media/media-1.png',
    });
    const repeated = entity({
      ...first,
      artifactHash: 'd'.repeat(64),
      attachment: {
        ...(first.attachment as Record<string, unknown>),
        mediaAssetId: '00000000-0000-4000-8000-000000000011',
        objectKey: 'private/rebound.png',
        publicationStatus: 'PUBLICATION_APPROVED',
      },
      facts: {
        identity: {
          sourceCapturedAt: '2026-08-04T12:00:00.000Z',
          sourceLastVerifiedAt: '2026-08-04T12:00:00.000Z',
        },
        name: 'Stable source fact',
      },
      sourceCapturedAt: '2026-08-04T12:00:00.000Z',
      sourceEntityId: '00000000-0000-4000-8000-000000000002',
      sourceHash: 'e'.repeat(64),
    });

    expect(catalogVersionSemanticArtifactHash(repeated)).toBe(
      catalogVersionSemanticArtifactHash(first),
    );
    expect(catalogVersionSemanticContentChecksum([repeated])).toBe(
      catalogVersionSemanticContentChecksum([first]),
    );
  });

  it('ignores only representative provenance drift for shared derived entities', () => {
    for (const sourceType of ['COLOR', 'FAMILY', 'MATERIAL'] as const) {
      const first = entity({
        key: `${sourceType}:shared-1`,
        sourceId: 'shared-1',
        sourceType,
        sourceUrl: 'https://fixture.invalid/material/first',
      });
      const repeated = entity({
        ...first,
        sourceUrl: 'https://fixture.invalid/material/second',
      });
      expect(catalogVersionSemanticArtifactHash(repeated)).toBe(
        catalogVersionSemanticArtifactHash(first),
      );
    }

    const direct = entity();
    expect(
      catalogVersionSemanticArtifactHash(
        entity({ ...direct, sourceUrl: 'https://fixture.invalid/material/moved' }),
      ),
    ).not.toBe(catalogVersionSemanticArtifactHash(direct));
  });

  it('changes when source facts, source state or imported bytes change', () => {
    const base = entity();
    expect(
      catalogVersionSemanticArtifactHash(entity({ ...base, facts: { name: 'Changed fact' } })),
    ).not.toBe(catalogVersionSemanticArtifactHash(base));
    expect(
      catalogVersionSemanticArtifactHash(entity({ ...base, sourceStatus: 'SOURCE_REMOVED' })),
    ).not.toBe(catalogVersionSemanticArtifactHash(base));

    const media = entity({
      attachment: {
        byteSize: 128,
        fileHash: 'c'.repeat(64),
        height: 10,
        imported: true,
        mimeType: 'image/png',
        width: 20,
      },
      key: 'MEDIA:media-1',
      sourceId: 'media-1',
      sourceType: 'MEDIA',
      sourceUrl: 'https://fixture.invalid/media/media-1.png',
    });
    expect(
      catalogVersionSemanticArtifactHash(
        entity({
          ...media,
          attachment: {
            ...(media.attachment as Record<string, unknown>),
            fileHash: 'f'.repeat(64),
          },
        }),
      ),
    ).not.toBe(catalogVersionSemanticArtifactHash(media));
  });
});
