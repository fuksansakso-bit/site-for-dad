import { previewSceneIdSchema } from '@project-name/contracts/preview';
import { type NextRequest, type NextResponse } from 'next/server';

import { getWebObjectStorage } from '../../../../../../../lib/catalog-runtime';
import {
  createPreviewStaticAssetHandler,
  previewSceneAsset,
} from '../../../../../../../lib/preview-static-assets';
import { requestTelemetryContext } from '../../../../../../../lib/health-handler';
import { previewRouteErrorCode } from '../../../../../../../lib/preview-route';
import { pricingSafeFailure } from '../../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

const serveAsset = createPreviewStaticAssetHandler(getWebObjectStorage);

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly sceneId: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const sceneId = previewSceneIdSchema.parse((await routeContext.params).sceneId);
    return serveAsset(request, previewSceneAsset(sceneId), 'public');
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
