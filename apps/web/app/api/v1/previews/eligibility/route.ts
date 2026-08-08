import {
  previewEligibilityResponseSchema,
  previewSourceRequestSchema,
} from '@project-name/contracts/preview';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebStandardPreview } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import {
  parsePreviewJson,
  previewConfigurationResponse,
  previewRouteErrorCode,
  previewSourceReference,
} from '../../../../../lib/preview-route';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    requirePricingMutation(request, getWebCatalogSigningKey());
    const source = await parsePreviewJson(request, previewSourceRequestSchema);
    const view = await getWebStandardPreview().getEligibility(previewSourceReference(source));
    const body = previewEligibilityResponseSchema.parse({
      assetQuality: view.assetQuality,
      configuration: previewConfigurationResponse(view.configuration, view.hardwareColor),
      correlationId: context.correlationId,
      eligible: view.eligibility.eligible,
      family: view.eligibility.family,
      reason: view.eligibility.reason,
      warnings: view.eligibility.warnings,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
