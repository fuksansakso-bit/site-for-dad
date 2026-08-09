import { z } from 'zod';

import { cartItemResponseSchema, cartMoneySummarySchema } from './cart.js';

export const requestNumberSchema = z.string().regex(/^REQ-[0-9]{6}-[A-Z2-9]{8}$/u);
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

export type GuestCheckoutRequest = z.infer<typeof guestCheckoutRequestSchema>;
export type GuestCheckoutResponse = z.infer<typeof guestCheckoutResponseSchema>;
export type RequestSafeSnapshot = z.infer<typeof requestSafeSnapshotSchema>;
export type RequestStatus = z.infer<typeof requestStatusSchema>;
