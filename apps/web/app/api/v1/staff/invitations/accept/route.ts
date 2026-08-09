import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { assertSameOriginAuthRequest } from '../../../../../../lib/account-session';
import { getWebStaffAdministration } from '../../../../../../lib/catalog-runtime';
import { staffErrorResponse } from '../../../../../../lib/staff-http';

const schema = z.object({ token: z.string().min(48).max(64) }).strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const body = schema.parse(await request.json());
    await getWebStaffAdministration().acceptInvitation(body.token, { correlationId });
    return NextResponse.json(
      { next: '/login', status: 'INVITATION_ACCEPTED' },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
