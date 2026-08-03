import { describe, expect, it } from 'vitest';

import { publicCatalogQuerySchema, publicCatalogResponseSchema } from '../src/catalog.js';

describe('public catalog HTTP contracts', () => {
  it('normalizes bounded filters and rejects unsupported values', () => {
    expect(
      publicCatalogQuerySchema.parse({ blackout: 'true', limit: '12', q: '  альфа ' }),
    ).toMatchObject({ blackout: true, limit: 12, q: 'альфа', zebra: false });
    expect(publicCatalogQuerySchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(publicCatalogQuerySchema.safeParse({ unknown: 'field' }).success).toBe(false);
  });

  it('rejects internal object locators in a public material response', () => {
    const response = {
      correlationId: 'catalog-contract-1234',
      facets: { availability: [], categories: [], colors: [], features: [], systems: [] },
      items: [
        {
          article: '49129',
          availability: 'IN_STOCK',
          category: {
            id: '00000000-0000-4000-8000-000000000403',
            name: 'Рулонные жалюзи',
            slug: 'rulonnye-zhalyuzi',
          },
          color: null,
          description: null,
          id: '00000000-0000-4000-8000-000000000406',
          isBlackout: true,
          isZebra: false,
          materialName: 'Альфа Blackout',
          media: {
            height: 1_200,
            id: '00000000-0000-4000-8000-000000000401',
            objectKey: 'must-not-leak',
            type: 'image/jpeg',
            url: '/api/v1/catalog/media/00000000-0000-4000-8000-000000000401?v=00000000-0000-4000-8000-000000000402',
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
        },
      ],
      limit: 12,
      nextCursor: null,
      priceVersion: null,
      total: 1,
      version: null,
    };

    expect(publicCatalogResponseSchema.safeParse(response).success).toBe(false);
  });
});
