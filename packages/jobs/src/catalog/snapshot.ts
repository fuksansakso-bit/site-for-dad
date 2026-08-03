import { z } from 'zod';

const sourceTypeSchema = z.enum([
  'PARTNER_API',
  'PARTNER_EXPORT',
  'PARTNER_FILE',
  'PARTNER_PORTAL',
  'AUTHORIZED_PUBLIC_WEB',
  'MANUAL_MANIFEST',
  'FIXTURE',
]);
const sourceEntityTypeSchema = z.enum([
  'CATEGORY',
  'FAMILY',
  'SYSTEM',
  'MODEL',
  'MATERIAL',
  'MATERIAL_VARIANT',
  'COLOR',
  'PROPERTY',
  'MEDIA',
  'PRICE',
]);
const sourceIdentitySchema = z
  .object({
    sourceCapturedAt: z.iso.datetime(),
    sourceCategory: z.string().max(255).optional(),
    sourceEntityType: sourceEntityTypeSchema,
    sourceHash: z.string().regex(/^[0-9a-f]{64}$/),
    sourceId: z.string().min(1).max(255),
    sourceLastVerifiedAt: z.iso.datetime(),
    sourceSlug: z.string().min(1).max(255),
    sourceType: sourceTypeSchema,
    sourceUrl: z.url().max(1024),
    supplierSlug: z.string().min(1).max(96),
  })
  .strict();
const captureSchema = z
  .object({
    capturedAt: z.iso.datetime(),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/),
    httpStatus: z.number().int().min(100).max(599),
    mappingVersion: z.string().min(1).max(64),
    parserVersion: z.string().min(1).max(64),
    sourceUrl: z.url().max(1024),
    sourceVersion: z.string().max(160).optional(),
    status: z.literal('CAPTURED'),
  })
  .strict();
const familySchema = z
  .object({
    code: z.string().min(1).max(64),
    name: z.string().min(1).max(255),
    slug: z.string().min(1).max(128),
    sourceId: z.string().min(1).max(255),
  })
  .strict();
const propertySchema = z
  .object({
    key: z.string().min(1).max(96),
    name: z.string().min(1).max(160),
    unit: z.string().max(32).optional(),
    value: z.string().min(1).max(512),
  })
  .strict();

const categorySchema = z
  .object({
    childCategorySourceIds: z.array(z.string().min(1).max(255)).optional(),
    description: z.string().max(20_000).optional(),
    family: familySchema,
    identity: sourceIdentitySchema,
    materialSourceIds: z.array(z.string().min(1).max(255)),
    mediaSourceUrls: z.array(z.url().max(1024)).optional(),
    modelSourceIds: z.array(z.string().min(1).max(255)).optional(),
    name: z.string().min(1).max(255),
    parentCategorySourceId: z.string().min(1).max(255).optional(),
    sortOrder: z.number().int().min(0).optional(),
    sourcePageReferences: z.array(z.url().max(1024)).optional(),
    sourceStatus: z.enum(['ACTIVE', 'PARSER_REVIEW_REQUIRED', 'SOURCE_REMOVED']).optional(),
    systemSourceIds: z.array(z.string().min(1).max(255)),
  })
  .strict();
const systemSchema = z
  .object({
    categorySourceId: z.string().min(1).max(255),
    description: z.string().max(2000).optional(),
    family: familySchema,
    identity: sourceIdentitySchema,
    mediaSourceUrl: z.url().max(1024).optional(),
    name: z.string().min(1).max(255),
  })
  .strict();
const modelSchema = z
  .object({
    categorySourceId: z.string().min(1).max(255),
    description: z.string().max(20_000).optional(),
    family: familySchema,
    identity: sourceIdentitySchema,
    mediaSourceUrls: z.array(z.url().max(1024)),
    name: z.string().min(1).max(255),
    sourceAvailability: z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'UNKNOWN']).optional(),
    sourceCategoryName: z.string().max(255).optional(),
    systemSourceId: z.string().min(1).max(255).optional(),
  })
  .strict();
