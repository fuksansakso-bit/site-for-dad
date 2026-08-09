import {
  adminRequestListResponseSchema,
  requestStatusSchema,
} from '@project-name/contracts/request';
import { type NextRequest, NextResponse } from 'next/server';

import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../lib/request-admin-session';
import { adminRequestListResponse } from '../../../../../lib/request-admin-response';
import { getWebRequests } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { pricingNoStoreHeaders, pricingSafeFailure } from '../../../../../lib/pricing-security';
import { requestRouteErrorCode } from '../../../../../lib/request-route';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const principal = await requireRequestAdminPrincipal();
    const pageValue = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const statusValue = request.nextUrl.searchParams.get('status');
    const parsedStatus = statusValue === null ? null : requestStatusSchema.safeParse(statusValue);
    const status = parsedStatus === null || !parsedStatus.success ? null : parsedStatus.data;
    const body = adminRequestListResponseSchema.parse(
      adminRequestListResponse(
        await getWebRequests().listAdminRequests({
          actorId: principal.actorId,
          correlationId: context.correlationId,
          page,
          pageSize: 50,
          role: requestAdminRole(principal),
          status,
        }),
        context.correlationId,
      ),
    );
    return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
  } catch (error) {
    return pricingSafeFailure(requestRouteErrorCode(error), context.correlationId);
  }
}
