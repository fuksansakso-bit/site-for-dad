'use server';

import { amigoPilotCatalogSourceId } from '@project-name/catalog';
import { IdentityError } from '@project-name/identity';
import {
  enqueueCatalogSourceDiscovery,
  enqueueCatalogVersionActivation,
  enqueueCatalogVersionApproval,
} from '@project-name/jobs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { randomUUID } from 'node:crypto';

import {
  activateReleaseFormSchema,
  approveReleaseFormSchema,
  formDataRecord,
  localPriceOverrideFormSchema,
  overlayFormSchema,
  preparePublicationFormSchema,
  removeLocalPriceOverrideFormSchema,
  rublesToMinorUnits,
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
    await management.composeCatalogVersion({
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
