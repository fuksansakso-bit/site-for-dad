import {
  cartItemCommandRequestSchema,
  cartItemReferenceSchema,
  cartItemReplaceRequestSchema,
  guestCartResponseSchema,
} from '@project-name/contracts/cart';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCart, getWebCatalogSigningKey } from '../../../../../../lib/catalog-runtime';
import {
  cartOwnerTokenHash,
  cartSessionExpiresAt,
  readCartOwnerToken,
} from '../../../../../../lib/cart-security';
import { cartResponse, cartRouteErrorCode, parseCartJson } from '../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import {
  previewOwnerTokenHash,
  readPreviewOwnerToken,
} from '../../../../../../lib/preview-security';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

async function reference(context: {
  readonly params: Promise<{ readonly itemReference: string }>;
}): Promise<string> {
  return cartItemReferenceSchema.parse((await context.params).itemReference);
}

function ownerHash(request: NextRequest, signingKey: string): string {
  const token = readCartOwnerToken(request);
  if (token === null) throw new TypeError('CART_OWNER_REQUIRED');
  return cartOwnerTokenHash(token, signingKey);
}

export async function PATCH(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly itemReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const input = await parseCartJson(request, cartItemReplaceRequestSchema);
    const previewOwner = readPreviewOwnerToken(request);
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken === null) throw new TypeError('CART_CSRF_REQUIRED');
    const body = guestCartResponseSchema.parse(
      cartResponse(
        await getWebCart().replaceQuote({
          correlationId: context.correlationId,
          expectedItemRevision: input.expectedItemRevision,
          idempotencyKey,
          itemReference: await reference(routeContext),
          ownerTokenHash: ownerHash(request, signingKey),
          ...(previewOwner === null
            ? {}
            : { previewOwnerTokenHash: previewOwnerTokenHash(previewOwner, signingKey) }),
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
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly itemReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const input = await parseCartJson(request, cartItemCommandRequestSchema);
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken === null) throw new TypeError('CART_CSRF_REQUIRED');
    const body = guestCartResponseSchema.parse(
      cartResponse(
        await getWebCart().remove({
          correlationId: context.correlationId,
          expectedCartRevision: input.expectedCartRevision,
          idempotencyKey,
          itemReference: await reference(routeContext),
          ownerTokenHash: ownerHash(request, signingKey),
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
