import { derivePublicReference, normalizeContactPhone } from '@project-name/cart';
import {
  guestCheckoutRequestSchema,
  guestCheckoutResponseSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebRequests } from '../../../../lib/catalog-runtime';
import { cartOwnerTokenHash, readCartOwnerToken } from '../../../../lib/cart-security';
import { parseCartJson } from '../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../lib/health-handler';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../lib/pricing-security';
import { requestRouteErrorCode } from '../../../../lib/request-route';

export const dynamic = 'force-dynamic';
const consentVersion = 'phase1e-local-v1';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    if (!['local', 'test', 'ci'].includes(process.env['APP_ENV'] ?? '')) {
      throw new TypeError('PRODUCTION_PII_INTAKE_DISABLED');
    }
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const ownerToken = readCartOwnerToken(request);
    if (ownerToken === null) throw new TypeError('CART_OWNER_REQUIRED');
    const ownerTokenHash = cartOwnerTokenHash(ownerToken, signingKey);
    const input = await parseCartJson(request, guestCheckoutRequestSchema);
    const body = guestCheckoutResponseSchema.parse({
      ...(await getWebRequests().checkout({
        address: input.address ?? null,
        comment: input.comment ?? null,
        consentVersion,
        contactName: input.contactName,
        contactPhone: normalizeContactPhone(input.contactPhone),
        correlationId: context.correlationId,
        expectedCartRevision: input.expectedCartRevision,
        idempotencyKey,
        installmentInterest: input.installmentInterest,
        locality: input.locality,
        measurementRequested: input.measurementRequested,
        ownerTokenHash,
        publicReference: derivePublicReference(signingKey, ownerTokenHash, idempotencyKey),
      })),
      correlationId: context.correlationId,
    });
    return NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}
