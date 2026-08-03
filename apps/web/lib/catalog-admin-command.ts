import type {
  CatalogBulkOverlayPatch,
  CatalogBulkSelector,
  PreviewCatalogBusinessBulkInput,
} from '@project-name/catalog';
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
  expectedVariantCount: z.coerce.number().int().min(1).max(100_000),
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

export const composePublicationFormSchema = z
  .object({
    ...releaseFields,
    confirmation: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.confirmation !== `ЗАФИКСИРОВАТЬ ${value.expectedVariantCount}`) {
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

export const syncRunCommandFormSchema = z
  .object({
    catalogSourceId: uuid,
    confirmation: z.enum(['ОСТАНОВИТЬ', 'ПОВТОРИТЬ']),
    reason,
    syncRunId: uuid,
  })
  .strict();

export const rollbackReleaseFormSchema = z
  .object({
    catalogRollbackTargetId: z.preprocess(optionalFormString, uuid.optional()),
    confirmation: z.literal('ОТКАТИТЬ'),
    expectedActiveCatalogVersionId: z.preprocess(optionalFormString, uuid.optional()),
    expectedActivePriceVersionId: z.preprocess(optionalFormString, uuid.optional()),
    priceRollbackTargetId: z.preprocess(optionalFormString, uuid.optional()),
    reason,
  })
  .strict()
  .superRefine((value, context) => {
    const catalogPair =
      value.catalogRollbackTargetId !== undefined &&
      value.expectedActiveCatalogVersionId !== undefined;
    const pricePair =
      value.priceRollbackTargetId !== undefined && value.expectedActivePriceVersionId !== undefined;
    if (!catalogPair && !pricePair) {
      context.addIssue({ code: 'custom', message: 'A rollback pair is required.', path: [] });
    }
    if (
      (value.catalogRollbackTargetId === undefined) !==
        (value.expectedActiveCatalogVersionId === undefined) ||
      (value.priceRollbackTargetId === undefined) !==
        (value.expectedActivePriceVersionId === undefined)
    ) {
      context.addIssue({ code: 'custom', message: 'Rollback targets must be paired.', path: [] });
    }
  });

const reviewDifferencesFormSchema = z
  .object({
    ...releaseFields,
    confirmation: z.string(),
    differenceIds: z.array(uuid).max(500),
    expectedCount: z.coerce.number().int().min(1).max(100_000),
    reason,
    resolution: z.enum(['APPROVED', 'DEFERRED', 'REJECTED']),
    scope: z.enum(['CATALOG', 'PRICE']),
    selectionMode: z.enum(['ALL', 'SELECTED']),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.confirmation !== `ПРОВЕРИТЬ ${value.expectedCount}`) {
      context.addIssue({
        code: 'custom',
        message: 'Confirmation does not match the exact review count.',
        path: ['confirmation'],
      });
    }
    if (
      (value.selectionMode === 'ALL' && value.differenceIds.length !== 0) ||
      (value.selectionMode === 'SELECTED' && value.differenceIds.length !== value.expectedCount)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Review selection does not match the exact count.',
        path: ['differenceIds'],
      });
    }
    if (new Set(value.differenceIds).size !== value.differenceIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Review selection contains duplicate ids.',
        path: ['differenceIds'],
      });
    }
    if ((value.priceVersionId === undefined) !== (value.priceDifferenceChecksum === undefined)) {
      context.addIssue({
        code: 'custom',
        message: 'Price version and checksum must be supplied together.',
        path: ['priceVersionId'],
      });
    }
  });

export function parseReviewDifferencesForm(formData: FormData) {
  const record = formDataRecord(formData);
  delete record['differenceId'];
  return reviewDifferencesFormSchema.parse({
    ...record,
    differenceIds: formData.getAll('differenceId'),
  });
}

