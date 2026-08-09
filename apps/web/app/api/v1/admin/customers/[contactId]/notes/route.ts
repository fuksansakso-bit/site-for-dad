import { randomUUID } from 'node:crypto';

import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { assertSameOriginAuthRequest } from '../../../../../../../lib/account-session';
import { getWebCustomerContacts } from '../../../../../../../lib/catalog-runtime';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../../../lib/request-admin-session';
import { staffErrorResponse } from '../../../../../../../lib/staff-http';

const bodySchema = z.object({ body: z.string().trim().min(1).max(1000) }).strict();

export async function POST(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly contactId: string }> },
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const principal = await requireRequestAdminPrincipal();
    const body = bodySchema.parse(await request.json());
    const result = await getWebCustomerContacts().addNote({
      actorId: principal.actorId,
      body: body.body,
      contactId: (await context.params).contactId,
      correlationId: `customer-api-note-${correlationId}`,
      idempotencyKey: `customer-contact:api-note:${correlationId}`,
      role: requestAdminRole(principal),
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
      status: 201,
    });
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
