import {
  publicRequestSummaryResponseSchema,
  requestPublicReferenceSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import {
  getWebBusinessAdministration,
  getWebRequests,
} from '../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { pricingNoStoreHeaders, pricingSafeFailure } from '../../../../../../lib/pricing-security';
import {
  enforcePublicRequestRead,
  requestRouteErrorCode,
} from '../../../../../../lib/request-route';
import { publicRequestSummaryResponse } from '../../../../../../lib/request-summary';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly publicReference: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    enforcePublicRequestRead(request);
    const publicReference = requestPublicReferenceSchema.parse(
      (await routeContext.params).publicReference,
    );
    const [source, settings] = await Promise.all([
      getWebRequests().getPublicSummary(publicReference),
      getWebBusinessAdministration().getActiveSettings(),
    ]);
    const body = publicRequestSummaryResponseSchema.parse(
      publicRequestSummaryResponse(source, publicReference, context.correlationId, settings),
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    const mapped = requestRouteErrorCode(error);
    const code =
      mapped === 'DEPENDENCY_UNAVAILABLE'
        ? 'DEPENDENCY_UNAVAILABLE'
        : mapped === 'RATE_LIMITED'
          ? 'RATE_LIMITED'
          : 'NOT_FOUND';
    return pricingSafeFailure(code, context.correlationId);
  }
}
