import {
  adminRequestDetailResponseSchema,
  adminRequestRevokeMutationSchema,
  requestNumberSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebRequests } from '../../../../../../lib/catalog-runtime';
import { parseCartJson } from '../../../../../../lib/cart-route';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { adminRequestDetailResponse } from '../../../../../../lib/request-admin-response';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../../lib/request-admin-session';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../lib/pricing-security';
import { requestPublicOrigin, requestRouteErrorCode } from '../../../../../../lib/request-route';

export const dynamic = 'force-dynamic';

async function requestNumber(routeContext: {
  readonly params: Promise<{ readonly requestNumber: string }>;
}): Promise<string> {
  return requestNumberSchema.parse((await routeContext.params).requestNumber);
}

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly requestNumber: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const principal = await requireRequestAdminPrincipal();
    const body = adminRequestDetailResponseSchema.parse(
      adminRequestDetailResponse(
        await getWebRequests().getAdminRequest({
          actorId: principal.actorId,
          correlationId: context.correlationId,
          requestNumber: await requestNumber(routeContext),
          role: requestAdminRole(principal),
        }),
        getWebCatalogSigningKey(),
        requestPublicOrigin(request),
        context.correlationId,
      ),
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly requestNumber: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey(), {
      csrf: false,
    });
    await parseCartJson(request, adminRequestRevokeMutationSchema);
    const principal = await requireRequestAdminPrincipal();
    const body = adminRequestDetailResponse(
      await getWebRequests().revokePublicReference({
        actorId: principal.actorId,
        correlationId: context.correlationId,
        idempotencyKey,
        requestNumber: await requestNumber(routeContext),
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
