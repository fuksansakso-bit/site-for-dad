import {
  previewCreateResponseSchema,
  previewSourceRequestSchema,
} from '@project-name/contracts/preview';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebStandardPreview } from '../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../lib/health-handler';
import {
  parsePreviewJson,
  previewRouteErrorCode,
  previewSourceReference,
} from '../../../../lib/preview-route';
import {
  createPreviewOwnerToken,
  previewOwnerTokenHash,
  readPreviewOwnerToken,
  setPreviewOwnerCookie,
} from '../../../../lib/preview-security';
import {
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const signingKey = getWebCatalogSigningKey();
    const idempotencyKey = requirePricingMutation(request, signingKey);
    const source = await parsePreviewJson(request, previewSourceRequestSchema);
    const ownerToken = readPreviewOwnerToken(request) ?? createPreviewOwnerToken();
    const state = await getWebStandardPreview().create({
      correlationId: context.correlationId,
      idempotencyKey: `public:preview:${idempotencyKey}`,
      ownerTokenHash: previewOwnerTokenHash(ownerToken, signingKey),
      source: previewSourceReference(source),
    });
    const body = previewCreateResponseSchema.parse({
      correlationId: context.correlationId,
      href: `/preview?state=${state.id}`,
      previewStateId: state.id,
    });
    const response = NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 201,
    });
    setPreviewOwnerCookie(response, ownerToken);
    return response;
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
