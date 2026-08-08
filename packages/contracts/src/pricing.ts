import { z } from 'zod';

export const pricingCalculationStatusSchema = z.enum([
  'CALCULATED',
  'PRICE_ON_REQUEST',
  'MANUAL_REVIEW_REQUIRED',
  'CONFIGURATION_INVALID',
  'SOURCE_DATA_STALE',
  'PRICE_VERSION_INACTIVE',
  'DEPENDENCY_UNAVAILABLE',
]);

export const configuratorOptionSchema = z
  .object({
    amountMinor: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    code: z.string().min(1).max(64),
    id: z.string().min(1).max(96),
    name: z.string().min(1).max(255),
  })
  .strict();

export const pricingSelectionSchema = z
  .object({
    additionalOptionIds: z.array(z.string().min(1).max(96)).max(24),
    catalogVersionId: z.uuid(),
    configuratorModelId: z.uuid(),
    controlTypeId: z.string().min(1).max(96),
    hardwareOptionId: z.string().min(1).max(96),
    heightMm: z.number().int().min(-100_000).max(1_000_000),
    materialVariantId: z.uuid(),
    mountingTypeId: z.string().min(1).max(96),
    productFamilyId: z.uuid(),
    productSystemId: z.uuid(),
    quantity: z.number().int().min(-1_000).max(100_000),
    widthMm: z.number().int().min(-100_000).max(1_000_000),
  })
  .strict();
export type PricingSelectionContract = z.infer<typeof pricingSelectionSchema>;

export const pricingValidationDetailSchema = z
  .object({
    code: z.string().min(1).max(96),
    field: z.string().min(1).max(96),
    message: z.string().min(1).max(255),
  })
  .strict();

export const pricingValidationResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    details: z.array(pricingValidationDetailSchema).max(50),
    status: z.enum(['INVALID', 'MANUAL_REVIEW_REQUIRED', 'VALID']),
    warnings: z.array(z.string().min(1).max(255)).max(24),
  })
  .strict();

