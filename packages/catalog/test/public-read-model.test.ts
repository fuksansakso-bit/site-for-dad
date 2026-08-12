import { describe, expect, it } from 'vitest';

import { CatalogReadError, buildCatalogPublicSnapshot } from '../src/read-model.js';

const ids = {
  asset: '00000000-0000-4000-8000-000000000401',
  catalogVersion: '00000000-0000-4000-8000-000000000402',
  category: '00000000-0000-4000-8000-000000000403',
  priceVersion: '00000000-0000-4000-8000-000000000404',
  system: '00000000-0000-4000-8000-000000000405',
  variant: '00000000-0000-4000-8000-000000000406',
} as const;

const publishedOverlay = {
  availability: { status: 'AVAILABLE' },
  localDescription: 'Локальное описание',
  localOrder: 7,
  localPriceOverride: null,
  manualReviewState: 'APPROVED',
  publication: { status: 'PUBLISHED' },
  visibility: 'VISIBLE',
};

function manifest(overrides: Record<string, unknown> = {}): {
  composition: Array<Record<string, unknown>>;
} {
  return {
    composition: [
      {
        entity: {
          id: ids.category,
          name: 'Рулонные жалюзи',
          parentId: null,
          slug: 'rulonnye-zhalyuzi',
          sortOrder: 4,
        },
        entityType: 'CATEGORY',
        overlay: publishedOverlay,
      },
      {
        entity: {
          categoryId: ids.category,
          id: ids.system,
          name: 'Рулонная система',
          slug: 'rulonnaya-sistema',
          sortOrder: 2,
        },
        entityType: 'SYSTEM',
        overlay: publishedOverlay,
      },
      {
        entity: {
          article: '49129',
          color: { hex: '#EEE8DA', name: 'Молочный', slug: 'molochnyy' },
          id: ids.variant,
          isBlackout: true,
          isZebra: false,
          material: {
            categoryId: ids.category,
            id: '00000000-0000-4000-8000-000000000407',
            name: 'Альфа Blackout',
            slug: 'alfa-blackout',
          },
          name: 'Альфа Blackout молочный',
          primarySystemId: ids.system,
          slug: 'alfa-blackout-molochnyy',
          widthMm: '2000',
        },
        entityType: 'MATERIAL_VARIANT',
        overlay: { ...publishedOverlay, ...overrides },
        primaryMedia: {
          byteSize: 515_180,
          fileHash: 'a'.repeat(64),
          height: 1_200,
          id: ids.asset,
          mimeType: 'image/jpeg',
          objectKey: 'catalog/amigo/aa/approved-image.jpg',
          publicationStatus: 'PUBLICATION_APPROVED',
          rightsStatus: 'PARTNER_LICENSE',
          storageZone: 'private',
          width: 1_600,
        },
        sourcePrice: {
          amountMinor: 199_900,
          currency: 'RUB',
          kind: 'FROM',
          status: 'AVAILABLE',
        },
      },
    ],
  };
}

function input(sourceManifest: unknown) {
  return {
    catalogVersion: {
      activatedAt: '2026-08-03T09:00:00.000Z',
      differenceChecksum: 'b'.repeat(64),
      id: ids.catalogVersion,
      versionNumber: 1,
    },
    manifest: sourceManifest,
    maximumMaterialCount: 32,
    priceVersion: {
      activatedAt: '2026-08-03T09:00:00.000Z',
      differenceChecksum: 'c'.repeat(64),
      id: ids.priceVersion,
      versionNumber: 1,
    },
  } as const;
}

