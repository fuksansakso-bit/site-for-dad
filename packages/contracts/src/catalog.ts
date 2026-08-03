import { z } from 'zod';

const boundedSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const publicCatalogQuerySchema = z
  .object({
    availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'INQUIRY_ONLY']).optional(),
    blackout: z
      .enum(['true'])
      .optional()
      .transform((value) => value === 'true'),
    category: boundedSlugSchema.optional(),
    color: boundedSlugSchema.optional(),
    cursor: z.string().min(16).max(1_024).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    q: z.string().trim().max(80).default(''),
    system: boundedSlugSchema.optional(),
    zebra: z
      .enum(['true'])
      .optional()
      .transform((value) => value === 'true'),
  })
  .strict();
export type PublicCatalogQuery = z.infer<typeof publicCatalogQuerySchema>;

export const publicCatalogVersionSchema = z
  .object({
    activatedAt: z.iso.datetime({ offset: true }),
    id: z.uuid(),
    versionNumber: z.number().int().positive(),
  })
  .strict();
export type PublicCatalogVersion = z.infer<typeof publicCatalogVersionSchema>;

export const publicCatalogFacetOptionSchema = z
  .object({
    count: z.number().int().nonnegative(),
    label: z.string().min(1).max(256),
    value: z.string().min(1).max(128),
  })
  .strict();
export type PublicCatalogFacetOption = z.infer<typeof publicCatalogFacetOptionSchema>;

export const publicCatalogFacetsSchema = z
  .object({
    availability: z.array(publicCatalogFacetOptionSchema).max(3),
    categories: z.array(publicCatalogFacetOptionSchema).max(32),
    colors: z.array(publicCatalogFacetOptionSchema).max(64),
    features: z.array(publicCatalogFacetOptionSchema).max(2),
    systems: z.array(publicCatalogFacetOptionSchema).max(32),
  })
  .strict();
export type PublicCatalogFacets = z.infer<typeof publicCatalogFacetsSchema>;

export const publicCatalogMaterialSchema = z
  .object({
    article: z.string().min(1).max(128),
    availability: z.enum(['IN_STOCK', 'OUT_OF_STOCK', 'INQUIRY_ONLY']),
    category: z
      .object({ id: z.uuid(), name: z.string().min(1).max(256), slug: boundedSlugSchema })
      .strict(),
    color: z
      .object({
        hex: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/)
          .nullable(),
        name: z.string().min(1).max(128),
        slug: boundedSlugSchema,
      })
      .strict()
      .nullable(),
    description: z.string().max(2_000).nullable(),
    id: z.uuid(),
    isBlackout: z.boolean(),
    isZebra: z.boolean(),
    materialName: z.string().min(1).max(256),
    media: z
      .object({
        height: z.number().int().positive(),
        id: z.uuid(),
        type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        url: z.string().regex(/^\/api\/v1\/catalog\/media\/[0-9a-f-]+\?v=[0-9a-f-]+$/),
        width: z.number().int().positive(),
      })
      .strict(),
    name: z.string().min(1).max(256),
    price: z
      .object({
        amountMinor: z.number().int().positive().nullable(),
        currency: z
          .string()
          .length(3)
          .regex(/^[A-Z]{3}$/),
        kind: z.enum(['BASE', 'FROM']),
        origin: z.enum(['LOCAL_OVERRIDE', 'SOURCE_VERSION']),
        status: z.enum(['AVAILABLE', 'PRICE_ON_REQUEST']),
      })
      .strict(),
    slug: boundedSlugSchema,
    system: z
      .object({ id: z.uuid(), name: z.string().min(1).max(256), slug: boundedSlugSchema })
      .strict()
      .nullable(),
    widthMm: z.number().positive().nullable(),
  })
  .strict();
export type PublicCatalogMaterial = z.infer<typeof publicCatalogMaterialSchema>;

export const publicCatalogResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    facets: publicCatalogFacetsSchema,
    items: z.array(publicCatalogMaterialSchema).max(50),
    limit: z.number().int().min(1).max(50),
    nextCursor: z.string().min(16).max(1_024).nullable(),
    priceVersion: publicCatalogVersionSchema.nullable(),
    total: z.number().int().nonnegative(),
    version: publicCatalogVersionSchema.nullable(),
  })
  .strict();
export type PublicCatalogResponse = z.infer<typeof publicCatalogResponseSchema>;
