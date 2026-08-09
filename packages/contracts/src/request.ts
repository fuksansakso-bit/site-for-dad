import { z } from 'zod';

import {
  cartItemResponseSchema,
  cartMoneySummarySchema,
  cartPricingStatusSchema,
  cartProductSnapshotSchema,
} from './cart.js';

export const requestNumberSchema = z.string().regex(/^REQ-[0-9]{6}-[A-Z2-9]{8}$/u);
export const requestPublicReferenceSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/u);
export const requestStatusSchema = z.enum([
  'NEW',
  'IN_REVIEW',
  'CONTACTED',
  'CONFIRMED',
  'CANCELLED',
]);

const optionalTrimmed = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => (value === undefined || value === '' ? undefined : value));

export const guestCheckoutRequestSchema = z
  .object({
    address: optionalTrimmed(500),
    comment: optionalTrimmed(1_000),
    contactName: z.string().trim().min(2).max(120),
    contactPhone: z.string().trim().min(8).max(40),
    expectedCartRevision: z.number().int().nonnegative(),
    installmentInterest: z.boolean(),
    locality: z.string().trim().min(2).max(160),
    measurementRequested: z.boolean(),
    personalDataConsent: z.literal(true),
  })
  .strict();

export const requestSafeSnapshotSchema = z
  .object({
    capturedAt: z.iso.datetime({ offset: true }),
    items: z.array(cartItemResponseSchema).min(1).max(50),
    priceVersionChangedItemCount: z.number().int().nonnegative(),
    services: z
      .object({
        delivery: z.literal('FREE'),
        installation: z.literal('FREE'),
        measurement: z.literal('FREE'),
      })
      .strict(),
    summary: cartMoneySummarySchema,
    version: z.literal(1),
  })
  .strict();

export const guestCheckoutResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    createdAt: z.iso.datetime({ offset: true }),
    installmentInterest: z.boolean(),
    measurementRequested: z.boolean(),
    publicSummaryHref: z.string().regex(/^\/request\/[A-Za-z0-9_-]{43}$/u),
    requestNumber: requestNumberSchema,
    snapshot: requestSafeSnapshotSchema,
    status: z.literal('NEW'),
  })
  .strict();

export const whatsappHandoffRequestSchema = z.object({}).strict();

export const whatsappHandoffResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    message: z.string().min(1).max(32_768),
    publicSummaryHref: z.string().regex(/^\/request\/[A-Za-z0-9_-]{43}$/u),
    recipient: z.string().regex(/^[1-9][0-9]{7,14}$/u),
    whatsappUrl: z.string().startsWith('https://wa.me/').max(65_536),
  })
  .strict()
  .superRefine((value, context) => {
    const url = new URL(value.whatsappUrl);
    if (
      url.hostname !== 'wa.me' ||
      url.pathname !== `/${value.recipient}` ||
      url.username !== '' ||
      url.password !== ''
    ) {
      context.addIssue({
        code: 'custom',
        message: 'WHATSAPP_RECIPIENT_URL_MISMATCH',
        path: ['whatsappUrl'],
      });
    }
  });

export const requestCommunicationEventRequestSchema = z
  .object({
    type: z.enum(['WHATSAPP_LINK_OPENED', 'MESSAGE_COPIED']),
  })
  .strict();

export const requestCommunicationEventResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    recorded: z.boolean(),
    type: z.enum(['WHATSAPP_LINK_OPENED', 'MESSAGE_COPIED']),
  })
  .strict();

export const publicRequestItemSchema = z
  .object({
    minimumPriceApplied: z.boolean(),
    optionsTotalKopecks: z.number().int().nonnegative().nullable(),
    previewAssetHref: z
      .string()
      .regex(/^\/api\/v1\/requests\/public\/[A-Za-z0-9_-]{43}\/items\/[1-9][0-9]*\/preview$/u)
      .nullable(),
    pricingLabel: z.enum([
      'Стоимость рассчитана',
      'Стоимость уточнит менеджер',
      'Размер требует проверки',
    ]),
    product: cartProductSnapshotSchema,
    quantityTotalKopecks: z.number().int().nonnegative().nullable(),
    sequence: z.number().int().positive(),
    unitPriceKopecks: z.number().int().nonnegative().nullable(),
    warnings: z.array(z.string().min(1).max(255)).max(32),
  })
  .strict();

