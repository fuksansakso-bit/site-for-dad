import { validatePricingSelection } from './validation.js';
import type {
  ConfiguratorOption,
  PricingCalculationInput,
  PricingResult,
  PricingRuleProfile,
} from './types.js';

export const minimumUnitPriceKopecks = 150_000 as const;

function safeInteger(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('INTEGER_MONEY_OVERFLOW');
  }
  return Number(value);
}

export function multiplyDivideRoundHalfUp(
  multiplicand: number,
  multiplier: number,
  divisor: number,
): number {
  if (
    !Number.isSafeInteger(multiplicand) ||
    !Number.isSafeInteger(multiplier) ||
    !Number.isSafeInteger(divisor) ||
    multiplicand < 0 ||
    multiplier < 0 ||
    divisor <= 0
  ) {
    throw new RangeError('INTEGER_MONEY_INPUT_INVALID');
  }
  const denominator = BigInt(divisor);
  const numerator = BigInt(multiplicand) * BigInt(multiplier);
  return safeInteger((numerator + denominator / 2n) / denominator);
}

function emptyResult(
  input: PricingCalculationInput,
  status: PricingResult['status'],
  explanation: string,
  warnings: readonly string[] = [],
  validationDetails: PricingResult['validationDetails'] = [],
): PricingResult {
  return {
    appliedOverrides: [],
    appliedRules: [],
    calculatedAt: input.calculatedAt,
    currency: 'RUB',
    deliveryKopecks: 0,
    grandTotalKopecks: null,
    installationKopecks: 0,
    measurementKopecks: 0,
    minimumPriceApplied: false,
    minimumPriceKopecks: minimumUnitPriceKopecks,
    optionsTotalKopecks: null,
    priceVersionId: input.profile?.priceVersionId ?? null,
    productsSubtotalKopecks: null,
    quantity: input.selection.quantity,
    safeExplanation: explanation,
    sourceVersion: input.profile?.sourceVersion ?? null,
    status,
    unitBasePriceKopecks: null,
    unitFinalPriceKopecks: null,
    unitPriceBeforeMinimumKopecks: null,
    validationDetails,
    warnings,
  };
}

function optionAmount(options: readonly ConfiguratorOption[], id: string): number {
  return options.find((option) => option.id === id)?.amountMinor ?? 0;
}

function selectedOptionsTotal(profile: PricingRuleProfile, input: PricingCalculationInput): number {
  const selected = input.selection;
  const amounts = [
    optionAmount(profile.optionData.mountingTypes, selected.mountingTypeId),
    optionAmount(profile.optionData.hardwareOptions, selected.hardwareOptionId),
    optionAmount(profile.optionData.controlTypes, selected.controlTypeId),
    ...selected.additionalOptionIds.map((id) =>
      optionAmount(profile.optionData.additionalOptions, id),
    ),
  ];
  return safeInteger(amounts.reduce((total, amount) => total + BigInt(amount), 0n));
}

function sourceUnitPrice(
  profile: PricingRuleProfile,
  input: PricingCalculationInput,
): number | null {
  if (profile.kind === 'EXACT_LOOKUP') {
    const data = profile.ruleData as { readonly pricesMinor: Readonly<Record<string, number>> };
    return data.pricesMinor[`${input.selection.widthMm}x${input.selection.heightMm}`] ?? null;
  }
  if (profile.basePriceMinor === null) return null;
  const data = profile.ruleData as { readonly minimumBillableAreaSquareMm: number };
  const areaSquareMm = safeInteger(
    BigInt(input.selection.widthMm) * BigInt(input.selection.heightMm),
  );
  return safeInteger(
    BigInt(
      multiplyDivideRoundHalfUp(
        profile.basePriceMinor,
        Math.max(data.minimumBillableAreaSquareMm, areaSquareMm),
        100_000_000,
      ),
    ) * 100n,
  );
}

