import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  calculatePrice,
  minimumUnitPriceKopecks,
  multiplyDivideRoundHalfUp,
  validatePricingSelection,
  verifyPricingParity,
  type ConfiguratorOption,
  type PricingRuleProfile,
  type PricingSelection,
} from '../src/index.js';

const zeroOption = (id: string, name = id): ConfiguratorOption => ({ amountMinor: 0, code: id, id, name });

function profile(overrides: Partial<PricingRuleProfile> = {}): PricingRuleProfile {
  return {
    basePriceMinor: 100_000,
    catalogVersionId: '00000000-0000-4000-8000-000000000001',
    configuratorModelId: '00000000-0000-4000-8000-000000000004',
    createdAt: '2026-08-08T11:11:38.636Z',
    currency: 'RUB',
    fixtureCount: 10,
    id: '00000000-0000-4000-8000-000000000006',
    kind: 'AREA_MINIMUM',
    materialVariantId: '00000000-0000-4000-8000-000000000005',
    maximumDeviationMinor: 0,
    maximumHeightMm: 3_000,
    maximumWidthMm: 3_000,
    minimumHeightMm: 200,
    minimumWidthMm: 200,
    optionData: {
      additionalOptions: [{ amountMinor: 5_000, code: 'OPTION', id: 'option', name: 'Опция' }],
      categoryId: '00000000-0000-4000-8000-000000000007',
      categoryName: 'Категория',
      controlTypes: [zeroOption('right')],
      familyName: 'Семейство',
      hardwareOptions: [zeroOption('white')],
      materialArticle: 'TEST',
      materialColor: 'Белый',
      materialName: 'Материал',
      mountingTypes: [zeroOption('wall')],
      systemName: 'Система',
    },
    parityStatus: 'PASSED',
    priceVersionActive: true,
    priceVersionId: '00000000-0000-4000-8000-000000000002',
    productFamilyId: '00000000-0000-4000-8000-000000000003',
    productModelCode: 'TEST',
    productModelName: 'Модель',
    productModelSourceId: 'test',
    productSystemId: '00000000-0000-4000-8000-000000000008',
    roundingRule: 'INTEGER_HALF_UP',
    ruleData: { minimumBillableAreaSquareMm: 1_000_000 },
    ruleKey: 'test-area',
    safeExplanation: 'Проверенное правило.',
    sourceCapturedAt: '2026-08-08T11:11:38.636Z',
    sourcePriceCategory: '1',
    sourceReference: 'TEST-SOURCE',
    sourceVersion: 'test-v1',
    testExamples: Array.from({ length: 10 }, () => ({ expectedMinor: 150_000, heightMm: 1_000, widthMm: 1_000 })),
    verificationStatus: 'VERIFIED',
    verifiedAt: '2026-08-08T11:11:38.636Z',
    ...overrides,
  };
}

function selection(rule = profile(), overrides: Partial<PricingSelection> = {}): PricingSelection {
  return {
    additionalOptionIds: [],
    catalogVersionId: rule.catalogVersionId,
    configuratorModelId: rule.configuratorModelId,
    controlTypeId: 'right',
    hardwareOptionId: 'white',
    heightMm: 500,
    materialVariantId: rule.materialVariantId,
    mountingTypeId: 'wall',
    productFamilyId: rule.productFamilyId,
    productSystemId: rule.productSystemId,
    quantity: 1,
    widthMm: 500,
    ...overrides,
  };
}

describe('QG-241..QG-249 deterministic integer pricing', () => {
  it('rounds rational integer conversion half up without float money', () => {
    expect(multiplyDivideRoundHalfUp(101, 5, 10)).toBe(51);
    expect(multiplyDivideRoundHalfUp(100, 5, 10)).toBe(50);
    expect(() => multiplyDivideRoundHalfUp(Number.MAX_SAFE_INTEGER, 2, 1)).toThrow('INTEGER_MONEY_OVERFLOW');
  });

  it('applies the 1500 RUB minimum to each unit before quantity', () => {
    const rule = profile();
    const result = calculatePrice({ calculatedAt: rule.createdAt, profile: rule, selection: selection(rule, { quantity: 3 }) });
    expect(result).toMatchObject({
      grandTotalKopecks: 450_000,
      minimumPriceApplied: true,
      minimumPriceKopecks: minimumUnitPriceKopecks,
      productsSubtotalKopecks: 450_000,
      quantity: 3,
      unitFinalPriceKopecks: 150_000,
      unitPriceBeforeMinimumKopecks: 100_000,
    });
  });

  it('keeps measurement, delivery and installation as separate free lines', () => {
    const rule = profile();
    expect(calculatePrice({ calculatedAt: rule.createdAt, profile: rule, selection: selection(rule) })).toMatchObject({
      deliveryKopecks: 0, installationKopecks: 0, measurementKopecks: 0,
    });
  });

  it('gives a local override precedence and records it', () => {
    const rule = profile();
    const result = calculatePrice({
      calculatedAt: rule.createdAt,
      localOverride: { amountMinor: 210_000, id: '00000000-0000-4000-8000-000000000009', reason: 'Owner decision' },
      profile: rule,
      selection: selection(rule),
    });
    expect(result.unitBasePriceKopecks).toBe(210_000);
    expect(result.appliedOverrides).toHaveLength(1);
  });

  it('adds only selected compatible options', () => {
    const rule = profile();
    const result = calculatePrice({ calculatedAt: rule.createdAt, profile: rule,
      selection: selection(rule, { additionalOptionIds: ['option'] }) });
    expect(result.optionsTotalKopecks).toBe(5_000);
  });

  it('does not use inactive or unverified versions and never returns fake zero', () => {
    const inactive = profile({ priceVersionActive: false });
    expect(calculatePrice({ calculatedAt: inactive.createdAt, profile: inactive, selection: selection(inactive) })).toMatchObject({
      grandTotalKopecks: null, status: 'PRICE_VERSION_INACTIVE',
    });
    const request = calculatePrice({ calculatedAt: inactive.createdAt, profile: null, selection: selection(inactive) });
    expect(request).toMatchObject({ grandTotalKopecks: null, status: 'PRICE_ON_REQUEST' });
  });

  it('rejects incompatible choices and sends unconfirmed dimensions to manual review', () => {
    const rule = profile();
    expect(validatePricingSelection(rule, selection(rule, { hardwareOptionId: 'hidden' })).status).toBe('INVALID');
    expect(calculatePrice({ calculatedAt: rule.createdAt, profile: rule,
      selection: selection(rule, { widthMm: 3_001 }) }).status).toBe('MANUAL_REVIEW_REQUIRED');
  });

  it.each([
    [{ widthMm: 0 }, 'CONFIGURATION_INVALID'],
    [{ heightMm: -1 }, 'CONFIGURATION_INVALID'],
    [{ quantity: 0 }, 'CONFIGURATION_INVALID'],
    [{ quantity: 1_001 }, 'CONFIGURATION_INVALID'],
    [{ widthMm: 100_001 }, 'CONFIGURATION_INVALID'],
  ] as const)('handles boundary input %j', (change, status) => {
    const rule = profile();
    expect(calculatePrice({ calculatedAt: rule.createdAt, profile: rule, selection: selection(rule, change) }).status).toBe(status);
  });
});