const publicPricingProfileSchema = z
  .object({
    basePriceMinor: z.number().int().nonnegative().nullable(),
    catalogVersionId: z.uuid(),
    configuratorModelId: z.uuid(),
    createdAt: z.iso.datetime({ offset: true }),
    currency: z.literal('RUB'),
    fixtureCount: z.number().int().min(10),
    id: z.uuid(),
    kind: z.enum(['AREA_MINIMUM', 'EXACT_LOOKUP']),
    materialVariantId: z.uuid(),
    maximumDeviationMinor: z.number().int().nonnegative(),
    maximumHeightMm: z.number().int().positive(),
    maximumWidthMm: z.number().int().positive(),
    minimumHeightMm: z.number().int().positive(),
    minimumWidthMm: z.number().int().positive(),
    optionData: z
      .object({
        additionalOptions: z.array(configuratorOptionSchema).max(24),
        categoryId: z.uuid(),
        categoryName: z.string().min(1).max(255),
        controlTypes: z.array(configuratorOptionSchema).min(1).max(24),
        familyName: z.string().min(1).max(255),
        hardwareOptions: z.array(configuratorOptionSchema).min(1).max(24),
        materialArticle: z.string().min(1).max(128),
        materialColor: z.string().min(1).max(255),
        materialName: z.string().min(1).max(255),
        mountingTypes: z.array(configuratorOptionSchema).min(1).max(24),
        systemName: z.string().min(1).max(255),
      })
      .strict(),
    parityStatus: z.enum(['FAILED', 'PASSED', 'PENDING']),
    priceVersionActive: z.boolean(),
    priceVersionId: z.uuid(),
    productFamilyId: z.uuid(),
    productModelCode: z.string().min(1).max(64),
    productModelName: z.string().min(1).max(255),
    productModelSourceId: z.string().min(1).max(64),
    productSystemId: z.uuid(),
    roundingRule: z.enum(['INTEGER_HALF_UP', 'NONE_EXACT_LOOKUP']),
    ruleKey: z.string().min(1).max(128),
    safeExplanation: z.string().min(1).max(1_000),
    sourceCapturedAt: z.iso.datetime({ offset: true }),
    sourcePriceCategory: z.string().max(64).nullable(),
    sourceVersion: z.string().min(1).max(160),
    verificationStatus: z.enum(['CANDIDATE', 'REJECTED', 'VERIFIED']),
    verifiedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const configuratorBootstrapResponseSchema = z
  .object({
    catalogVersionId: z.uuid(),
    catalogVersionNumber: z.number().int().positive(),
    correlationId: z.string().min(8).max(128),
    csrfToken: z.string().min(32).max(128),
    families: z
      .array(
        z
          .object({
            automaticPricing: z.boolean(),
            code: z.string().min(1).max(64),
            id: z.uuid(),
            name: z.string().min(1).max(255),
          })
          .strict(),
      )
      .max(64),
    priceVersionId: z.uuid(),
    priceVersionNumber: z.number().int().positive(),
    profiles: z.array(publicPricingProfileSchema).max(64),
  })
  .strict();
export type ConfiguratorBootstrapResponse = z.infer<typeof configuratorBootstrapResponseSchema>;

const appliedRuleSchema = z
  .object({
    ruleId: z.uuid(),
    ruleKey: z.string().min(1).max(128),
    ruleKind: z.enum(['AREA_MINIMUM', 'EXACT_LOOKUP']),
    sourceReference: z.string().min(1).max(255),
  })
  .strict();

export const pricingResultSchema = z
  .object({
    appliedOverrides: z
      .array(
        z
          .object({
            amountMinor: z.number().int().nonnegative(),
            id: z.uuid(),
            reason: z.string().min(1).max(512),
          })
          .strict(),
      )
      .max(8),
    appliedRules: z.array(appliedRuleSchema).max(16),
    calculatedAt: z.iso.datetime({ offset: true }),
    currency: z.literal('RUB'),
    deliveryKopecks: z.literal(0),
    grandTotalKopecks: z.number().int().nonnegative().nullable(),
    installationKopecks: z.literal(0),
    measurementKopecks: z.literal(0),
    minimumPriceApplied: z.boolean(),
    minimumPriceKopecks: z.literal(150_000),
    optionsTotalKopecks: z.number().int().nonnegative().nullable(),
    priceVersionId: z.uuid().nullable(),
    productsSubtotalKopecks: z.number().int().nonnegative().nullable(),
    quantity: z.number().int(),
    safeExplanation: z.string().min(1).max(1_000),
    sourceVersion: z.string().min(1).max(160).nullable(),
    status: pricingCalculationStatusSchema,
    unitBasePriceKopecks: z.number().int().nonnegative().nullable(),
    unitFinalPriceKopecks: z.number().int().nonnegative().nullable(),
    unitPriceBeforeMinimumKopecks: z.number().int().nonnegative().nullable(),
    validationDetails: z.array(pricingValidationDetailSchema).max(50),
    warnings: z.array(z.string().min(1).max(255)).max(24),
  })
  .strict()
  .superRefine((result, context) => {
    const hasAmount = result.grandTotalKopecks !== null;
    const calculated = result.status === 'CALCULATED' || result.status === 'SOURCE_DATA_STALE';
    if (calculated !== hasAmount) {
      context.addIssue({
        code: 'custom',
        message: 'Pricing status and amount are inconsistent.',
        path: ['grandTotalKopecks'],
      });
    }
    if (
      !calculated &&
      [
        result.unitBasePriceKopecks,
        result.unitFinalPriceKopecks,
        result.unitPriceBeforeMinimumKopecks,
        result.optionsTotalKopecks,
        result.productsSubtotalKopecks,
      ].some((value) => value !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unavailable pricing must not contain amounts.',
        path: ['status'],
      });
    }
  });

export const pricingCalculationResponseSchema = z
  .object({
    calculationId: z.uuid(),
    calculationToken: z.string().min(32).max(64),
    correlationId: z.string().min(8).max(128),
    result: pricingResultSchema,
  })
  .strict();
export type PricingCalculationResponse = z.infer<typeof pricingCalculationResponseSchema>;

export const quoteSaveRequestSchema = z
  .object({ calculationToken: z.string().min(32).max(64) })
  .strict();
export const quoteSnapshotResponseSchema = z
  .object({
    breakdown: pricingResultSchema,
    catalogVersionId: z.uuid(),
    configuration: z.record(z.string(), z.unknown()),
    correlationId: z.string().min(8).max(128),
    createdAt: z.iso.datetime({ offset: true }),
    priceVersionId: z.uuid().nullable(),
    quoteToken: z.string().min(32).max(64),
    sourceVersion: z.string().min(1).max(160).nullable(),
    status: pricingCalculationStatusSchema,
  })
  .strict();
export type QuoteSnapshotResponse = z.infer<typeof quoteSnapshotResponseSchema>;

export const pricingAdminCommandSchema = z
  .object({
    priceVersionId: z.uuid(),
    reason: z.string().trim().min(3).max(512),
  })
  .strict();

export const pricingOverrideSetSchema = z
  .object({
    amountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    materialVariantId: z.uuid(),
    reason: z.string().trim().min(3).max(512),
  })
  .strict();

export const pricingOverrideRemoveSchema = z
  .object({
    materialVariantId: z.uuid(),
    reason: z.string().trim().min(3).max(512),
  })
  .strict();

export const pricingAdminOverviewResponseSchema = z
  .object({
    activePriceVersionId: z.uuid().nullable(),
    audit: z
      .array(
        z
          .object({
            action: z.string().min(1).max(128),
            actorId: z.uuid().nullable(),
            createdAt: z.iso.datetime({ offset: true }),
            outcome: z.string().min(1).max(32),
            reasonCode: z.string().min(1).max(128),
            targetId: z.string().min(1).max(255),
          })
          .strict(),
      )
      .max(30),
    correlationId: z.string().min(8).max(128),
    versions: z
      .array(
        z
          .object({
            activatedAt: z.iso.datetime({ offset: true }).nullable(),
            changeCount: z.number().int().nonnegative(),
            createdAt: z.iso.datetime({ offset: true }),
            fixtureCount: z.number().int().nonnegative(),
            id: z.uuid(),
            maximumDeviationMinor: z.number().int().nonnegative().nullable(),
            parityStatus: z.enum(['FAILED', 'PASSED', 'PENDING']).nullable(),
            ruleCount: z.number().int().nonnegative(),
            sourceVersion: z.string().max(160).nullable(),
            status: z.string().min(1).max(32),
            unsupportedCount: z.number().int().nonnegative(),
            versionNumber: z.number().int().positive(),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();

export const pricingAdminMutationResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    id: z.string().min(1).max(255).optional(),
    ok: z.literal(true),
  })
  .strict();
