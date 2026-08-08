import {
  pricingAdminMutationResponseSchema,
  pricingOverrideRemoveSchema,
  pricingOverrideSetSchema,
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
      parsePricingJson(request, pricingOverrideSetSchema),
    ]);
    const id = await getWebPricing().setLocalOverride({
      actorId: principal.actorId,
      amountMinor: input.amountMinor,
      correlationId: context.correlationId,
      idempotencyKey: `admin:override:set:${idempotencyKey}`,
      materialVariantId: input.materialVariantId,
      reason: input.reason,
    });
    return NextResponse.json(
      pricingAdminMutationResponseSchema.parse({
        correlationId: context.correlationId,
        id,
        ok: true,
      }),
      { headers: pricingNoStoreHeaders(context.correlationId), status: 201 },
    );
  } catch (error) {
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const idempotencyKey = requirePricingMutation(request, getWebCatalogSigningKey(), {
      csrf: false,
    });
    const [principal, input] = await Promise.all([
      requireCatalogAdminPrincipal(),
      parsePricingJson(request, pricingOverrideRemoveSchema),
    ]);
    await getWebPricing().removeLocalOverride({
      actorId: principal.actorId,
      correlationId: context.correlationId,
      idempotencyKey: `admin:override:remove:${idempotencyKey}`,
      materialVariantId: input.materialVariantId,
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
