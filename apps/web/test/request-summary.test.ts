import type { PublicRequestSummaryView } from '@project-name/db';
import { describe, expect, it } from 'vitest';

import { publicRequestSummaryResponse } from '../lib/request-summary';

describe('public request summary', () => {
  it('removes internal cart references and version identifiers', () => {
    const source: PublicRequestSummaryView = {
      createdAt: '2026-08-09T10:00:00.000Z',
      installmentInterest: true,
      measurementRequested: true,
      previewSequences: [1],
      requestNumber: 'REQ-260809-ABCDEFGH',
      snapshot: {
        capturedAt: '2026-08-09T10:00:00.000Z',
        items: [
          {
            catalogVersionNumber: 41,
            editHref: `/configure?edit=${'a'.repeat(32)}`,
            itemReference: 'a'.repeat(32),
            minimumPriceApplied: true,
            optionsTotalKopecks: 0,
            previewHref: `/preview?state=${'b'.repeat(32)}`,
            priceVersionNumber: 12,
            pricingStatus: 'CALCULATED',
            product: {
              additionalOptions: [],
              color: 'Белый',
              control: 'Цепь',
              family: 'Рулонные шторы',
              hardware: 'Белый',
              heightMm: 1400,
              material: 'Альфа',
              materialArticle: 'A-101',
              model: 'Мини',
              modelCode: 'MINI',
              mounting: 'На створку',
              quantity: 1,
              system: 'AMIGO',
              widthMm: 900,
            },
            quantityTotalKopecks: 150_000,
            quoteCreatedAt: '2026-08-09T09:59:00.000Z',
            revision: 1,
            unitPriceKopecks: 150_000,
            warnings: [],
            wasCalculatedWithPreviousPrice: false,
          },
        ],
        priceVersionChangedItemCount: 0,
        services: { delivery: 'FREE', installation: 'FREE', measurement: 'FREE' },
        summary: {
          currency: 'RUB',
          deliveryKopecks: 0,
          installationKopecks: 0,
          knownOptionsKopecks: 0,
          knownProductsKopecks: 150_000,
          knownSubtotalKopecks: 150_000,
          measurementKopecks: 0,
          minimumAppliedItemCount: 1,
          pricedItemCount: 1,
          pricingStatus: 'FULLY_PRICED',
          totalItemCount: 1,
          totalQuantity: 1,
          unknownItemCount: 0,
        },
        version: 1,
      },
      status: 'NEW',
    };
    const response = publicRequestSummaryResponse(source, 'r'.repeat(43), 'correlation-123');
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('catalogVersionNumber');
    expect(serialized).not.toContain('priceVersionNumber');
    expect(serialized).not.toContain('itemReference');
    expect(serialized).not.toContain('editHref');
    expect(serialized).not.toContain('previewHref');
    expect(response.items[0]?.previewAssetHref).toContain('/requests/public/');
  });
});
