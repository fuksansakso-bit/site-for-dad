import type {
  ConfiguratorOption,
  PricingRuleProfile,
  PricingSelection,
  PricingValidationDetail,
  PricingValidationResult,
} from './types.js';

const maximumInputDimensionMm = 100_000;
const maximumQuantity = 1_000;

function hasOption(options: readonly ConfiguratorOption[], id: string): boolean {
  return options.some((option) => option.id === id);
}

export function validatePricingSelection(
  profile: PricingRuleProfile,
  selection: PricingSelection,
): PricingValidationResult {
  const details: PricingValidationDetail[] = [];
  const invalid = (field: PricingValidationDetail['field'], code: string, message: string) =>
    details.push({ code, field, message });

  if (!Number.isSafeInteger(selection.widthMm) || selection.widthMm <= 0) {
    invalid('widthMm', 'POSITIVE_INTEGER_REQUIRED', 'Ширина должна быть целым числом миллиметров.');
  }
  if (!Number.isSafeInteger(selection.heightMm) || selection.heightMm <= 0) {
    invalid(
      'heightMm',
      'POSITIVE_INTEGER_REQUIRED',
      'Высота должна быть целым числом миллиметров.',
    );
  }
  if (
    (Number.isSafeInteger(selection.widthMm) && selection.widthMm > maximumInputDimensionMm) ||
    (Number.isSafeInteger(selection.heightMm) && selection.heightMm > maximumInputDimensionMm)
  ) {
    invalid('configuration', 'DIMENSION_TOO_LARGE', 'Размер выходит за безопасный диапазон ввода.');
  }
  if (
    !Number.isSafeInteger(selection.quantity) ||
    selection.quantity < 1 ||
    selection.quantity > maximumQuantity
  ) {
    invalid('quantity', 'QUANTITY_OUT_OF_RANGE', 'Количество должно быть от 1 до 1000.');
  }
  const exactIdentifiers = [
    ['catalogVersionId', selection.catalogVersionId, profile.catalogVersionId],
    ['productFamilyId', selection.productFamilyId, profile.productFamilyId],
    ['productSystemId', selection.productSystemId, profile.productSystemId],
    ['configuratorModelId', selection.configuratorModelId, profile.configuratorModelId],
    ['materialVariantId', selection.materialVariantId, profile.materialVariantId],
  ] as const;
  for (const [field, actual, expected] of exactIdentifiers) {
    if (actual !== expected) {
      invalid(field, 'INCOMPATIBLE_SELECTION', 'Выбранное значение несовместимо с конфигурацией.');
    }
  }
  if (!hasOption(profile.optionData.mountingTypes, selection.mountingTypeId)) {
    invalid('mountingTypeId', 'INCOMPATIBLE_MOUNTING', 'Способ монтажа недоступен.');
  }
  if (!hasOption(profile.optionData.hardwareOptions, selection.hardwareOptionId)) {
    invalid('hardwareOptionId', 'INCOMPATIBLE_HARDWARE', 'Фурнитура недоступна.');
  }
  if (!hasOption(profile.optionData.controlTypes, selection.controlTypeId)) {
    invalid('controlTypeId', 'INCOMPATIBLE_CONTROL', 'Сторона управления недоступна.');
  }
  if (new Set(selection.additionalOptionIds).size !== selection.additionalOptionIds.length) {
    invalid('additionalOptionIds', 'DUPLICATE_OPTION', 'Дополнительная опция выбрана повторно.');
  }
  for (const optionId of selection.additionalOptionIds) {
    if (!hasOption(profile.optionData.additionalOptions, optionId)) {
      invalid('additionalOptionIds', 'INCOMPATIBLE_OPTION', 'Дополнительная опция недоступна.');
    }
  }
  if (details.length > 0) return { details, status: 'INVALID', warnings: [] };

  if (
    selection.widthMm < profile.minimumWidthMm ||
    selection.widthMm > profile.maximumWidthMm ||
    selection.heightMm < profile.minimumHeightMm ||
    selection.heightMm > profile.maximumHeightMm
  ) {
    return {
      details: [],
      status: 'MANUAL_REVIEW_REQUIRED',
      warnings: ['Размер требует проверки мастером'],
    };
  }
  return { details: [], status: 'VALID', warnings: [] };
}

export function filterCompatibleProfiles(
  profiles: readonly PricingRuleProfile[],
  partial: Partial<PricingSelection>,
): readonly PricingRuleProfile[] {
  return profiles.filter(
    (profile) =>
      (partial.catalogVersionId === undefined ||
        partial.catalogVersionId === profile.catalogVersionId) &&
      (partial.productFamilyId === undefined ||
        partial.productFamilyId === profile.productFamilyId) &&
      (partial.productSystemId === undefined ||
        partial.productSystemId === profile.productSystemId) &&
      (partial.configuratorModelId === undefined ||
        partial.configuratorModelId === profile.configuratorModelId) &&
      (partial.materialVariantId === undefined ||
        partial.materialVariantId === profile.materialVariantId),
  );
}
