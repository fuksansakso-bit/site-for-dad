'use server';

import {
  amigoPilotCatalogSourceId,
  type CatalogBusinessBulkPreview,
  type CatalogBusinessBulkResult,
} from '@project-name/catalog';
import { IdentityError } from '@project-name/identity';
import {
  enqueueCatalogSourceDiscovery,
  enqueueCatalogDifferenceReview,
  enqueueCatalogVersionActivation,
  enqueueCatalogVersionApproval,
  enqueueCatalogVersionRollback,
  requestCatalogSyncCancellation,
} from '@project-name/jobs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';

import {
  activateReleaseFormSchema,
  approveReleaseFormSchema,
  type CatalogBulkPreparedRequest,
  composePublicationFormSchema,
  formDataRecord,
  localPriceOverrideFormSchema,
  overlayFormSchema,
  parseCatalogBulkPreviewForm,
  parseReviewDifferencesForm,
  preparePublicationFormSchema,
  removeLocalPriceOverrideFormSchema,
  rollbackReleaseFormSchema,
  rublesToMinorUnits,
  syncRunCommandFormSchema,
} from '../../../lib/catalog-admin-command';
import {
  clearCatalogAdminSession,
  requireCatalogAdminPrincipal,
  setCatalogAdminSession,
} from '../../../lib/catalog-admin-session';
import { getWebCatalogJobPool, getWebCatalogManagement } from '../../../lib/catalog-runtime';

function commandIdentity(action: string): {
  readonly correlationId: string;
  readonly idempotencyKey: string;
} {
  const id = randomUUID();
  return {
    correlationId: `catalog-admin-${action}-${id}`,
    idempotencyKey: `catalog:admin:${action}:${id}`,
  };
}

function safeFailureCode(error: unknown): string {
  if (
    error instanceof Error &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[A-Z][A-Z0-9_]{2,127}$/.test(error.code)
  ) {
    return error.code;
  }
  return 'CATALOG_ADMIN_COMMAND_FAILED';
}

async function finishAdminCommand(
  operation: () => Promise<void>,
  successNotice: string,
): Promise<never> {
  let notice = successNotice;
  try {
    await operation();
    revalidatePath('/admin/catalog');
    revalidatePath('/catalog');
  } catch (error) {
    notice = safeFailureCode(error);
  }
  redirect(`/admin/catalog?notice=${encodeURIComponent(notice)}`);
}

export async function signInCatalogAdmin(formData: FormData): Promise<never> {
  const token = formData.get('token');
  let notice = 'CATALOG_ADMIN_SESSION_OPENED';
  try {
    if (typeof token !== 'string' || token.length > 128) {
      throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    }
    await setCatalogAdminSession(token);
  } catch (error) {
    notice = safeFailureCode(error);
  }
  redirect(`/admin/catalog?notice=${encodeURIComponent(notice)}`);
}

export async function signOutCatalogAdmin(): Promise<never> {
  const { correlationId } = commandIdentity('signout');
  await clearCatalogAdminSession(correlationId);
  redirect('/admin/catalog?notice=CATALOG_ADMIN_SESSION_CLOSED');
}

export async function startManualCatalogSync(): Promise<never> {
  return finishAdminCommand(async () => {
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('manual-sync');
    await enqueueCatalogSourceDiscovery(getWebCatalogJobPool(), {
      catalogSourceId: amigoPilotCatalogSourceId,
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey,
      requestedByActorId: principal.actorId,
      schemaVersion: 1,
      trigger: 'MANUAL',
    });
  }, 'CATALOG_SYNC_ACCEPTED');
}

