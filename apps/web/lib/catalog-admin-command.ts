import { z } from 'zod';

const uuid = z.string().uuid();
const checksum = z.string().regex(/^[0-9a-f]{64}$/);
const reason = z.string().trim().min(3).max(512);

function optionalFormString(value: unknown): unknown {
  return typeof value === 'string' && value.length === 0 ? undefined : value;
}

const releaseFields = {
  catalogDifferenceChecksum: checksum,
  catalogSourceId: uuid,
  catalogVersionId: uuid,
  expectedVariantCount: z.coerce.number().int().min(1).max(50),
  priceDifferenceChecksum: z.preprocess(optionalFormString, checksum.optional()),
  priceVersionId: z.preprocess(optionalFormString, uuid.optional()),
  syncRunId: uuid,
} as const;

export const preparePublicationFormSchema = z
  .object({
    ...releaseFields,
    confirmation: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.confirmation !== `ПОДГОТОВИТЬ ${value.expectedVariantCount}`) {
      context.addIssue({
        code: 'custom',
        message: 'Confirmation does not match the exact variant count.',
        path: ['confirmation'],
      });
    }
  });

export const approveReleaseFormSchema = z
  .object({
    ...releaseFields,
    confirmation: z.literal('ОДОБРИТЬ'),
    reason,
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.priceVersionId === undefined) !== (value.priceDifferenceChecksum === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Price version and checksum must be supplied together.',
        path: ['priceVersionId'],
      });
    }
  });

export const activateReleaseFormSchema = z
  .object({
    ...releaseFields,
    confirmation: z.literal('АКТИВИРОВАТЬ'),
    reason,
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.priceVersionId === undefined) !== (value.priceDifferenceChecksum === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Price version and checksum must be supplied together.',
        path: ['priceVersionId'],
      });
    }
  });

export const overlayFormSchema = z
  .object({
    availabilityReason: reason,
    availabilityStatus: z.enum(['AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY', 'HIDDEN']),
    entityId: uuid,
    publicationReason: reason,
    publicationStatus: z.enum(['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']),
    visibility: z.enum(['VISIBLE', 'HIDDEN']),
  })
  .strict();

export const localPriceOverrideFormSchema = z
  .object({
    businessCatalogEntryId: uuid,
    currency: z.literal('RUB'),
    reason,
    rubles: z
      .string()
      .trim()
      .regex(/^\d{1,8}(?:[.,]\d{1,2})?$/),
  })
  .strict();

export const removeLocalPriceOverrideFormSchema = z
  .object({ businessCatalogEntryId: uuid, reason })
  .strict();

export function formDataRecord(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

export function rublesToMinorUnits(value: string): number {
  const [rubles = '0', kopecks = ''] = value.replace(',', '.').split('.');
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
}
