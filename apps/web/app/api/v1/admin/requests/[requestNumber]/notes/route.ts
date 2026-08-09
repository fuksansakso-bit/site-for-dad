import {
  adminRequestNoteMutationSchema,
  requestNumberSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebRequests } from '../../../../../../../lib/catalog-runtime';
import { parseCartJson } from '../../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../../lib/health-handler';
import { adminRequestDetailResponse } from '../../../../../../../lib/request-admin-response';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../../../lib/request-admin-session';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../../lib/pricing-security';
import { requestPublicOrigin, requestRouteErrorCode } from '../../../../../../../lib/request-route';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly requestNumber: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey(), {
      csrf: false,
    });
    const principal = await requireRequestAdminPrincipal();
    const input = await parseCartJson(request, adminRequestNoteMutationSchema);
    const body = adminRequestDetailResponse(
      await getWebRequests().addAdminNote({
        actorId: principal.actorId,
        body: input.body,
        correlationId: context.correlationId,
        idempotencyKey,
        requestNumber: requestNumberSchema.parse((await routeContext.params).requestNumber),
        role: requestAdminRole(principal),
      }),
      getWebCatalogSigningKey(),
      requestPublicOrigin(request),
      context.correlationId,
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}
