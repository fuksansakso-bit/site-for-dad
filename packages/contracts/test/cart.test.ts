import { describe, expect, it } from 'vitest';

import {
  cartItemAddRequestSchema,
  cartItemEditSourceResponseSchema,
  cartItemResponseSchema,
  guestCartResponseSchema,
} from '../src/cart.js';

const item = {
  catalogVersionNumber: 2,
  editHref: `/configure?edit=${'a'.repeat(32)}`,
  itemReference: 'a'.repeat(32),
  minimumPriceApplied: true,
  optionsTotalKopecks: 0,
  previewHref: null,
  priceVersionNumber: 5,
  pricingStatus: 'CALCULATED',
  product: {
    additionalOptions: [],
    color: 'Белый',
    control: 'Цепь',
    family: 'Рулонные шторы',
    hardware: 'Белая',
    heightMm: 1_200,
    material: 'Альфа',
    materialArticle: 'A-100',
    model: 'Мини',
    modelCode: 'MINI',
    mounting: 'На створку',
    quantity: 1,
    system: 'Амиго',
    widthMm: 800,
  },
  quantityTotalKopecks: 150_000,
  quoteCreatedAt: '2026-08-09T00:00:00.000Z',
  revision: 1,
  unitPriceKopecks: 150_000,
  warnings: [],
  wasCalculatedWithPreviousPrice: false,
} as const;

describe('cart contracts', () => {
  it('accepts an authoritative server cart response', () => {
    expect(
      guestCartResponseSchema.parse({
        cartRevision: 1,
        correlationId: 'correlation-1234',
        csrfToken: 'x'.repeat(32),
        expiresAt: '2026-08-10T00:00:00.000Z',
        items: [item],
        priceVersionChangedItemCount: 0,
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
      }).items[0]?.quantityTotalKopecks,
    ).toBe(150_000);
  });

  it('rejects fake zero for an unknown item', () => {
    expect(() =>
      cartItemResponseSchema.parse({
        ...item,
        pricingStatus: 'PRICE_ON_REQUEST',
        quantityTotalKopecks: 0,
        unitPriceKopecks: 0,
      }),
    ).toThrow();
  });

  it('rejects client prices and recipient fields on add', () => {
    expect(() =>
      cartItemAddRequestSchema.parse({
        amount: 1,
        quoteToken: 'q'.repeat(32),
        recipient: '79999999999',
      }),
    ).toThrow();
  });

  it('supports honest family-only editing with an item revision', () => {
    expect(
      cartItemEditSourceResponseSchema.parse({
        correlationId: 'correlation-1234',
        itemReference: 'a'.repeat(32),
        itemRevision: 3,
        selection: {
          catalogVersionId: '00000000-0000-4000-8000-000000000001',
          productFamilyId: '00000000-0000-4000-8000-000000000002',
          quantity: 2,
          requestOnly: true,
        },
      }).itemRevision,
    ).toBe(3);
  });
});
