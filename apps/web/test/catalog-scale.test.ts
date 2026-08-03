import { performance } from 'node:perf_hooks';

import type {
  CatalogPublicCategory,
  CatalogPublicSnapshot,
  CatalogPublicSystem,
} from '@project-name/catalog';
import { describe, expect, it } from 'vitest';

import { parseCatalogPublicQuery, selectCatalogPublicPage } from '../lib/catalog-public.js';

const syntheticMaterialCount = 2_048;
const categoryCount = 32;
const rootCategoryCount = 4;
const systemCount = 16;
const signingKey = 'catalog-scale-signing-key-000000000000000000000000';

function uuid(group: string, value: number): string {
  return `00000000-0000-4000-${group}-${value.toString(16).padStart(12, '0')}`;
}

function categories(): readonly CatalogPublicCategory[] {
  const shallow = Array.from({ length: categoryCount }, (_unused, index) => {
    const id = uuid('a101', index + 1);
    const parentIndex = index < rootCategoryCount ? null : index % rootCategoryCount;
    return {
      id,
      name: `Категория ${index.toString().padStart(2, '0')}`,
      parentId: parentIndex === null ? null : uuid('a101', parentIndex + 1),
      slug: `scale-category-${index}`,
      sortOrder: index,
    };
  });
  return shallow.map((category) => {
    const parent =
      category.parentId === null
        ? null
        : (shallow.find((candidate) => candidate.id === category.parentId) ?? null);
    return {
      ...category,
      depth: parent === null ? 0 : 1,
      path:
        parent === null
          ? [{ id: category.id, name: category.name, slug: category.slug }]
          : [
              { id: parent.id, name: parent.name, slug: parent.slug },
              { id: category.id, name: category.name, slug: category.slug },
            ],
    };
  });
}

function systems(
  catalogCategories: readonly CatalogPublicCategory[],
): readonly CatalogPublicSystem[] {
  return Array.from({ length: systemCount }, (_unused, index) => ({
    categoryId: catalogCategories[index % catalogCategories.length]?.id ?? null,
    id: uuid('a111', index + 1),
    name: `Система ${index.toString().padStart(2, '0')}`,
    slug: `scale-system-${index}`,
    sortOrder: index,
  }));
}

function syntheticSnapshot(): CatalogPublicSnapshot {
  const catalogCategories = categories();
  const catalogSystems = systems(catalogCategories);
  return {
    catalogVersion: {
      activatedAt: '2026-08-03T18:00:00.000Z',
      differenceChecksum: 'a'.repeat(64),
      id: uuid('a003', 1),
      versionNumber: 8_001,
    },
    categories: catalogCategories,
    items: Array.from({ length: syntheticMaterialCount }, (_unused, index) => {
      const category = catalogCategories[index % catalogCategories.length];
      const system = catalogSystems[index % catalogSystems.length];
      if (category === undefined || system === undefined) throw new Error('SCALE_FIXTURE_INVALID');
      const priceOnRequest = index % 11 === 0;
      return {
        article: `SCALE-${index.toString().padStart(4, '0')}`,
        availability:
          index % 3 === 0 ? 'IN_STOCK' : index % 3 === 1 ? 'INQUIRY_ONLY' : 'OUT_OF_STOCK',
        category,
        color: {
          hex: `#${(0x100000 + (index % 0xefffff)).toString(16).padStart(6, '0')}`,
          name: `Цвет ${index % 16}`,
          slug: `scale-color-${index % 16}`,
        },
        description: 'Синтетическая запись только для проверки масштаба.',
        id: uuid('a131', index + 1),
        isBlackout: index % 5 === 0,
        isZebra: index % 7 === 0,
        localOrder: index,
        materialName: `Материал ${index.toString().padStart(4, '0')}`,
        media: {
          byteSize: 68,
          checksumSha256: 'b'.repeat(64),
          contentType: 'image/png',
          height: 1,
          id: uuid('a201', 1),
          objectKey: 'catalog/scale/synthetic.png',
          storageZone: 'private',
          width: 1,
        },
        name: `Материал ${index.toString().padStart(4, '0')}, цвет ${index % 16}`,
        price: {
          amountMinor: priceOnRequest ? null : 100_000 + index,
          currency: 'RUB',
          kind: 'FROM',
          origin: 'SOURCE_VERSION',
          status: priceOnRequest ? 'PRICE_ON_REQUEST' : 'AVAILABLE',
        },
        slug: `scale-material-${index}`,
        system,
        widthMm: index % 9 === 0 ? null : 1_600 + (index % 800),
      } as const;
    }),
    priceVersion: {
      activatedAt: '2026-08-03T18:00:00.000Z',
      differenceChecksum: 'c'.repeat(64),
      id: uuid('a004', 1),
      versionNumber: 8_001,
    },
    systems: catalogSystems,
  };
}