describe('public catalog projection', () => {
  it('serves only the immutable approved composition and keeps media locator server-side', () => {
    const snapshot = buildCatalogPublicSnapshot(input(manifest()));

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.categories).toEqual([
      {
        depth: 0,
        id: ids.category,
        name: 'Рулонные жалюзи',
        parentId: null,
        path: [{ id: ids.category, name: 'Рулонные жалюзи', slug: 'rulonnye-zhalyuzi' }],
        slug: 'rulonnye-zhalyuzi',
        sortOrder: 4,
      },
    ]);
    expect(snapshot.items[0]).toMatchObject({
      availability: 'IN_STOCK',
      category: { id: ids.category },
      id: ids.variant,
      media: {
        byteSize: 515_180,
        checksumSha256: 'a'.repeat(64),
        objectKey: 'catalog/amigo/aa/approved-image.jpg',
      },
      price: { amountMinor: 199_900, origin: 'SOURCE_VERSION' },
      system: { id: ids.system },
    });
  });

  it('applies an effective local price override without changing source price history', () => {
    const snapshot = buildCatalogPublicSnapshot(
      input(
        manifest({
          localPriceOverride: {
            amountMinor: 210_000,
            currency: 'RUB',
            status: 'ACTIVE',
          },
        }),
      ),
    );

    expect(snapshot.items[0]?.price).toEqual({
      amountMinor: 210_000,
      currency: 'RUB',
      kind: 'FROM',
      origin: 'LOCAL_OVERRIDE',
      status: 'AVAILABLE',
    });
  });

  it('normalizes a retained technical category identity into a bounded public URL slug', () => {
    const retained = manifest();
    const category = (retained.composition[0] as Record<string, unknown>)['entity'] as Record<
      string,
      unknown
    >;
    category['slug'] = 'amigo-category-category:path:rulonnye-shtory';

    const snapshot = buildCatalogPublicSnapshot(input(retained));

    expect(snapshot.categories[0]?.slug).toBe('amigo-category-category-path-rulonnye-shtory');
    expect(snapshot.items[0]?.category.path[0]?.slug).toBe(
      'amigo-category-category-path-rulonnye-shtory',
    );

    retained.composition.unshift({
      entity: {
        id: '00000000-0000-4000-8000-000000000409',
        name: 'Colliding category',
        parentId: null,
        slug: 'amigo-category-category-path-rulonnye-shtory',
        sortOrder: 5,
      },
      entityType: 'CATEGORY',
      overlay: publishedOverlay,
    });
    expect(() => buildCatalogPublicSnapshot(input(retained))).toThrow(CatalogReadError);
  });

  it('fails closed for hidden, unreviewed or corrupted media data', () => {
    const hidden = buildCatalogPublicSnapshot(
      input(manifest({ publication: { status: 'DRAFT' } })),
    );
    expect(hidden.items).toEqual([]);

    const corrupted = manifest();
    const variant = (corrupted.composition[2] as Record<string, unknown>)['primaryMedia'] as Record<
      string,
      unknown
    >;
    variant['fileHash'] = 'not-a-checksum';
    expect(() => buildCatalogPublicSnapshot(input(corrupted))).toThrow(CatalogReadError);
  });

  it('fails closed for a category cycle and omits an orphaned subtree', () => {
    const cyclic = manifest();
    const rootEntity = (cyclic.composition[0] as Record<string, unknown>)['entity'] as Record<
      string,
      unknown
    >;
    const childId = '00000000-0000-4000-8000-000000000408';
    rootEntity['parentId'] = childId;
    cyclic.composition.unshift({
      entity: {
        id: childId,
        name: 'Циклическая категория',
        parentId: ids.category,
        slug: 'ciklicheskaya-kategoriya',
        sortOrder: 5,
      },
      entityType: 'CATEGORY',
      overlay: publishedOverlay,
    });
    expect(() => buildCatalogPublicSnapshot(input(cyclic))).toThrow(CatalogReadError);

    const orphaned = manifest();
    const orphanedRoot = (orphaned.composition[0] as Record<string, unknown>)['entity'] as Record<
      string,
      unknown
    >;
    orphanedRoot['parentId'] = '00000000-0000-4000-8000-000000000499';
    const snapshot = buildCatalogPublicSnapshot(input(orphaned));
    expect(snapshot.categories).toEqual([]);
    expect(snapshot.items).toEqual([]);
  });
});
