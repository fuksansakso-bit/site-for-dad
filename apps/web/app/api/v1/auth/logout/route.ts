import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

import {
  assertSameOriginAuthRequest,
  clearPasswordlessSession,
  readRequestCredential,
} from '../../../../../lib/account-session';
import { getWebPasswordlessIdentity } from '../../../../../lib/catalog-runtime';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    await request.json();
    const credential = await readRequestCredential(request);
    if (credential !== null) {
      await getWebPasswordlessIdentity()
        .revokeSession(credential, { correlationId })
        .catch(() => undefined);
    }
    const response = NextResponse.json(
      { status: 'SIGNED_OUT' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    clearPasswordlessSession(response);
    return response;
  } catch {
    return NextResponse.json(
      { code: 'VALIDATION_ERROR', correlationId, message: 'Не удалось завершить сеанс.' },
      { headers: { 'Cache-Control': 'no-store' }, status: 400 },
    );
  }
}
