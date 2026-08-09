import { randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { getWebCustomerContacts } from '../../../../../../lib/catalog-runtime';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../../lib/request-admin-session';
import { staffErrorResponse } from '../../../../../../lib/staff-http';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { readonly params: Promise<{ readonly contactId: string }> },
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    const principal = await requireRequestAdminPrincipal();
    const result = await getWebCustomerContacts().getContact({
      actorId: principal.actorId,
      contactId: (await context.params).contactId,
      correlationId: `customer-api-detail-${correlationId}`,
      role: requestAdminRole(principal),
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
    });
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