const optionalUuid = z.preprocess(optionalFormString, uuid.optional());
const optionalVisibility = z.preprocess(
  optionalFormString,
  z.enum(['VISIBLE', 'HIDDEN']).optional(),
);
const optionalReview = z.preprocess(
  optionalFormString,
  z.enum(['UNREVIEWED', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED']).optional(),
);
const optionalAvailability = z.preprocess(
  optionalFormString,
  z.enum(['UNREVIEWED', 'AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY', 'HIDDEN']).optional(),
);
const optionalPublication = z.preprocess(
  optionalFormString,
  z.enum(['UNREVIEWED', 'DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED']).optional(),
);
const optionalPrice = z.preprocess(
  optionalFormString,
  z.enum(['AVAILABLE', 'PRICE_ON_REQUEST']).optional(),
);

const bulkPreviewFormSchema = z
  .object({
    catalogDifferenceChecksum: checksum,
    catalogSourceId: uuid,
    catalogVersionId: uuid,
    categoryId: optionalUuid,
    filterAvailability: optionalAvailability,
    filterCategoryId: optionalUuid,
    filterPrice: optionalPrice,
    filterPublication: optionalPublication,
    filterReview: optionalReview,
    filterSystemId: optionalUuid,
    filterVisibility: optionalVisibility,
    patchAvailability: optionalAvailability,
    patchPublication: optionalPublication,
    patchReview: optionalReview,
    patchVisibility: optionalVisibility,
    reason,
    selectedEntryIds: z.array(uuid).max(500),
    selectorMode: z.enum(['CATEGORY', 'FILTER', 'SELECTED']),
    syncRunId: uuid,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.selectorMode === 'CATEGORY' && value.categoryId === undefined) {
      context.addIssue({ code: 'custom', message: 'Category is required.', path: ['categoryId'] });
    }
    if (value.selectorMode === 'SELECTED' && value.selectedEntryIds.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'At least one selected entry is required.',
        path: ['selectedEntryIds'],
      });
    }
    if (new Set(value.selectedEntryIds).size !== value.selectedEntryIds.length) {
      context.addIssue({
        code: 'custom',
        message: 'Selected entries must be unique.',
        path: ['selectedEntryIds'],
      });
    }
    if (
      value.selectorMode === 'FILTER' &&
      [
        value.filterAvailability,
        value.filterCategoryId,
        value.filterPrice,
        value.filterPublication,
        value.filterReview,
        value.filterSystemId,
        value.filterVisibility,
      ].every((item) => item === undefined)
    ) {
      context.addIssue({ code: 'custom', message: 'A typed filter is required.', path: [] });
    }
    if (
      [
        value.patchAvailability,
        value.patchPublication,
        value.patchReview,
        value.patchVisibility,
      ].every((item) => item === undefined)
    ) {
      context.addIssue({ code: 'custom', message: 'A bulk patch is required.', path: [] });
    }
  });

export type CatalogBulkPreparedRequest = Omit<
  PreviewCatalogBusinessBulkInput,
  'actorId' | 'correlationId'
>;

export function parseCatalogBulkPreviewForm(formData: FormData): CatalogBulkPreparedRequest {
  const record = formDataRecord(formData);
  delete record['selectedEntryId'];
  const value = bulkPreviewFormSchema.parse({
    ...record,
    selectedEntryIds: formData.getAll('selectedEntryId'),
  });
  const patch: CatalogBulkOverlayPatch = {
    ...(value.patchAvailability === undefined
      ? {}
      : { availabilityStatus: value.patchAvailability }),
    ...(value.patchPublication === undefined ? {} : { publicationStatus: value.patchPublication }),
    ...(value.patchReview === undefined ? {} : { manualReviewState: value.patchReview }),
    ...(value.patchVisibility === undefined ? {} : { visibility: value.patchVisibility }),
  };
  let selector: CatalogBulkSelector;
  if (value.selectorMode === 'CATEGORY') {
    selector = { categoryId: value.categoryId as string, mode: 'CATEGORY' };
  } else if (value.selectorMode === 'SELECTED') {
    selector = { businessCatalogEntryIds: value.selectedEntryIds, mode: 'SELECTED' };
  } else {
    selector = {
      filter: {
        ...(value.filterAvailability === undefined
          ? {}
          : { availabilityStatus: value.filterAvailability }),
        ...(value.filterCategoryId === undefined ? {} : { categoryId: value.filterCategoryId }),
        ...(value.filterPrice === undefined ? {} : { priceStatus: value.filterPrice }),
        ...(value.filterPublication === undefined
          ? {}
          : { publicationStatus: value.filterPublication }),
        ...(value.filterReview === undefined ? {} : { manualReviewState: value.filterReview }),
        ...(value.filterSystemId === undefined ? {} : { systemId: value.filterSystemId }),
        ...(value.filterVisibility === undefined ? {} : { visibility: value.filterVisibility }),
      },
      mode: 'FILTER',
    };
  }
  return {
    catalogSourceId: value.catalogSourceId,
    catalogVersionId: value.catalogVersionId,
    expectedCatalogDifferenceChecksum: value.catalogDifferenceChecksum,
    patch,
    reason: value.reason,
    selector,
    syncRunId: value.syncRunId,
  };
}

export function formDataRecord(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(formData.entries());
}

export function rublesToMinorUnits(value: string): number {
  const [rubles = '0', kopecks = ''] = value.replace(',', '.').split('.');
  return Number(rubles) * 100 + Number(kopecks.padEnd(2, '0'));
}
