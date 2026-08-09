import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import {
  assertSameOriginAuthRequest,
  requireStaffPrincipal,
} from '../../../../../../../../lib/account-session';
import { getWebStaffAdministration } from '../../../../../../../../lib/catalog-runtime';
import { staffErrorResponse } from '../../../../../../../../lib/staff-http';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ invitationId: string }> },
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const principal = await requireStaffPrincipal();
    const { invitationId } = await context.params;
    await request.json();
    await getWebStaffAdministration().revokeInvitation(principal, invitationId, {
      correlationId,
    });
    return NextResponse.json(
      { status: 'INVITATION_REVOKED' },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