describe('PLAN-1B2-SCALE-001 public catalog scale', () => {
  it('keeps cursor pages bounded while traversing a dataset larger than the real discovery', () => {
    const snapshot = syntheticSnapshot();
    const beforeHeap = process.memoryUsage().heapUsed;
    const startedAt = performance.now();
    const seen = new Set<string>();
    let cursor: string | undefined;
    let pageCount = 0;

    do {
      const query = parseCatalogPublicQuery(
        new URLSearchParams({ ...(cursor === undefined ? {} : { cursor }), limit: '50' }),
      );
      const page = selectCatalogPublicPage(snapshot, query, signingKey);
      expect(page.items.length).toBeLessThanOrEqual(50);
      expect(page.total).toBe(syntheticMaterialCount);
      for (const item of page.items) {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
      }
      cursor = page.nextCursor ?? undefined;
      pageCount += 1;
    } while (cursor !== undefined);

    const observedMilliseconds = performance.now() - startedAt;
    const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - beforeHeap);
    expect(seen.size).toBe(syntheticMaterialCount);
    expect(pageCount).toBe(Math.ceil(syntheticMaterialCount / 50));
    process.stdout.write(
      `${JSON.stringify({ heapDeltaBytes, items: syntheticMaterialCount, observedMilliseconds: Math.round(observedMilliseconds * 100) / 100, pageCount, pageLimit: 50, scenario: 'PLAN-1B2-SCALE-001-public-pagination' })}\n`,
    );
  });

  it('keeps search, descendant filtering, facets and price ordering exact at scale', () => {
    const snapshot = syntheticSnapshot();
    const search = selectCatalogPublicPage(
      snapshot,
      parseCatalogPublicQuery(new URLSearchParams({ q: 'SCALE-2047' })),
      signingKey,
    );
    expect(search.total).toBe(1);
    expect(search.items[0]?.article).toBe('SCALE-2047');

    const root = snapshot.categories[0];
    if (root === undefined) throw new Error('SCALE_FIXTURE_INVALID');
    const expectedCategoryCount = snapshot.items.filter((item) =>
      item.category.path.some((segment) => segment.slug === root.slug),
    ).length;
    const category = selectCatalogPublicPage(
      snapshot,
      parseCatalogPublicQuery(
        new URLSearchParams({ category: root.slug, limit: '50', sort: 'price-desc' }),
      ),
      signingKey,
    );
    expect(category.total).toBe(expectedCategoryCount);
    expect(
      category.items.every((item) => item.category.path.some((part) => part.id === root.id)),
    ).toBe(true);
    expect(category.facets.categories.length).toBeGreaterThan(0);
    expect(category.facets.colors).toHaveLength(
      new Set(
        snapshot.items
          .filter((item) => item.category.path.some((part) => part.id === root.id))
          .map((item) => item.color?.slug),
      ).size,
    );
    expect(category.items.at(-1)?.price.status).toBe('AVAILABLE');
  });
});
