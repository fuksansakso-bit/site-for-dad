import { configuratorBootstrapResponseSchema } from '@project-name/contracts';
import { type NextRequest, NextResponse } from 'next/server';

import { getWebCatalogSigningKey, getWebPricing } from '../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../lib/health-handler';
import { pricingRouteErrorCode } from '../../../../lib/pricing-route';
import {
  issuePricingCsrfToken,
  pricingCsrfCookieName,
  pricingNoStoreHeaders,
  pricingSafeFailure,
} from '../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const csrfToken = issuePricingCsrfToken(getWebCatalogSigningKey());
    const body = configuratorBootstrapResponseSchema.parse({
      ...(await getWebPricing().getBootstrap()),
      correlationId: context.correlationId,
      csrfToken,
    });
    const response = NextResponse.json(body, {
      headers: pricingNoStoreHeaders(context.correlationId),
      status: 200,
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
    return pricingSafeFailure(pricingRouteErrorCode(error), context.correlationId);
  }
}
