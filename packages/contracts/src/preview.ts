import { z } from 'zod';

export const previewAssetQualitySchema = z.enum([
  'EXACT_SWATCH',
  'PRODUCT_IMAGE_CROP',
  'NORMALIZED_COLOR_ONLY',
  'PREVIEW_UNAVAILABLE',
]);

export const previewFamilyCodeSchema = z.enum([
  'ROLLER',
  'ZEBRA',
  'HORIZONTAL_ALUMINUM',
  'VERTICAL',
]);

export const previewSceneIdSchema = z.enum(['WINDOW_CLOSEUP', 'ROOM_WINDOW']);

export const previewEligibilityReasonSchema = z.enum([
  'ELIGIBLE',
  'CATALOG_VERSION_CHANGED',
  'PRICE_VERSION_CHANGED',
  'CONFIGURATION_INVALID',
  'MATERIAL_UNAVAILABLE',
  'UNSUPPORTED_FAMILY',
  'ASSET_UNAVAILABLE',
]);

export const previewControlsSchema = z
  .object({
    openingPosition: z.number().int().min(0).max(100),
    slatAngle: z.number().int().min(-75).max(75),
    verticalSpread: z.number().int().min(0).max(100),
    zebraAlignment: z.number().int().min(0).max(100),
    zoom: z.number().int().min(100).max(180),
  })
  .strict();

export const previewControlPatchSchema = previewControlsSchema.partial();

export const previewSourceRequestSchema = z
  .object({
    calculationToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32}$/u)
      .optional(),
    quoteToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32}$/u)
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      Number(value.calculationToken !== undefined) + Number(value.quoteToken !== undefined) === 1,
    {
      message: 'Exactly one source token is required.',
    },
  );
export type PreviewSourceRequest = z.infer<typeof previewSourceRequestSchema>;

export const previewConfigurationSchema = z
  .object({
    dimensions: z
      .object({ heightMm: z.number().int().positive(), widthMm: z.number().int().positive() })
      .strict(),
    family: z
      .object({ code: z.string().min(1).max(64), id: z.uuid(), name: z.string().min(1).max(255) })
      .strict(),
    hardware: z
      .object({
        color: z.string().regex(/^#[0-9A-F]{6}$/u),
        label: z.string().min(1).max(255),
        optionId: z.string().min(1).max(96),
      })
      .strict(),
    material: z
      .object({
        article: z.string().min(1).max(128),
        colorName: z.string().min(1).max(255),
        id: z.uuid(),
        name: z.string().min(1).max(255),
      })
      .strict(),
    model: z
      .object({
        code: z.string().min(1).max(64),
        id: z.uuid(),
        name: z.string().min(1).max(255),
      })
      .strict(),
    system: z.object({ id: z.uuid(), name: z.string().min(1).max(255) }).strict(),
  })
  .strict();

export const previewEligibilityResponseSchema = z
  .object({
    assetQuality: previewAssetQualitySchema,
    configuration: previewConfigurationSchema,
    correlationId: z.string().min(8).max(128),
    eligible: z.boolean(),
    family: previewFamilyCodeSchema.nullable(),
    reason: previewEligibilityReasonSchema,
    warnings: z.array(previewEligibilityReasonSchema).max(8),
  })
  .strict();
export type PreviewEligibilityResponse = z.infer<typeof previewEligibilityResponseSchema>;

export const previewSceneSchema = z
  .object({
    description: z.string().min(1).max(255),
    id: previewSceneIdSchema,
    label: z.string().min(1).max(96),
    version: z.literal(2),
  })
  .strict();

export const previewScenesResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    scenes: z.array(previewSceneSchema).min(2).max(24),
  })
  .strict();

export const standardPreviewStateResponseSchema = z
  .object({
    asset: z
      .object({
        normalizedColor: z
          .string()
          .regex(/^#[0-9A-F]{6}$/u)
          .nullable(),
        quality: previewAssetQualitySchema,
        url: z.string().startsWith('/api/v1/previews/').max(255).nullable(),
      })
      .strict(),
    configuration: previewConfigurationSchema,
    controls: previewControlsSchema,
    correlationId: z.string().min(8).max(128),
    createdAt: z.iso.datetime({ offset: true }),
    csrfToken: z.string().min(32).max(128),
    eligibility: z
      .object({
        eligible: z.boolean(),
        reason: previewEligibilityReasonSchema,
        warnings: z.array(previewEligibilityReasonSchema).max(8),
      })
      .strict(),
    family: previewFamilyCodeSchema.nullable(),
    familyParameters: z
      .object({
        controlSide: z.enum(['LEFT', 'RIGHT']).nullable(),
        hasCassette: z.boolean(),
        hasGuides: z.boolean(),
        horizontalSlatWidthMm: z.number().positive().nullable(),
        verticalLamellaWidthMm: z.number().positive().nullable(),
        verticalOpeningDirection: z.enum(['CENTER', 'LEFT', 'RIGHT']).nullable(),
      })
      .strict(),
    id: z.string().regex(/^[A-Za-z0-9_-]{32}$/u),
    rendererVersion: z.literal('standard-svg-v2'),
    sceneId: previewSceneIdSchema,
    stateChecksum: z.string().regex(/^[0-9a-f]{64}$/u),
    stateVersion: z.literal(1),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();
export type StandardPreviewStateResponse = z.infer<typeof standardPreviewStateResponseSchema>;

export const previewCreateResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    href: z.string().regex(/^\/preview\?state=[A-Za-z0-9_-]{32}$/u),
    previewStateId: z.string().regex(/^[A-Za-z0-9_-]{32}$/u),
  })
  .strict();

export const previewStateUpdateSchema = z
  .object({
    controls: previewControlPatchSchema.optional(),
    sceneId: previewSceneIdSchema.optional(),
  })
  .strict()
  .refine((value) => value.controls !== undefined || value.sceneId !== undefined, {
    message: 'At least one preview change is required.',
  });
export type PreviewStateUpdate = z.infer<typeof previewStateUpdateSchema>;

export const previewDeleteResponseSchema = z
  .object({ correlationId: z.string().min(8).max(128), deleted: z.literal(true) })
  .strict();

export const previewDiagnosticsResponseSchema = z
  .object({
    activePreviewableVariants: z.number().int().nonnegative(),
    correlationId: z.string().min(8).max(128),
    counts: z.record(previewAssetQualitySchema, z.number().int().nonnegative()),
    familyCounts: z.record(z.string().min(1).max(64), z.number().int().nonnegative()),
    missingCompatibility: z.number().int().nonnegative(),
    missingSwatch: z.number().int().nonnegative(),
    sceneCount: z.number().int().min(2),
    storedStates: z.number().int().nonnegative(),
  })
  .strict();
