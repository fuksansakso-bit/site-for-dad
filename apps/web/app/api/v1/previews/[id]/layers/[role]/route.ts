import { type NextRequest, type NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getWebCatalogSigningKey,
  getWebObjectStorage,
  getWebStandardPreview,
} from '../../../../../../../lib/catalog-runtime';
import {
  createPreviewStaticAssetHandler,
  previewSystemLayerAsset,
} from '../../../../../../../lib/preview-static-assets';
import { requestTelemetryContext } from '../../../../../../../lib/health-handler';
import { previewRouteErrorCode } from '../../../../../../../lib/preview-route';
import {
  previewOwnerTokenHash,
  readPreviewOwnerToken,
} from '../../../../../../../lib/preview-security';
import { pricingSafeFailure } from '../../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

const stateIdSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/u);
const roleSchema = z.enum(['MATERIAL_VISUALIZATION', 'SYSTEM_HARDWARE']);
const serveAsset = createPreviewStaticAssetHandler(getWebObjectStorage);

export async function GET(
  request: NextRequest,
  routeContext: {
    readonly params: Promise<{ readonly id: string; readonly role: string }>;
  },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const params = await routeContext.params;
    const id = stateIdSchema.parse(params.id);
    const role = roleSchema.parse(params.role);
    const ownerToken = readPreviewOwnerToken(request);
    if (ownerToken === null) throw new TypeError('PREVIEW_OWNER_REQUIRED');
    const state = await getWebStandardPreview().get({
      ownerTokenHash: previewOwnerTokenHash(ownerToken, getWebCatalogSigningKey()),
      previewStateId: id,
    });
    return serveAsset(request, previewSystemLayerAsset(state, role), 'private');
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
