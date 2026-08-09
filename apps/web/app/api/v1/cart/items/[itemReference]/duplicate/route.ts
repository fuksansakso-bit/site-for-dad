import {
  cartItemCommandRequestSchema,
  cartItemReferenceSchema,
  guestCartResponseSchema,
} from '@project-name/contracts/cart';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCart, getWebCatalogSigningKey } from '../../../../../../../lib/catalog-runtime';
import {
  cartOwnerTokenHash,
  cartSessionExpiresAt,
  readCartOwnerToken,
} from '../../../../../../../lib/cart-security';
import {
  cartResponse,
  cartRouteErrorCode,
  parseCartJson,
} from '../../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../../lib/health-handler';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly itemReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const ownerToken = readCartOwnerToken(request);
    if (ownerToken === null) throw new TypeError('CART_OWNER_REQUIRED');
    const input = await parseCartJson(request, cartItemCommandRequestSchema);
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken === null) throw new TypeError('CART_CSRF_REQUIRED');
    const body = guestCartResponseSchema.parse(
      cartResponse(
        await getWebCart().duplicate({
          correlationId: context.correlationId,
          expectedCartRevision: input.expectedCartRevision,
          idempotencyKey,
          itemReference: cartItemReferenceSchema.parse((await routeContext.params).itemReference),
          ownerTokenHash: cartOwnerTokenHash(ownerToken, signingKey),
          sessionExpiresAt: cartSessionExpiresAt(),
        }),
        csrfToken,
        context.correlationId,
      ),
    );
    return NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}
