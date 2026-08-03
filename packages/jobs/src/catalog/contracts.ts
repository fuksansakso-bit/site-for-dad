import { correlationIdSchema } from '@project-name/contracts/health';
import { z } from 'zod';

export const catalogJobIdentifiers = {
  activateVersion: 'catalog-activate-version',
  buildDiff: 'catalog-build-diff',
  mediaImport: 'catalog-media-import',
  normalize: 'catalog-normalize',
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

export const catalogActivateVersionPayloadSchema = z
  .object({
    ...syncStagePayloadShape,
    approvedByActorId: z.uuid(),
    catalogVersionId: z.uuid(),
    priceVersionId: z.uuid().optional(),
  })
  .strict();

export type CatalogSourceDiscoveryPayload = z.infer<typeof catalogSourceDiscoveryPayloadSchema>;
export type CatalogSyncRunPayload = z.infer<typeof catalogSyncRunPayloadSchema>;
export type CatalogNormalizePayload = z.infer<typeof catalogNormalizePayloadSchema>;
export type CatalogMediaImportPayload = z.infer<typeof catalogMediaImportPayloadSchema>;
export type CatalogBuildDiffPayload = z.infer<typeof catalogBuildDiffPayloadSchema>;
export type CatalogActivateVersionPayload = z.infer<typeof catalogActivateVersionPayloadSchema>;

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
