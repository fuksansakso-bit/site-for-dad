import { createWhatsAppHandoff, openPublicReference } from '@project-name/cart';
import {
  adminRequestDetailResponseSchema,
  adminRequestListResponseSchema,
  type AdminRequestDetailResponse,
  type AdminRequestListResponse,
} from '@project-name/contracts/request';
import type { AdminRequestDetailView, AdminRequestListView } from '@project-name/db';

export function requestAdminOrigin(host: string | null): string {
  if (host === null || !/^(?:127\.0\.0\.1|localhost)(?::[0-9]{2,5})?$/u.test(host)) {
    throw new TypeError('REQUEST_ADMIN_ORIGIN_INVALID');
  }
  return `http://${host}`;
}

export function adminRequestListResponse(
  source: AdminRequestListView,
  correlationId: string,
): AdminRequestListResponse {
  return adminRequestListResponseSchema.parse({ ...source, correlationId });
}

export function adminRequestDetailResponse(
  source: AdminRequestDetailView,
  signingKey: string,
  publicOrigin: string,
  correlationId: string,
): AdminRequestDetailResponse {
  const { publicReferenceSealed, ...visible } = source;
  let publicReference: string | null = null;
  if (publicReferenceSealed !== null && source.publicReferenceRevokedAt === null) {
    try {
      publicReference = openPublicReference(signingKey, publicReferenceSealed);
    } catch {
      publicReference = null;
    }
  }
  const publicSummaryHref = publicReference === null ? null : `/request/${publicReference}`;
  const whatsappUrl =
    publicSummaryHref === null
      ? null
      : createWhatsAppHandoff({
          installmentInterest: source.installmentInterest,
          items: source.snapshot.items.map((item) => ({
            family: item.product.family,
            heightMm: item.product.heightMm,
            material: item.product.material,
            materialArticle: item.product.materialArticle,
            model: item.product.model,
            quantity: item.product.quantity,
            quantityTotalKopecks: item.quantityTotalKopecks,
            system: item.product.system,
            widthMm: item.product.widthMm,
          })),
          knownSubtotalKopecks: source.snapshot.summary.knownSubtotalKopecks,
          locality: source.locality,
          measurementRequested: source.measurementRequested,
          pricingStatus: source.pricingStatus,
          publicSummaryUrl: new URL(publicSummaryHref, publicOrigin).toString(),
          requestNumber: source.requestNumber,
          totalQuantity: source.totalQuantity,
          unknownItemCount: source.snapshot.summary.unknownItemCount,
        }).whatsappUrl;
  return adminRequestDetailResponseSchema.parse({
    ...visible,
    correlationId,
    publicSummaryHref,
    whatsappUrl,
  });
}
