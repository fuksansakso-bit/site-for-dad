import { describe, expect, it } from 'vitest';

import { summarizeCart } from '../src/index.js';
import type { CartQuoteSnapshot } from '../src/types.js';

const activePriceVersionId = '00000000-0000-4000-8000-000000000005';

function quote(change: Partial<CartQuoteSnapshot> = {}): CartQuoteSnapshot {
  return {
    catalogVersionId: '00000000-0000-4000-8000-000000000002',
    createdAt: '2026-08-09T00:00:00.000Z',
    grandTotalKopecks: 400_000,
    minimumPriceApplied: false,
    optionsTotalKopecks: 20_000,
    priceVersionId: activePriceVersionId,
    product: {
      additionalOptions: ['Усиленная цепь'],
      color: 'Белый',
      control: 'Цепь',
      family: 'Рулонные шторы',
      hardware: 'Белая фурнитура',
      heightMm: 1_200,
      material: 'Альфа',
      materialArticle: 'A-100',
      model: 'Мини',
      modelCode: 'MINI',
      mounting: 'На створку',
      quantity: 2,
      system: 'Амиго',
      widthMm: 800,
    },
    status: 'CALCULATED',
    unitFinalPriceKopecks: 200_000,
    warnings: [],
    ...change,
  };
}

describe('guest cart totals', () => {
  it('keeps product/options/free-service rows exact for quantity', () => {
    const summary = summarizeCart(
      [{ itemReference: 'item-a', quote: quote() }],
      activePriceVersionId,
    );
    expect(summary.money).toMatchObject({
      deliveryKopecks: 0,
      installationKopecks: 0,
      knownOptionsKopecks: 40_000,
      knownProductsKopecks: 360_000,
      knownSubtotalKopecks: 400_000,
      measurementKopecks: 0,
      pricingStatus: 'FULLY_PRICED',
      totalQuantity: 2,
      unknownItemCount: 0,
    });
  });

  it('reports a mixed cart without treating unknown price as zero', () => {
    const summary = summarizeCart(
      [
        { itemReference: 'known', quote: quote() },
        {
          itemReference: 'unknown',
          quote: quote({
            grandTotalKopecks: null,
            optionsTotalKopecks: null,
            status: 'PRICE_ON_REQUEST',
            unitFinalPriceKopecks: null,
          }),
        },
      ],
      activePriceVersionId,
    );
    expect(summary.money).toMatchObject({
      knownSubtotalKopecks: 400_000,
      pricedItemCount: 1,
      pricingStatus: 'PARTIALLY_PRICED',
      unknownItemCount: 1,
    });
  });

  it('uses PRICE_ON_REQUEST when no item has an amount', () => {
    const unavailable = quote({
      grandTotalKopecks: null,
      optionsTotalKopecks: null,
      status: 'MANUAL_REVIEW_REQUIRED',
      unitFinalPriceKopecks: null,
    });
    expect(
      summarizeCart([{ itemReference: 'manual', quote: unavailable }], activePriceVersionId).money,
    ).toMatchObject({
      knownSubtotalKopecks: 0,
      pricedItemCount: 0,
      pricingStatus: 'PRICE_ON_REQUEST',
      unknownItemCount: 1,
    });
  });

  it('detects previous price versions without repricing', () => {
    const previous = quote({ priceVersionId: '00000000-0000-4000-8000-000000000004' });
    const summary = summarizeCart(
      [{ itemReference: 'old', quote: previous }],
      activePriceVersionId,
    );
    expect(summary.priceVersionChangedItemCount).toBe(1);
    expect(summary.money.knownSubtotalKopecks).toBe(400_000);
  });

  it('rejects inconsistent unknown-price snapshots', () => {
    expect(() =>
      summarizeCart(
        [{ itemReference: 'bad', quote: quote({ status: 'PRICE_ON_REQUEST' }) }],
        activePriceVersionId,
      ),
    ).toThrow('CART_PRICE_STATUS_INCONSISTENT');
  });
});
