import { z } from 'zod';

import {
  cartItemResponseSchema,
  cartMoneySummarySchema,
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
    recipient: z.literal('79635851036'),
    whatsappUrl: z.string().startsWith('https://wa.me/79635851036?text=').max(65_536),
  })
  .strict();

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
    items: z.array(publicRequestItemSchema).min(1).max(50),
    manufacturingLeadTime: z.literal('2–7 календарных дней'),
    measurementRequested: z.boolean(),
    requestNumber: requestNumberSchema,
    services: z
      .object({
        delivery: z.literal('Бесплатно'),
        installation: z.literal('Бесплатно'),
        measurement: z.literal('Бесплатно'),
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
    warranty: z.literal('12 месяцев'),
  })
  .strict();

export type GuestCheckoutRequest = z.infer<typeof guestCheckoutRequestSchema>;
export type GuestCheckoutResponse = z.infer<typeof guestCheckoutResponseSchema>;
export type PublicRequestSummaryResponse = z.infer<typeof publicRequestSummaryResponseSchema>;
export type RequestCommunicationEventRequest = z.infer<
  typeof requestCommunicationEventRequestSchema
>;
export type RequestSafeSnapshot = z.infer<typeof requestSafeSnapshotSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
export type WhatsAppHandoffResponse = z.infer<typeof whatsappHandoffResponseSchema>;
