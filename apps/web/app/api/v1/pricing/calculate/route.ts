import { pricingCalculationResponseSchema, pricingSelectionSchema } from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebPricing } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { parsePricingJson, pricingRouteErrorCode } from '../../../../../lib/pricing-route';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey());
    const selection = await parsePricingJson(request, pricingSelectionSchema);
    const body = pricingCalculationResponseSchema.parse({
      ...(await getWebPricing().calculate({
        correlationId: context.correlationId,
        idempotencyKey: `public:calculate:${idempotencyKey}`,
        selection,
      })),
      correlationId: context.correlationId,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
