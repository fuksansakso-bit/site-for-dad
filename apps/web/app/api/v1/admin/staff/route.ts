import { enqueueEmailDelivery } from '@project-name/jobs';
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  assertSameOriginAuthRequest,
  requireStaffPrincipal,
  trustedRequestOrigin,
} from '../../../../../lib/account-session';
import {
  getWebCatalogJobPool,
  getWebStaffAdministration,
} from '../../../../../lib/catalog-runtime';
import { staffErrorResponse } from '../../../../../lib/staff-http';

export const dynamic = 'force-dynamic';

const invitationSchema = z
  .object({
    email: z.string().trim().min(3).max(254).email(),
    role: z.enum(['MANAGER', 'ADMIN', 'OWNER']),
  })
  .strict();

export async function GET(): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    const principal = await requireStaffPrincipal();
    const administration = getWebStaffAdministration();
    const [staff, invitations, sessions] = await Promise.all([
      administration.listStaff(principal),
      administration.listInvitations(principal),
      administration.listSessions(principal),
    ]);
    return NextResponse.json(
      { invitations, sessions, staff },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } },
    );
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const principal = await requireStaffPrincipal();
    const body = invitationSchema.parse(await request.json());
    const result = await getWebStaffAdministration().createInvitation({
      context: { correlationId },
      email: body.email,
      origin: trustedRequestOrigin(request),
      principal,
      role: body.role,
    });
    await enqueueEmailDelivery(getWebCatalogJobPool(), {
      correlationId,
      deliveryId: result.deliveryId,
      idempotencyKey: `staff-invitation-delivery:${result.invitationId}`,
    });
    return NextResponse.json(
      { invitationId: result.invitationId, status: 'INVITATION_CREATED' },
      {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
        status: 201,
      },
    );
  } catch (error) {
    return staffErrorResponse(error, correlationId);
  }
}
