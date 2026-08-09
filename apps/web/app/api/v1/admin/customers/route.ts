import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';

import { getWebCustomerContacts } from '../../../../../lib/catalog-runtime';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../lib/request-admin-session';
import { staffErrorResponse } from '../../../../../lib/staff-http';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    const principal = await requireRequestAdminPrincipal();
    const pageValue = Number(request.nextUrl.searchParams.get('page') ?? '1');
    const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const query = (request.nextUrl.searchParams.get('q') ?? '').slice(0, 120);
    const result = await getWebCustomerContacts().listContacts({
      actorId: principal.actorId,
      correlationId: `customer-api-${correlationId}`,
      page,
      pageSize: 50,
      query,
      role: requestAdminRole(principal),
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
    });
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
