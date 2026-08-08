import { quoteSaveRequestSchema, quoteSnapshotResponseSchema } from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebPricing } from '../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../lib/health-handler';
import { parsePricingJson, pricingRouteErrorCode } from '../../../../lib/pricing-route';
import { pricingNoStoreHeaders, pricingSafeFailure, requirePricingMutation } from '../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey());
    const input = await parsePricingJson(request, quoteSaveRequestSchema);
    const body = quoteSnapshotResponseSchema.parse({
      ...(await getWebPricing().saveQuote({
        calculationToken: input.calculationToken,
        correlationId: context.correlationId,
        idempotencyKey: `public:quote:${idempotencyKey}`,
      })),
      correlationId: context.correlationId,
    });
    return NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
