import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  assertSameOriginAuthRequest,
  requireStaffPrincipal,
} from '../../../../../../lib/account-session';
import { getWebStaffAdministration } from '../../../../../../lib/catalog-runtime';
import { staffErrorResponse } from '../../../../../../lib/staff-http';

const commandSchema = z.discriminatedUnion('action', [
  z
    .object({ action: z.literal('CHANGE_ROLE'), role: z.enum(['MANAGER', 'ADMIN', 'OWNER']) })
    .strict(),
  z.object({ action: z.literal('DISABLE') }).strict(),
]);

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ actorId: string }> },
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const principal = await requireStaffPrincipal();
    const { actorId } = await context.params;
    const command = commandSchema.parse(await request.json());
    if (command.action === 'CHANGE_ROLE') {
      await getWebStaffAdministration().changeRole(principal, actorId, command.role, {
        correlationId,
      });
    } else {
      await getWebStaffAdministration().disableStaff(principal, actorId, { correlationId });
    }
    return NextResponse.json(
      { status: 'STAFF_UPDATED' },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
