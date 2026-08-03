import { describe, expect, it } from 'vitest';

import {
  publicCatalogMaterialResponseSchema,
  publicCatalogQuerySchema,
  publicCatalogResponseSchema,
} from '../src/catalog.js';

const categoryId = '00000000-0000-4000-8000-000000000403';
const materialId = '00000000-0000-4000-8000-000000000406';
const assetId = '00000000-0000-4000-8000-000000000401';
const catalogVersionId = '00000000-0000-4000-8000-000000000402';
const priceVersionId = '00000000-0000-4000-8000-000000000404';

const category = {
  depth: 0,
  id: categoryId,
  name: 'Рулонные жалюзи',
  parentId: null,
  path: [{ id: categoryId, name: 'Рулонные жалюзи', slug: 'rulonnye-zhalyuzi' }],
  slug: 'rulonnye-zhalyuzi',
  sortOrder: 1,
};

const material = {
  article: '49129',
  availability: 'IN_STOCK',
  category,
  color: null,
  description: null,
  id: materialId,
  isBlackout: true,
  isZebra: false,
  materialName: 'Альфа Blackout',
  media: {
    height: 1_200,
    id: assetId,
    type: 'image/jpeg',
    url: `/api/v1/catalog/media/${assetId}?v=${catalogVersionId}`,
    width: 1_600,
  },
  name: 'Альфа Blackout молочный',
  price: {
    amountMinor: 199_900,
    currency: 'RUB',
    kind: 'FROM',
    origin: 'SOURCE_VERSION',
    status: 'AVAILABLE',
  },
  slug: 'alfa-blackout-molochnyy',
  system: null,
  widthMm: 2_000,
};

const catalogVersion = {
  activatedAt: '2026-08-03T09:00:00.000Z',
  id: catalogVersionId,
  versionNumber: 3,
};

const priceVersion = {
  activatedAt: '2026-08-03T09:00:00.000Z',
  id: priceVersionId,
  versionNumber: 3,
};

describe('public catalog HTTP contracts', () => {
  it('normalizes bounded filters and rejects unsupported values', () => {
    expect(
      publicCatalogQuerySchema.parse({
        blackout: 'true',
        limit: '12',
        q: '  альфа ',
        sort: 'price-desc',
      }),
    ).toMatchObject({
      blackout: true,
      limit: 12,
      q: 'альфа',
      sort: 'price-desc',
      zebra: false,
    });
    expect(publicCatalogQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(publicCatalogQuerySchema.safeParse({ sort: 'source-order' }).success).toBe(false);
    expect(publicCatalogQuerySchema.safeParse({ unknown: 'field' }).success).toBe(false);
  });

  it('accepts the complete safe hierarchy/detail DTO and rejects internal fields', () => {
    const response = {
      correlationId: 'catalog-contract-1234',
      facets: {
        availability: [{ count: 1, label: 'Есть в наличии', value: 'IN_STOCK' }],
        categories: [
          {
            count: 1,
            depth: 0,
            label: category.name,
            parentValue: null,
            path: category.path,
            value: category.slug,
          },
        ],
        colors: [],
        features: [{ count: 1, label: 'Blackout', value: 'blackout' }],
        systems: [],
      },
      items: [material],
      limit: 12,
      nextCursor: null,
      priceVersion,
      total: 1,
      version: catalogVersion,
    };
    const detail = {
      correlationId: 'catalog-contract-1234',
      item: material,
      priceVersion,
      version: catalogVersion,
    };

    expect(publicCatalogResponseSchema.parse(response).items[0]?.category.path).toHaveLength(1);
    expect(publicCatalogMaterialResponseSchema.parse(detail).item.article).toBe('49129');
    expect(
      publicCatalogResponseSchema.safeParse({
        ...response,
        items: [
          {
            ...material,
            media: { ...material.media, objectKey: 'must-not-leak' },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      publicCatalogMaterialResponseSchema.safeParse({
        ...detail,
        item: { ...material, sourceHash: 'must-not-leak' },
      }).success,
    ).toBe(false);
  });
});