export const publicRequestSummaryResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    createdAt: z.iso.datetime({ offset: true }),
    installmentInterest: z.boolean(),
    installmentText: z.literal('Доступна рассрочка. Уточните условия у менеджера'),
    items: z.array(publicRequestItemSchema).min(1).max(50),
    manufacturingLeadTime: z.string().min(2).max(120),
    measurementRequested: z.boolean(),
    requestNumber: requestNumberSchema,
    services: z
      .object({
        delivery: z.string().min(2).max(80),
        installation: z.string().min(2).max(80),
        measurement: z.string().min(2).max(80),
      })
      .strict(),
    statusLabel: z.enum([
      'Заявка получена',
      'Заявка на рассмотрении',
      'Менеджер связался',
      'Заявка подтверждена',
      'Заявка отменена',
    ]),
    summary: cartMoneySummarySchema,
    warranty: z.string().min(2).max(120),
  })
  .strict();

export const adminRequestListItemSchema = z
  .object({
    contactName: z.string().min(2).max(120),
    contactPhone: z.string().regex(/^\+[1-9][0-9]{7,14}$/u),
    createdAt: z.iso.datetime({ offset: true }),
    installmentInterest: z.boolean(),
    itemCount: z.number().int().positive(),
    knownSubtotalKopecks: z.number().int().nonnegative(),
    locality: z.string().min(2).max(160),
    measurementRequested: z.boolean(),
    pricingStatus: cartPricingStatusSchema,
    requestNumber: requestNumberSchema,
    status: requestStatusSchema,
    totalQuantity: z.number().int().positive(),
    updatedAt: z.iso.datetime({ offset: true }),
    version: z.number().int().positive(),
  })
  .strict();

export const adminRequestListResponseSchema = z
  .object({
    correlationId: z.string().min(8).max(128),
    items: z.array(adminRequestListItemSchema).max(100),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive().max(100),
    totalCount: z.number().int().nonnegative(),
  })
  .strict();

export const adminRequestDetailResponseSchema = adminRequestListItemSchema.extend({
  address: z.string().max(500).nullable(),
  comment: z.string().max(1_000).nullable(),
  communicationEvents: z.array(
    z
      .object({
        createdAt: z.iso.datetime({ offset: true }),
        safeMetadata: z.record(z.string(), z.unknown()),
        type: z.enum([
          'REQUEST_CREATED',
          'WHATSAPP_LINK_GENERATED',
          'WHATSAPP_LINK_OPENED',
          'MESSAGE_COPIED',
          'STATUS_CHANGED',
        ]),
      })
      .strict(),
  ),
  correlationId: z.string().min(8).max(128),
  notes: z.array(
    z
      .object({
        body: z.string().min(1).max(1_000),
        createdAt: z.iso.datetime({ offset: true }),
      })
      .strict(),
  ),
  publicReferenceRevokedAt: z.iso.datetime({ offset: true }).nullable(),
  publicSummaryHref: z
    .string()
    .regex(/^\/request\/[A-Za-z0-9_-]{43}$/u)
    .nullable(),
  snapshot: requestSafeSnapshotSchema,
  whatsappUrl: z.string().startsWith('https://wa.me/79635851036?text=').nullable(),
});

export const adminRequestStatusMutationSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    status: requestStatusSchema,
  })
  .strict();

export const adminRequestNoteMutationSchema = z
  .object({ body: z.string().trim().min(1).max(1_000) })
  .strict();

export const adminRequestRevokeMutationSchema = z.object({}).strict();

export type AdminRequestDetailResponse = z.infer<typeof adminRequestDetailResponseSchema>;
export type AdminRequestListResponse = z.infer<typeof adminRequestListResponseSchema>;
export type GuestCheckoutRequest = z.infer<typeof guestCheckoutRequestSchema>;
export type GuestCheckoutResponse = z.infer<typeof guestCheckoutResponseSchema>;
export type PublicRequestSummaryResponse = z.infer<typeof publicRequestSummaryResponseSchema>;
export type RequestCommunicationEventRequest = z.infer<
  typeof requestCommunicationEventRequestSchema
>;
export type RequestSafeSnapshot = z.infer<typeof requestSafeSnapshotSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type WhatsAppHandoffResponse = z.infer<typeof whatsappHandoffResponseSchema>;
