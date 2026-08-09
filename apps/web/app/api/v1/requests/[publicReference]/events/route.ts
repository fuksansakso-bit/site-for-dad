import {
  requestCommunicationEventRequestSchema,
  requestCommunicationEventResponseSchema,
  requestPublicReferenceSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebRequests } from '../../../../../../lib/catalog-runtime';
import { cartOwnerTokenHash, readCartOwnerToken } from '../../../../../../lib/cart-security';
import { parseCartJson } from '../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../lib/pricing-security';
import { requestRouteErrorCode } from '../../../../../../lib/request-route';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly publicReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const ownerToken = readCartOwnerToken(request);
    if (ownerToken === null) throw new TypeError('CART_OWNER_REQUIRED');
    const input = await parseCartJson(request, requestCommunicationEventRequestSchema);
    const publicReference = requestPublicReferenceSchema.parse(
      (await routeContext.params).publicReference,
    );
    const recorded = await getWebRequests().recordCommunication({
      correlationId: context.correlationId,
      idempotencyKey,
      ownerTokenHash: cartOwnerTokenHash(ownerToken, signingKey),
      publicReference,
      type: input.type,
    });
    const body = requestCommunicationEventResponseSchema.parse({
      correlationId: context.correlationId,
      recorded,
      type: input.type,
    });
    return NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: recorded ? 201 : 200,
    });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}
