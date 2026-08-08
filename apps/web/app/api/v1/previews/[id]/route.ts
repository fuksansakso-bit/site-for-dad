import {
  previewDeleteResponseSchema,
  previewStateUpdateSchema,
  standardPreviewStateResponseSchema,
} from '@project-name/contracts/preview';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getWebCatalogSigningKey, getWebStandardPreview } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import {
  parsePreviewJson,
  previewControlPatch,
  previewRouteErrorCode,
  previewStateResponse,
} from '../../../../../lib/preview-route';
import { previewOwnerTokenHash, readPreviewOwnerToken } from '../../../../../lib/preview-security';
import {
  issuePricingCsrfToken,
  pricingCsrfCookieName,
  pricingNoStoreHeaders,
  pricingSafeFailure,
  requirePricingMutation,
} from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';
const stateIdSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/u);

function ownerHash(request: NextRequest): string {
  const token = readPreviewOwnerToken(request);
  if (token === null) throw new TypeError('PREVIEW_OWNER_REQUIRED');
  return previewOwnerTokenHash(token, getWebCatalogSigningKey());
}

async function stateId(context: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<string> {
  return stateIdSchema.parse((await context.params).id);
}

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const state = await getWebStandardPreview().get({
      ownerTokenHash: ownerHash(request),
      previewStateId: await stateId(routeContext),
    });
    const csrfToken = issuePricingCsrfToken(getWebCatalogSigningKey());
    const body = standardPreviewStateResponseSchema.parse(
      previewStateResponse(state, csrfToken, context.correlationId),
    );
    const response = NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
    });
    response.cookies.set(pricingCsrfCookieName, csrfToken, {
      httpOnly: true,
      maxAge: 30 * 60,
      path: '/',
      sameSite: 'strict',
      secure: process.env['NODE_ENV'] === 'production',
    });
    return response;
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}

export async function PATCH(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    requirePricingMutation(request, getWebCatalogSigningKey());
    const input = await parsePreviewJson(request, previewStateUpdateSchema);
    const state = await getWebStandardPreview().update({
      ...(input.controls === undefined ? {} : { controls: previewControlPatch(input.controls) }),
      correlationId: context.correlationId,
      ownerTokenHash: ownerHash(request),
      previewStateId: await stateId(routeContext),
      ...(input.sceneId === undefined ? {} : { sceneId: input.sceneId }),
    });
    const csrfToken = request.headers.get('x-csrf-token');
    if (csrfToken === null) throw new TypeError('PREVIEW_CSRF_REQUIRED');
    const body = standardPreviewStateResponseSchema.parse(
      previewStateResponse(state, csrfToken, context.correlationId),
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}

export async function DELETE(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    requirePricingMutation(request, getWebCatalogSigningKey());
    await getWebStandardPreview().delete({
      ownerTokenHash: ownerHash(request),
      previewStateId: await stateId(routeContext),
    });
    const body = previewDeleteResponseSchema.parse({
      correlationId: context.correlationId,
      deleted: true,
    });
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
