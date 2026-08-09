import { cartItemAddRequestSchema, guestCartResponseSchema } from '@project-name/contracts/cart';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCart, getWebCatalogSigningKey } from '../../../../../lib/catalog-runtime';
import {
  cartOwnerTokenHash,
  cartSessionExpiresAt,
  createCartOwnerToken,
  readCartOwnerToken,
  setCartOwnerCookie,
} from '../../../../../lib/cart-security';
import { cartResponse, cartRouteErrorCode, parseCartJson } from '../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { previewOwnerTokenHash, readPreviewOwnerToken } from '../../../../../lib/preview-security';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const existingOwner = readCartOwnerToken(request);
    const ownerToken = existingOwner ?? createCartOwnerToken();
    const input = await parseCartJson(request, cartItemAddRequestSchema);
    const previewOwnerToken = readPreviewOwnerToken(request);
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken === null) throw new TypeError('CART_CSRF_REQUIRED');
    const body = guestCartResponseSchema.parse(
      cartResponse(
        await getWebCart().addQuote({
          correlationId: context.correlationId,
          idempotencyKey,
          ownerTokenHash: cartOwnerTokenHash(ownerToken, signingKey),
          ...(previewOwnerToken === null
            ? {}
            : { previewOwnerTokenHash: previewOwnerTokenHash(previewOwnerToken, signingKey) }),
          ...(input.previewStateId === undefined
            ? {}
            : { previewStateToken: input.previewStateId }),
          quoteToken: input.quoteToken,
          sessionExpiresAt: cartSessionExpiresAt(),
        }),
        csrfToken,
        context.correlationId,
      ),
    );
    const response = NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
    setCartOwnerCookie(response, ownerToken);
    return response;
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}
