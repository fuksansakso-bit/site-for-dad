import {
  cartItemEditSourceResponseSchema,
  cartItemReferenceSchema,
} from '@project-name/contracts/cart';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCart, getWebCatalogSigningKey } from '../../../../../../../lib/catalog-runtime';
import { cartOwnerTokenHash, readCartOwnerToken } from '../../../../../../../lib/cart-security';
import { cartRouteErrorCode } from '../../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../../lib/health-handler';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
} from '../../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly itemReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const ownerToken = readCartOwnerToken(request);
    if (ownerToken === null) throw new TypeError('CART_OWNER_REQUIRED');
    const itemReference = cartItemReferenceSchema.parse((await routeContext.params).itemReference);
    const source = await getWebCart().getEditSelection(
      cartOwnerTokenHash(ownerToken, getWebCatalogSigningKey()),
      itemReference,
    );
    const body = cartItemEditSourceResponseSchema.parse({
      correlationId: context.correlationId,
      itemReference,
      ...source,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(cartRouteErrorCode(error), context.correlationId);
  }
}
