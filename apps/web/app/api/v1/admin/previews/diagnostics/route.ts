import { previewDiagnosticsResponseSchema } from '@project-name/contracts/preview';
import { previewScenes } from '@project-name/preview';
import { type NextRequest, NextResponse } from 'next/server';

import { requireCatalogAdminPrincipal } from '../../../../../../lib/catalog-admin-session';
import { getWebStandardPreview } from '../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { previewRouteErrorCode } from '../../../../../../lib/preview-route';
import { pricingNoStoreHeaders, pricingSafeFailure } from '../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const principal = await requireCatalogAdminPrincipal();
    const body = previewDiagnosticsResponseSchema.parse({
      ...(await getWebStandardPreview().getDiagnostics(principal.actorId)),
      correlationId: context.correlationId,
      sceneCount: previewScenes.length,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
