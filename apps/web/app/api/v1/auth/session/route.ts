import { NextResponse } from 'next/server';

import { readStaffPrincipal } from '../../../../../lib/account-session';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const staff = await readStaffPrincipal();
  return NextResponse.json(
    {
      staff:
        staff === null
          ? null
          : { expiresAt: staff.expiresAt, roles: staff.roles, rotationDue: staff.rotationDue },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
