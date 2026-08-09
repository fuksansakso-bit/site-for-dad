import { createWhatsAppHandoff } from '@project-name/cart';
import {
  requestPublicReferenceSchema,
  whatsappHandoffRequestSchema,
  whatsappHandoffResponseSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import {
  getWebBusinessAdministration,
  getWebCatalogSigningKey,
  getWebRequests,
} from '../../../../../../lib/catalog-runtime';
import { cartOwnerTokenHash, readCartOwnerToken } from '../../../../../../lib/cart-security';
import { parseCartJson } from '../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../lib/pricing-security';
import { requestPublicOrigin, requestRouteErrorCode } from '../../../../../../lib/request-route';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly publicReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    await parseCartJson(request, whatsappHandoffRequestSchema);
    const ownerToken = readCartOwnerToken(request);
    if (ownerToken === null) throw new TypeError('CART_OWNER_REQUIRED');
    const publicReference = requestPublicReferenceSchema.parse(
      (await routeContext.params).publicReference,
    );
    const source = await getWebRequests().generateHandoff({
      correlationId: context.correlationId,
      idempotencyKey,
      ownerTokenHash: cartOwnerTokenHash(ownerToken, signingKey),
      publicReference,
    });
    const settings = await getWebBusinessAdministration().getActiveSettings();
    const handoff = createWhatsAppHandoff(
      {
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
        pricingStatus: source.snapshot.summary.pricingStatus,
        publicSummaryUrl: new URL(
          source.publicSummaryHref,
          requestPublicOrigin(request),
        ).toString(),
        requestNumber: source.requestNumber,
        totalQuantity: source.snapshot.summary.totalQuantity,
        unknownItemCount: source.snapshot.summary.unknownItemCount,
      },
      settings.whatsappRecipient,
    );
    const body = whatsappHandoffResponseSchema.parse({
      ...handoff,
      correlationId: context.correlationId,
      publicSummaryHref: source.publicSummaryHref,
    });
    return NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}
