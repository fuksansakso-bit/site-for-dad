import { describe, expect, it } from 'vitest';

import {
  pricingCalculationResponseSchema,
  pricingSelectionSchema,
  quoteSaveRequestSchema,
} from '../src/pricing.js';

const selection = {
  additionalOptionIds: [],
  catalogVersionId: '00000000-0000-4000-8000-000000000001',
  configuratorModelId: '00000000-0000-4000-8000-000000000002',
  controlTypeId: 'right', hardwareOptionId: 'white', heightMm: 1_000,
  materialVariantId: '00000000-0000-4000-8000-000000000003', mountingTypeId: 'wall',
  productFamilyId: '00000000-0000-4000-8000-000000000004',
  productSystemId: '00000000-0000-4000-8000-000000000005', quantity: 2, widthMm: 800,
};

describe('QG-250..QG-257 pricing HTTP contracts', () => {
  it('accepts integer millimetres and rejects browser supplied price fields', () => {
    expect(pricingSelectionSchema.parse(selection)).toEqual(selection);
    expect(() => pricingSelectionSchema.parse({ ...selection, grandTotalKopecks: 1 })).toThrow();
    expect(() => pricingSelectionSchema.parse({ ...selection, widthMm: 1.5 })).toThrow();
  });

  it('keeps quote save input limited to the opaque calculation token', () => {
    expect(quoteSaveRequestSchema.parse({ calculationToken: 'a'.repeat(32) })).toEqual({ calculationToken: 'a'.repeat(32) });
    expect(() => quoteSaveRequestSchema.parse({ calculationToken: 'a'.repeat(32), total: 0 })).toThrow();
  });

  it('rejects fake zero totals for PRICE_ON_REQUEST', () => {
    const base = {
      appliedOverrides: [], appliedRules: [], calculatedAt: '2026-08-08T11:11:38.636Z', currency: 'RUB',
      deliveryKopecks: 0, grandTotalKopecks: null, installationKopecks: 0, measurementKopecks: 0,
      minimumPriceApplied: false, minimumPriceKopecks: 150000, optionsTotalKopecks: null,
      priceVersionId: null, productsSubtotalKopecks: null, quantity: 1, safeExplanation: 'Цена по запросу.',
      sourceVersion: null, status: 'PRICE_ON_REQUEST', unitBasePriceKopecks: null,
      unitFinalPriceKopecks: null, unitPriceBeforeMinimumKopecks: null, validationDetails: [], warnings: [],
    } as const;
    expect(pricingCalculationResponseSchema.parse({ calculationId: selection.catalogVersionId,
      calculationToken: 'b'.repeat(32), correlationId: 'contract-test', result: base }).result.grandTotalKopecks).toBeNull();
    expect(() => pricingCalculationResponseSchema.parse({ calculationId: selection.catalogVersionId,
      calculationToken: 'b'.repeat(32), correlationId: 'contract-test', result: { ...base, grandTotalKopecks: 0 } })).toThrow();
  });
});
