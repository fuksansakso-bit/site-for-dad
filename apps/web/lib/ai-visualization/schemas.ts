import { z } from 'zod';

const materialSlug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u).max(180);
const sha256 = z.string().regex(/^[0-9a-f]{64}$/u);
const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/u);
const imageMime = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export const createAiJobSchema = z
  .object({
    idempotencyKey,
    materialId: z.uuid().optional(),
    materialSlug: materialSlug.optional(),
    productMetadata: z
      .object({
        heightMm: z.number().int().min(100).max(10_000),
        widthMm: z.number().int().min(100).max(10_000),
      })
      .strict()
      .optional(),
  })
  .strict()
  .refine((value) => Number(Boolean(value.materialId)) + Number(Boolean(value.materialSlug)) === 1);

export const signedUploadSchema = z
  .object({
    byteSize: z.number().int().min(1).max(4 * 1024 * 1024),
    height: z.number().int().min(320).max(2048),
    idempotencyKey,
    mimeType: imageMime,
    sha256,
    width: z.number().int().min(320).max(2048),
  })
  .strict()
  .refine((value) => value.width * value.height <= 40_000_000);

export const confirmUploadSchema = signedUploadSchema;

export const publicReferenceSchema = z.string().regex(/^[0-9a-f]{48}$/u);
