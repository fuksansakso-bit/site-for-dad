import { z } from 'zod';

import { pricingCalculationStatusSchema } from './pricing.js';

export const cartItemReferenceSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/u);
export const cartPricingStatusSchema = z.enum([
  'FULLY_PRICED',
  'PARTIALLY_PRICED',
  'PRICE_ON_REQUEST',
]);

const cartAllowedQuoteStatusSchema = pricingCalculationStatusSchema.refine(
  (status) =>
    ['CALCULATED', 'SOURCE_DATA_STALE', 'PRICE_ON_REQUEST', 'MANUAL_REVIEW_REQUIRED'].includes(
      status,
    ),
  'Quote status cannot be added to cart.',
);

export const cartProductSnapshotSchema = z
  .object({
    additionalOptions: z.array(z.string().min(1).max(255)).max(24),
    color: z.string().min(1).max(255),
    control: z.string().min(1).max(255),
    family: z.string().min(1).max(255),
    hardware: z.string().min(1).max(255),
    heightMm: z.number().int().positive().max(100_000),
    material: z.string().min(1).max(255),
    materialArticle: z.string().min(1).max(128),
    model: z.string().min(1).max(255),
    modelCode: z.string().min(1).max(64),
    mounting: z.string().min(1).max(255),
    quantity: z.number().int().positive().max(1_000),
    system: z.string().min(1).max(255),
    widthMm: z.number().int().positive().max(100_000),
  })
  .strict();

export const cartItemResponseSchema = z
  .object({
    catalogVersionNumber: z.number().int().positive(),
    editHref: z.string().regex(/^\/configure\?edit=[A-Za-z0-9_-]{32}$/u),
    itemReference: cartItemReferenceSchema,
    minimumPriceApplied: z.boolean(),
    optionsTotalKopecks: z.number().int().nonnegative().nullable(),
    previewHref: z
      .string()
      .regex(/^\/preview\?state=[A-Za-z0-9_-]{32}$/u)
      .nullable(),
    priceVersionNumber: z.number().int().positive().nullable(),
    pricingStatus: cartAllowedQuoteStatusSchema,
    product: cartProductSnapshotSchema,
    quantityTotalKopecks: z.number().int().nonnegative().nullable(),
    quoteCreatedAt: z.iso.datetime({ offset: true }),
    revision: z.number().int().positive(),
    unitPriceKopecks: z.number().int().nonnegative().nullable(),
    warnings: z.array(z.string().min(1).max(255)).max(32),
    wasCalculatedWithPreviousPrice: z.boolean(),
  })
  .strict()
  .superRefine((item, context) => {
    const priced =
      item.pricingStatus === 'CALCULATED' || item.pricingStatus === 'SOURCE_DATA_STALE';
    if (priced !== (item.unitPriceKopecks !== null && item.quantityTotalKopecks !== null)) {
      context.addIssue({
        code: 'custom',
        message: 'Cart item price and status are inconsistent.',
        path: ['pricingStatus'],
      });
    }
  });

export const cartMoneySummarySchema = z
  .object({
    currency: z.literal('RUB'),
    deliveryKopecks: z.literal(0),
    installationKopecks: z.literal(0),
    knownOptionsKopecks: z.number().int().nonnegative(),
    knownProductsKopecks: z.number().int().nonnegative(),
    knownSubtotalKopecks: z.number().int().nonnegative(),
    measurementKopecks: z.literal(0),
    minimumAppliedItemCount: z.number().int().nonnegative(),
    pricedItemCount: z.number().int().nonnegative(),
    pricingStatus: cartPricingStatusSchema,
    totalItemCount: z.number().int().nonnegative(),
    totalQuantity: z.number().int().nonnegative(),
    unknownItemCount: z.number().int().nonnegative(),
  })
  .strict();

export const guestCartResponseSchema = z
  .object({
    cartRevision: z.number().int().nonnegative(),
    correlationId: z.string().min(8).max(128),
    csrfToken: z.string().min(32).max(128),
    expiresAt: z.iso.datetime({ offset: true }),
    items: z.array(cartItemResponseSchema).max(50),
    priceVersionChangedItemCount: z.number().int().nonnegative(),
    summary: cartMoneySummarySchema,
  })
  .strict();

export const cartItemAddRequestSchema = z
  .object({
    previewStateId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32}$/u)
      .optional(),
    quoteToken: z.string().min(32).max(64),
  })
  .strict();

export const cartItemReplaceRequestSchema = z
  .object({
    expectedItemRevision: z.number().int().positive(),
    previewStateId: z
      .string()
      .regex(/^[A-Za-z0-9_-]{32}$/u)
      .optional(),
    quoteToken: z.string().min(32).max(64),
  })
  .strict();

export const cartItemCommandRequestSchema = z
  .object({ expectedCartRevision: z.number().int().nonnegative() })
  .strict();

export const cartItemEditSourceResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    itemReference: cartItemReferenceSchema,
    selection: z
      .object({
        additionalOptionIds: z.array(z.string().min(1).max(96)).max(24),
        catalogVersionId: z.uuid(),
        configuratorModelId: z.uuid(),
        controlTypeId: z.string().min(1).max(96),
        hardwareOptionId: z.string().min(1).max(96),
        heightMm: z.number().int().positive().max(100_000),
        materialVariantId: z.uuid(),
        mountingTypeId: z.string().min(1).max(96),
        productFamilyId: z.uuid(),
        productSystemId: z.uuid(),
        quantity: z.number().int().positive().max(1_000),
        widthMm: z.number().int().positive().max(100_000),
      })
      .strict(),
  })
  .strict();

export type CartItemAddRequest = z.infer<typeof cartItemAddRequestSchema>;
export type CartItemEditSourceResponse = z.infer<typeof cartItemEditSourceResponseSchema>;
export type CartItemReplaceRequest = z.infer<typeof cartItemReplaceRequestSchema>;
export type CartItemResponse = z.infer<typeof cartItemResponseSchema>;
export type GuestCartResponse = z.infer<typeof guestCartResponseSchema>;
