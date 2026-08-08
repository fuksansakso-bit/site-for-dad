import {
  pricingAdminCommandSchema,
  pricingAdminMutationResponseSchema,
} from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { requireCatalogAdminPrincipal } from '../../../../../../lib/catalog-admin-session';
import { getWebCatalogSigningKey, getWebPricing } from '../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { parsePricingJson, pricingRouteErrorCode } from '../../../../../../lib/pricing-route';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey(), {
      csrf: false,
    });
    const [principal, input] = await Promise.all([
      requireCatalogAdminPrincipal(),
      parsePricingJson(request, pricingAdminCommandSchema),
    ]);
    await getWebPricing().activateVersion({
      actorId: principal.actorId,
      correlationId: context.correlationId,
      idempotencyKey: `admin:activate:${idempotencyKey}`,
      priceVersionId: input.priceVersionId,
      reason: input.reason,
    });
    return NextResponse.json(
      pricingAdminMutationResponseSchema.parse({ correlationId: context.correlationId, ok: true }),
      { headers: pricingNoStoreHeaders(context.correlationId) },
    );
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
