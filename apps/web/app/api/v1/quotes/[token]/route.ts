import { quoteSnapshotResponseSchema } from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebPricing } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { pricingRouteErrorCode } from '../../../../../lib/pricing-route';
import { pricingNoStoreHeaders, pricingSafeFailure } from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  contextValue: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const { token } = await contextValue.params;
    const body = quoteSnapshotResponseSchema.parse({
      ...(await getWebPricing().getQuote(token)),
      correlationId: context.correlationId,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
