import { z } from 'zod';
export const cartItemSchema = z
  .object({
    materialSlug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
      .max(255),
    widthMm: z.number().int().min(100).max(10_000),
    heightMm: z.number().int().min(100).max(10_000),
    quantity: z.number().int().min(1).max(100),
    aiVisualizationPublicReference: z
      .string()
      .regex(/^[0-9a-f]{48}$/u)
      .optional(),
  })
  .strict();
export const cartSchema = z.array(cartItemSchema).min(1).max(50);
export const checkoutSchema = z
  .object({
    items: cartSchema,
    customerName: z.string().trim().min(2).max(160),
    customerPhone: z.string().min(10).max(30),
    locality: z.string().trim().min(2).max(160),
    address: z.string().trim().max(500).optional(),
    comment: z.string().trim().max(2000).optional(),
    measurementRequested: z.boolean().default(false),
    installmentInterest: z.boolean().default(false),
  })
  .strict();
