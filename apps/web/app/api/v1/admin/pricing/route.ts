import { pricingAdminOverviewResponseSchema } from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { requireCatalogAdminPrincipal } from '../../../../../lib/catalog-admin-session';
import { getWebPricing } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { pricingRouteErrorCode } from '../../../../../lib/pricing-route';
import { pricingNoStoreHeaders, pricingSafeFailure } from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    await requireCatalogAdminPrincipal();
    const body = pricingAdminOverviewResponseSchema.parse({
      ...(await getWebPricing().getAdminOverview()),
      correlationId: context.correlationId,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