interface FixtureRule {
  readonly additionalOptions: ConfiguratorOption[]; readonly basePriceMinor: number | null;
  readonly categoryId: string; readonly categoryName: string; readonly controlTypes: ConfiguratorOption[];
  readonly familyId: string; readonly familyName: string; readonly fixtures: PricingRuleProfile['testExamples'];
  readonly hardwareOptions: ConfiguratorOption[]; readonly id: string; readonly kind: PricingRuleProfile['kind'];
  readonly materialArticle: string; readonly materialColor: string; readonly materialName: string;
  readonly materialVariantId: string; readonly maximumHeightMm: number; readonly maximumWidthMm: number;
  readonly minimumHeightMm: number; readonly minimumWidthMm: number; readonly modelCode: string;
  readonly modelId: string; readonly modelName: string; readonly modelSourceId: string;
  readonly mountingTypes: ConfiguratorOption[]; readonly roundingRule: PricingRuleProfile['roundingRule'];
  readonly ruleKey: string; readonly safeExplanation: string; readonly sourcePriceCategory: string;
  readonly systemId: string; readonly systemName: string;
}

it('QG-263 verifies 40 dated fixtures, at least 10 per MVP family, within 1 RUB', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/amigo-phase1c-parity.json', import.meta.url), 'utf8')) as {
    capturedAt: string; sourceReference: string; sourceVersion: string; rules: FixtureRule[];
  };
  const profiles = fixture.rules.map((rule): PricingRuleProfile => ({
    ...profile(),
    basePriceMinor: rule.basePriceMinor,
    configuratorModelId: rule.modelId,
    fixtureCount: rule.fixtures.length,
    id: rule.id,
    kind: rule.kind,
    materialVariantId: rule.materialVariantId,
    maximumHeightMm: rule.maximumHeightMm,
    maximumWidthMm: rule.maximumWidthMm,
    minimumHeightMm: rule.minimumHeightMm,
    minimumWidthMm: rule.minimumWidthMm,
    optionData: { additionalOptions: rule.additionalOptions, categoryId: rule.categoryId,
      categoryName: rule.categoryName, controlTypes: rule.controlTypes, familyName: rule.familyName,
      hardwareOptions: rule.hardwareOptions, materialArticle: rule.materialArticle,
      materialColor: rule.materialColor, materialName: rule.materialName,
      mountingTypes: rule.mountingTypes, systemName: rule.systemName },
    productFamilyId: rule.familyId,
    productModelCode: rule.modelCode,
    productModelName: rule.modelName,
    productModelSourceId: rule.modelSourceId,
    productSystemId: rule.systemId,
    roundingRule: rule.roundingRule,
    ruleData: rule.kind === 'AREA_MINIMUM' ? { minimumBillableAreaSquareMm: 1_000_000 }
      : { pricesMinor: Object.fromEntries(rule.fixtures.map((item) => [`${item.widthMm}x${item.heightMm}`, item.expectedMinor])) },
    ruleKey: rule.ruleKey,
    safeExplanation: rule.safeExplanation,
    sourceCapturedAt: fixture.capturedAt,
    sourcePriceCategory: rule.sourcePriceCategory,
    sourceReference: fixture.sourceReference,
    sourceVersion: fixture.sourceVersion,
    testExamples: rule.fixtures,
    verifiedAt: fixture.capturedAt,
  }));
  const result = verifyPricingParity(profiles, fixture.capturedAt);
  expect(profiles).toHaveLength(4);
  expect(profiles.every((item) => item.fixtureCount >= 10)).toBe(true);
  expect(result).toMatchObject({ failedCount: 0, fixtureCount: 40, maximumDeviationMinor: 100, status: 'PASSED' });
});
