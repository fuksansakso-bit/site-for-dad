import { calculatePrice } from './engine.js';
import type { ParityVerificationResult, PricingRuleProfile, PricingSelection } from './types.js';

function firstId(values: readonly { readonly id: string }[]): string {
  const first = values[0];
  if (first === undefined) throw new Error('PRICING_RULE_OPTIONS_INVALID');
  return first.id;
}

export function verifyPricingParity(
  profiles: readonly PricingRuleProfile[],
  calculatedAt = '2026-08-08T11:11:38.636Z',
): ParityVerificationResult {
  const ruleResults = profiles.map((profile) => {
    let failedCount = 0;
    let maximumDeviationMinor = 0;
    for (const fixture of profile.testExamples) {
      const selection: PricingSelection = {
        additionalOptionIds: [],
        catalogVersionId: profile.catalogVersionId,
        configuratorModelId: profile.configuratorModelId,
        controlTypeId: firstId(profile.optionData.controlTypes),
        hardwareOptionId: firstId(profile.optionData.hardwareOptions),
        heightMm: fixture.heightMm,
        materialVariantId: profile.materialVariantId,
        mountingTypeId: firstId(profile.optionData.mountingTypes),
        productFamilyId: profile.productFamilyId,
        productSystemId: profile.productSystemId,
        quantity: 1,
        widthMm: fixture.widthMm,
      };
      const result = calculatePrice({ calculatedAt, profile, selection });
      const actual = result.unitFinalPriceKopecks;
      const deviation =
        actual === null ? Number.MAX_SAFE_INTEGER : Math.abs(actual - fixture.expectedMinor);
      maximumDeviationMinor = Math.max(maximumDeviationMinor, deviation);
      if (deviation > 100) failedCount += 1;
    }
    return {
      failedCount,
      fixtureCount: profile.testExamples.length,
      maximumDeviationMinor,
      ruleId: profile.id,
      ruleKey: profile.ruleKey,
    };
  });
  const fixtureCount = ruleResults.reduce((total, result) => total + result.fixtureCount, 0);
  const failedCount = ruleResults.reduce((total, result) => total + result.failedCount, 0);
  const maximumDeviationMinor = ruleResults.reduce(
    (maximum, result) => Math.max(maximum, result.maximumDeviationMinor),
    0,
  );
  return {
    failedCount,
    fixtureCount,
    maximumDeviationMinor,
    passedCount: fixtureCount - failedCount,
    ruleResults,
    status: failedCount === 0 && profiles.length > 0 ? 'PASSED' : 'FAILED',
  };
}
