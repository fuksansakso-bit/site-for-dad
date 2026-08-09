import {
  cartItemCommandRequestSchema,
  guestCartResponseSchema,
} from '@project-name/contracts/cart';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCart, getWebCatalogSigningKey } from '../../../../lib/catalog-runtime';
import {
  cartOwnerTokenHash,
  cartSessionExpiresAt,
  createCartOwnerToken,
  readCartOwnerToken,
  setCartOwnerCookie,
} from '../../../../lib/cart-security';
import { cartResponse, cartRouteErrorCode, parseCartJson } from '../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../lib/health-handler';
import {
  issuePricingCsrfToken,
  pricingCsrfCookieName,
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const existingOwner = readCartOwnerToken(request);
    const ownerToken = existingOwner ?? createCartOwnerToken();
    const csrfToken = issuePricingCsrfToken(signingKey);
    const body = cartResponse(
      await getWebCart().get(cartOwnerTokenHash(ownerToken, signingKey), cartSessionExpiresAt()),
      csrfToken,
      context.correlationId,
    );
    const response = NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
    });
    setCartOwnerCookie(response, ownerToken);
    response.cookies.set(pricingCsrfCookieName, csrfToken, {
      httpOnly: true,
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'strict',
      secure: process.env['NODE_ENV'] === 'production',
    });
    return response;
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
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
        await getWebCart().clear({
          correlationId: context.correlationId,
          expectedCartRevision: input.expectedCartRevision,
          idempotencyKey,
          ownerTokenHash: cartOwnerTokenHash(ownerToken, signingKey),
          sessionExpiresAt: cartSessionExpiresAt(),
        }),
        csrfToken,
        context.correlationId,
      ),
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}
