import { correlationIdSchema } from '@project-name/contracts/health';
import { z } from 'zod';

export const catalogJobIdentifiers = {
  activateVersion: 'catalog-activate-version',
  approveVersion: 'catalog-approve-version',
  buildDiff: 'catalog-build-diff',
  mediaImport: 'catalog-media-import',
  normalize: 'catalog-normalize',
  rollbackVersion: 'catalog-rollback-version',
  sourceDiscovery: 'catalog-source-discovery',
  syncRun: 'catalog-sync-run',
} as const;

export type CatalogJobIdentifier =
  (typeof catalogJobIdentifiers)[keyof typeof catalogJobIdentifiers];

export const catalogJobQueueName = 'catalog-pilot-sync' as const;

const idempotencyKeySchema = z
  .string()
  .min(24)
  .max(255)
  .regex(/^catalog:[a-z0-9][a-z0-9:-]+$/);

const commonPayload = {
  correlationId: correlationIdSchema,
  idempotencyKey: idempotencyKeySchema,
  schemaVersion: z.literal(1),
} as const;

export const catalogSourceDiscoveryPayloadSchema = z
  .object({
    ...commonPayload,
    catalogSourceId: z.uuid(),
    requestedByActorId: z.uuid().optional(),
    retryOfSyncRunId: z.uuid().optional(),
    trigger: z.enum(['AUTOMATIC', 'MANUAL', 'TEST']),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.trigger === 'MANUAL' && payload.requestedByActorId === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'manual catalog discovery requires an actor',
        path: ['requestedByActorId'],
      });
    }
  });

const syncStagePayloadShape = {
  ...commonPayload,
  catalogSourceId: z.uuid(),
  syncRunId: z.uuid(),
} as const;

export const catalogSyncRunPayloadSchema = z.object(syncStagePayloadShape).strict();
export const catalogNormalizePayloadSchema = z.object(syncStagePayloadShape).strict();
export const catalogMediaImportPayloadSchema = z.object(syncStagePayloadShape).strict();
export const catalogBuildDiffPayloadSchema = z.object(syncStagePayloadShape).strict();

const checksumSchema = z.string().regex(/^[0-9a-f]{64}$/);
const governanceReasonSchema = z.string().trim().min(3).max(512);

const versionSelectionShape = {
  catalogVersionId: z.uuid().optional(),
  expectedCatalogDifferenceChecksum: checksumSchema.optional(),
  expectedPriceDifferenceChecksum: checksumSchema.optional(),
  priceVersionId: z.uuid().optional(),
} as const;

function validateVersionSelection(
  payload: {
    readonly catalogVersionId?: string | undefined;
    readonly expectedCatalogDifferenceChecksum?: string | undefined;
    readonly expectedPriceDifferenceChecksum?: string | undefined;
    readonly priceVersionId?: string | undefined;
  },
  context: z.RefinementCtx,
): void {
  if (payload.catalogVersionId === undefined && payload.priceVersionId === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'at least one version must be selected',
      path: ['catalogVersionId'],
    });
  }
  if (
    (payload.catalogVersionId === undefined) !==
    (payload.expectedCatalogDifferenceChecksum === undefined)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'catalog version and checksum must be supplied together',
      path: ['expectedCatalogDifferenceChecksum'],
    });
  }
  if (
    (payload.priceVersionId === undefined) !==
    (payload.expectedPriceDifferenceChecksum === undefined)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'price version and checksum must be supplied together',
      path: ['expectedPriceDifferenceChecksum'],
    });
  }
}

export const catalogApproveVersionPayloadSchema = z
  .object({
    ...syncStagePayloadShape,
    approvedByActorId: z.uuid(),
    approvalReason: governanceReasonSchema,
    ...versionSelectionShape,
  })
  .strict()
  .superRefine(validateVersionSelection);

export const catalogActivateVersionPayloadSchema = z
  .object({
    ...syncStagePayloadShape,
    activatedByActorId: z.uuid(),
    activationReason: governanceReasonSchema,
    ...versionSelectionShape,
  })
  .strict()
  .superRefine(validateVersionSelection);

export const catalogRollbackVersionPayloadSchema = z
  .object({
    ...commonPayload,
    approvedByActorId: z.uuid(),
    catalogSourceId: z.uuid(),
    catalogRollbackTargetId: z.uuid().optional(),
    expectedActiveCatalogVersionId: z.uuid().optional(),
    expectedActivePriceVersionId: z.uuid().optional(),
    priceRollbackTargetId: z.uuid().optional(),
    rollbackReason: governanceReasonSchema,
    rolledBackByActorId: z.uuid(),
  })
  .strict()
  .superRefine((payload, context) => {
    const catalogPair =
      payload.expectedActiveCatalogVersionId !== undefined &&
      payload.catalogRollbackTargetId !== undefined;
    const pricePair =
      payload.expectedActivePriceVersionId !== undefined &&
      payload.priceRollbackTargetId !== undefined;
    if (!catalogPair && !pricePair) {
      context.addIssue({
        code: 'custom',
        message: 'at least one complete rollback pair must be supplied',
        path: ['catalogRollbackTargetId'],
      });
    }
    if (
      (payload.expectedActiveCatalogVersionId === undefined) !==
      (payload.catalogRollbackTargetId === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'catalog active and rollback target must be supplied together',
        path: ['catalogRollbackTargetId'],
      });
    }
    if (
      (payload.expectedActivePriceVersionId === undefined) !==
      (payload.priceRollbackTargetId === undefined)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'price active and rollback target must be supplied together',
        path: ['priceRollbackTargetId'],
      });
    }
  });

export type CatalogSourceDiscoveryPayload = z.infer<typeof catalogSourceDiscoveryPayloadSchema>;
export type CatalogSyncRunPayload = z.infer<typeof catalogSyncRunPayloadSchema>;
export type CatalogNormalizePayload = z.infer<typeof catalogNormalizePayloadSchema>;
export type CatalogMediaImportPayload = z.infer<typeof catalogMediaImportPayloadSchema>;
export type CatalogBuildDiffPayload = z.infer<typeof catalogBuildDiffPayloadSchema>;
export type CatalogApproveVersionPayload = z.infer<typeof catalogApproveVersionPayloadSchema>;
export type CatalogActivateVersionPayload = z.infer<typeof catalogActivateVersionPayloadSchema>;
export type CatalogRollbackVersionPayload = z.infer<typeof catalogRollbackVersionPayloadSchema>;

export type CatalogSyncStagePayload =
  | CatalogBuildDiffPayload
  | CatalogMediaImportPayload
  | CatalogNormalizePayload
  | CatalogSyncRunPayload;

export function catalogStageIdempotencyKey(
  identifier: CatalogJobIdentifier,
  syncRunId: string,
): string {
  return `catalog:${identifier}:${syncRunId}`;
}

export function automaticCatalogDiscoveryPayload(
  catalogSourceId: string,
  runAt: Date,
): CatalogSourceDiscoveryPayload {
  const dateBucket = runAt.toISOString().slice(0, 10);
  return catalogSourceDiscoveryPayloadSchema.parse({
    catalogSourceId,
    correlationId: `catalog-auto-${dateBucket}`,
    idempotencyKey: `catalog:automatic:${catalogSourceId}:${dateBucket}`,
    schemaVersion: 1,
    trigger: 'AUTOMATIC',
  });
}