export function calculatePrice(input: PricingCalculationInput): PricingResult {
  const profile = input.profile;
  if (profile === null) {
    return emptyResult(
      input,
      'PRICE_ON_REQUEST',
      'Для выбранного сочетания цена рассчитывается по запросу.',
    );
  }
  if (!profile.priceVersionActive) {
    return emptyResult(
      input,
      'PRICE_VERSION_INACTIVE',
      'Версия цены недоступна для публичного расчёта.',
    );
  }
  if (profile.verificationStatus !== 'VERIFIED' || profile.parityStatus !== 'PASSED') {
    return emptyResult(input, 'PRICE_ON_REQUEST', 'Правило цены ожидает подтверждения.');
  }
  const validation = validatePricingSelection(profile, input.selection);
  if (validation.status === 'INVALID') {
    return emptyResult(
      input,
      'CONFIGURATION_INVALID',
      'Проверьте выбранные параметры.',
      [],
      validation.details,
    );
  }
  if (validation.status === 'MANUAL_REVIEW_REQUIRED') {
    return emptyResult(
      input,
      'MANUAL_REVIEW_REQUIRED',
      'Размер требует проверки мастером.',
      validation.warnings,
    );
  }

  try {
    const sourcePrice = sourceUnitPrice(profile, input);
    if (sourcePrice === null) {
      return emptyResult(input, 'MANUAL_REVIEW_REQUIRED', 'Размер требует проверки мастером.', [
        'Размер требует проверки мастером',
      ]);
    }
    const effectiveBasePrice = input.localOverride?.amountMinor ?? sourcePrice;
    if (!Number.isSafeInteger(effectiveBasePrice) || effectiveBasePrice < 0) {
      return emptyResult(input, 'DEPENDENCY_UNAVAILABLE', 'Расчёт временно недоступен.');
    }
    const optionsTotal = selectedOptionsTotal(profile, input);
    const beforeMinimum = safeInteger(BigInt(effectiveBasePrice) + BigInt(optionsTotal));
    const unitFinal = Math.max(beforeMinimum, minimumUnitPriceKopecks);
    const subtotal = safeInteger(BigInt(unitFinal) * BigInt(input.selection.quantity));
    const stale = input.sourceDataStale === true;
    return {
      appliedOverrides:
        input.localOverride === undefined
          ? []
          : [
              {
                amountMinor: input.localOverride.amountMinor,
                id: input.localOverride.id,
                reason: input.localOverride.reason,
              },
            ],
      appliedRules: [
        {
          ruleId: profile.id,
          ruleKey: profile.ruleKey,
          ruleKind: profile.kind,
          sourceReference: profile.sourceReference,
        },
      ],
      calculatedAt: input.calculatedAt,
      currency: 'RUB',
      deliveryKopecks: 0,
      grandTotalKopecks: subtotal,
      installationKopecks: 0,
      measurementKopecks: 0,
      minimumPriceApplied: beforeMinimum < minimumUnitPriceKopecks,
      minimumPriceKopecks: minimumUnitPriceKopecks,
      optionsTotalKopecks: optionsTotal,
      priceVersionId: profile.priceVersionId,
      productsSubtotalKopecks: subtotal,
      quantity: input.selection.quantity,
      safeExplanation: stale
        ? 'Расчёт выполнен по последней активной подтверждённой версии; источник требует обновления.'
        : profile.safeExplanation,
      sourceVersion: profile.sourceVersion,
      status: stale ? 'SOURCE_DATA_STALE' : 'CALCULATED',
      unitBasePriceKopecks: effectiveBasePrice,
      unitFinalPriceKopecks: unitFinal,
      unitPriceBeforeMinimumKopecks: beforeMinimum,
      validationDetails: [],
      warnings: stale ? ['Источник цены требует административной проверки.'] : [],
    };
  } catch {
    return emptyResult(
      input,
      'CONFIGURATION_INVALID',
      'Значения слишком велики для безопасного расчёта.',
    );
  }
}