export async function prepareCatalogPublication(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = preparePublicationFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('prepare-publication');
    const management = getWebCatalogManagement();
    await management.publishPilot({
      actorId: principal.actorId,
      catalogSourceId: input.catalogSourceId,
      catalogVersionId: input.catalogVersionId,
      correlationId,
      expectedCatalogDifferenceChecksum: input.catalogDifferenceChecksum,
      expectedVariantCount: input.expectedVariantCount,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_PUBLICATION_PREPARED');
}

export async function composeCatalogPublication(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = composePublicationFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('compose-publication');
    await getWebCatalogManagement().composeCatalogVersion({
      actorId: principal.actorId,
      catalogSourceId: input.catalogSourceId,
      catalogVersionId: input.catalogVersionId,
      correlationId,
      expectedCatalogDifferenceChecksum: input.catalogDifferenceChecksum,
      expectedVariantCount: input.expectedVariantCount,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_COMPOSITION_FIXED');
}

export async function reviewCatalogDifferences(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = parseReviewDifferencesForm(formData);
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('review-differences');
    await enqueueCatalogDifferenceReview(getWebCatalogJobPool(), {
      catalogSourceId: input.catalogSourceId,
      ...(input.scope === 'CATALOG'
        ? { catalogVersionId: input.catalogVersionId }
        : { priceVersionId: input.priceVersionId as string }),
      correlationId: command.correlationId,
      differenceIds: input.differenceIds,
      expectedDifferenceChecksum:
        input.scope === 'CATALOG'
          ? input.catalogDifferenceChecksum
          : (input.priceDifferenceChecksum as string),
      idempotencyKey: command.idempotencyKey,
      resolution: input.resolution,
      reviewedByActorId: principal.actorId,
      reviewReason: input.reason,
      schemaVersion: 1,
      scope: input.scope,
      selectionMode: input.selectionMode,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_REVIEW_ACCEPTED');
}

export async function approveCatalogRelease(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = approveReleaseFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('approve-release');
    await enqueueCatalogVersionApproval(getWebCatalogJobPool(), {
      approvedByActorId: principal.actorId,
      approvalReason: input.reason,
      catalogSourceId: input.catalogSourceId,
      catalogVersionId: input.catalogVersionId,
      correlationId: command.correlationId,
      expectedCatalogDifferenceChecksum: input.catalogDifferenceChecksum,
      idempotencyKey: command.idempotencyKey,
      ...(input.priceDifferenceChecksum === undefined
        ? {}
        : { expectedPriceDifferenceChecksum: input.priceDifferenceChecksum }),
      ...(input.priceVersionId === undefined ? {} : { priceVersionId: input.priceVersionId }),
      schemaVersion: 1,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_APPROVAL_ACCEPTED');
}

export async function activateCatalogRelease(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = activateReleaseFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('ADMIN');
    const command = commandIdentity('activate-release');
    await enqueueCatalogVersionActivation(getWebCatalogJobPool(), {
      activatedByActorId: principal.actorId,
      activationReason: input.reason,
      catalogSourceId: input.catalogSourceId,
      catalogVersionId: input.catalogVersionId,
      correlationId: command.correlationId,
      expectedCatalogDifferenceChecksum: input.catalogDifferenceChecksum,
      idempotencyKey: command.idempotencyKey,
      ...(input.priceDifferenceChecksum === undefined
        ? {}
        : { expectedPriceDifferenceChecksum: input.priceDifferenceChecksum }),
      ...(input.priceVersionId === undefined ? {} : { priceVersionId: input.priceVersionId }),
      schemaVersion: 1,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_ACTIVATION_ACCEPTED');
}

export async function updateCatalogVariantOverlay(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = overlayFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('variant-overlay');
    await getWebCatalogManagement().setBusinessOverlay({
      actorId: principal.actorId,
      availabilityReason: input.availabilityReason,
      availabilityStatus: input.availabilityStatus,
      correlationId,
      entityId: input.entityId,
      entityType: 'MATERIAL_VARIANT',
      localOrder: 0,
      manualReviewState: 'APPROVED',
      publicationReason: input.publicationReason,
      publicationStatus: input.publicationStatus,
      visibility: input.visibility,
    });
  }, 'CATALOG_OVERLAY_UPDATED');
}

export async function setCatalogLocalPriceOverride(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = localPriceOverrideFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('price-override');
    await getWebCatalogManagement().setLocalPriceOverride({
      actorId: principal.actorId,
      amountMinor: rublesToMinorUnits(input.rubles),
      businessCatalogEntryId: input.businessCatalogEntryId,
      correlationId,
      currency: input.currency,
      effectiveFrom: new Date().toISOString(),
      reason: input.reason,
    });
  }, 'CATALOG_PRICE_OVERRIDE_SET');
}

export async function removeCatalogLocalPriceOverride(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = removeLocalPriceOverrideFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('remove-price-override');
    await getWebCatalogManagement().removeLocalPriceOverride({
      actorId: principal.actorId,
      businessCatalogEntryId: input.businessCatalogEntryId,
      correlationId,
      reason: input.reason,
    });
  }, 'CATALOG_PRICE_OVERRIDE_REMOVED');
}

export async function cancelCatalogSync(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = syncRunCommandFormSchema.parse(formDataRecord(formData));
    if (input.confirmation !== 'ОСТАНОВИТЬ') throw new Error('CATALOG_ADMIN_VALIDATION');
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const { correlationId } = commandIdentity('cancel-sync');
    await requestCatalogSyncCancellation(getWebCatalogJobPool(), {
      actorId: principal.actorId,
      catalogSourceId: input.catalogSourceId,
      correlationId,
      reason: input.reason,
      syncRunId: input.syncRunId,
    });
  }, 'CATALOG_SYNC_CANCELLATION_ACCEPTED');
}

export async function retryCatalogSync(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = syncRunCommandFormSchema.parse(formDataRecord(formData));
    if (input.confirmation !== 'ПОВТОРИТЬ') throw new Error('CATALOG_ADMIN_VALIDATION');
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('retry-sync');
    await enqueueCatalogSourceDiscovery(getWebCatalogJobPool(), {
      catalogSourceId: input.catalogSourceId,
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey,
      requestedByActorId: principal.actorId,
      retryOfSyncRunId: input.syncRunId,
      schemaVersion: 1,
      trigger: 'MANUAL',
    });
  }, 'CATALOG_SYNC_RETRY_ACCEPTED');
}