const materialSchema = z
  .object({
    article: z.string().min(1).max(128),
    categorySourceId: z.string().min(1).max(255),
    color: z.string().min(1).max(160),
    family: familySchema,
    identity: sourceIdentitySchema,
    isBlackout: z.boolean(),
    isZebra: z.boolean(),
    materialName: z.string().min(1).max(255),
    properties: z.array(propertySchema),
    systemSourceIds: z.array(z.string().min(1).max(255)),
    variantName: z.string().min(1).max(255),
    widthMm: z.number().positive().max(10_000).optional(),
  })
  .strict();
const priceSchema = z
  .object({
    amountMinor: z.number().int().positive().nullable(),
    currency: z.literal('RUB'),
    identity: sourceIdentitySchema,
    kind: z.enum(['BASE', 'FROM']),
    sourceContext: z.record(z.string(), z.string().max(512)),
    sourcePriceCategory: z.string().max(64).nullable(),
    status: z.enum(['AVAILABLE', 'PRICE_ON_REQUEST']),
  })
  .strict()
  .superRefine((price, context) => {
    if (
      (price.status === 'AVAILABLE' && price.amountMinor === null) ||
      (price.status === 'PRICE_ON_REQUEST' && price.amountMinor !== null)
    ) {
      context.addIssue({ code: 'custom', message: 'price status/value mismatch' });
    }
  });
const mediaReferenceSchema = z
  .object({
    contentTypeHint: z.string().max(128).optional(),
    identity: sourceIdentitySchema,
    role: z.enum(['DETAIL', 'PRIMARY', 'SWATCH', 'SYSTEM']),
  })
  .strict();
const mediaManifestSchema = z
  .object({
    identity: sourceIdentitySchema,
    materialSourceId: z.string().min(1).max(255),
    media: z.array(mediaReferenceSchema),
  })
  .strict();

function capturedSchema<T extends z.ZodType>(data: T) {
  return z.object({ capture: captureSchema, data }).strict();
}

const snapshotPayloadShape = {
  categories: z.array(capturedSchema(categorySchema)),
  materials: z.array(capturedSchema(materialSchema)),
  mediaManifests: z.array(capturedSchema(mediaManifestSchema)),
  prices: z.array(capturedSchema(priceSchema)),
  sourceVersion: z
    .object({
      capturedAt: z.iso.datetime(),
      sourceType: sourceTypeSchema,
      version: z.string().min(1).max(160),
    })
    .strict(),
  systems: z.array(capturedSchema(systemSchema)),
} as const;

const catalogSafeSnapshotPayloadV2Schema = z
  .object({
    ...snapshotPayloadShape,
    models: z.array(capturedSchema(modelSchema)),
    schemaVersion: z.literal(2),
  })
  .strict();

const legacyCatalogSafeSnapshotPayloadV1Schema = z
  .object({
    ...snapshotPayloadShape,
    schemaVersion: z.literal(1),
  })
  .strict()
  .transform((payload) => ({
    ...payload,
    models: [],
    schemaVersion: 2 as const,
  }));

export const catalogSafeSnapshotPayloadSchema = z.union([
  catalogSafeSnapshotPayloadV2Schema,
  legacyCatalogSafeSnapshotPayloadV1Schema,
]);

export type CatalogSafeSnapshotPayload = z.infer<typeof catalogSafeSnapshotPayloadSchema>;

export function emptyCatalogSafeSnapshotPayload(
  sourceVersion: CatalogSafeSnapshotPayload['sourceVersion'],
): CatalogSafeSnapshotPayload {
  return {
    categories: [],
    materials: [],
    mediaManifests: [],
    models: [],
    prices: [],
    schemaVersion: 2,
    sourceVersion,
    systems: [],
  };
}