export async function rollbackCatalogRelease(formData: FormData): Promise<never> {
  return finishAdminCommand(async () => {
    const input = rollbackReleaseFormSchema.parse(formDataRecord(formData));
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('rollback-release');
    await enqueueCatalogVersionRollback(getWebCatalogJobPool(), {
      approvedByActorId: principal.actorId,
      catalogSourceId: amigoPilotCatalogSourceId,
      ...(input.catalogRollbackTargetId === undefined
        ? {}
        : {
            catalogRollbackTargetId: input.catalogRollbackTargetId,
            expectedActiveCatalogVersionId: input.expectedActiveCatalogVersionId as string,
          }),
      correlationId: command.correlationId,
      idempotencyKey: command.idempotencyKey,
      ...(input.priceRollbackTargetId === undefined
        ? {}
        : {
            expectedActivePriceVersionId: input.expectedActivePriceVersionId as string,
            priceRollbackTargetId: input.priceRollbackTargetId,
          }),
      rollbackReason: input.reason,
      rolledBackByActorId: principal.actorId,
      schemaVersion: 1,
    });
  }, 'CATALOG_ROLLBACK_ACCEPTED');
}

export interface CatalogBulkApplyToken {
  readonly correlationId: string;
  readonly expectedSelectionChecksum: string;
  readonly expectedTargetCount: number;
  readonly idempotencyKey: string;
  readonly request: CatalogBulkPreparedRequest;
}

export type CatalogBulkPreviewActionState =
  | { readonly notice: string; readonly status: 'ERROR' }
  | {
      readonly applyToken: CatalogBulkApplyToken;
      readonly notice: 'CATALOG_BULK_PREVIEW_READY';
      readonly preview: CatalogBusinessBulkPreview;
      readonly status: 'PREVIEW';
    };

export type CatalogBulkApplyActionState =
  | { readonly notice: string; readonly status: 'ERROR' }
  | {
      readonly notice: 'CATALOG_BULK_APPLIED';
      readonly result: CatalogBusinessBulkResult;
      readonly status: 'APPLIED';
    };

export async function previewCatalogBusinessBulk(
  formData: FormData,
): Promise<CatalogBulkPreviewActionState> {
  try {
    const request = parseCatalogBulkPreviewForm(formData);
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const command = commandIdentity('bulk-apply');
    const preview = await getWebCatalogManagement().previewBusinessOverlayBulk({
      ...request,
      actorId: principal.actorId,
      correlationId: command.correlationId,
    });
    return {
      applyToken: {
        correlationId: command.correlationId,
        expectedSelectionChecksum: preview.selectionChecksum,
        expectedTargetCount: preview.targetCount,
        idempotencyKey: command.idempotencyKey,
        request,
      },
      notice: 'CATALOG_BULK_PREVIEW_READY',
      preview,
      status: 'PREVIEW',
    };
  } catch (error) {
    return { notice: safeFailureCode(error), status: 'ERROR' };
  }
}

export async function applyCatalogBusinessBulk(
  token: CatalogBulkApplyToken,
  confirmation: string,
): Promise<CatalogBulkApplyActionState> {
  try {
    const principal = await requireCatalogAdminPrincipal('OWNER');
    const result = await getWebCatalogManagement().applyBusinessOverlayBulk({
      ...token.request,
      actorId: principal.actorId,
      confirmation,
      correlationId: token.correlationId,
      expectedSelectionChecksum: token.expectedSelectionChecksum,
      expectedTargetCount: token.expectedTargetCount,
      idempotencyKey: token.idempotencyKey,
    });
    revalidatePath('/admin/catalog');
    revalidatePath('/catalog');
    return { notice: 'CATALOG_BULK_APPLIED', result, status: 'APPLIED' };
  } catch (error) {
    return { notice: safeFailureCode(error), status: 'ERROR' };
  }
}
