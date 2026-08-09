import { IdentityError } from '@project-name/identity';
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import {
  assertSameOriginAuthRequest,
  authClientBucket,
  setPasswordlessSession,
} from '../../../../../lib/account-session';
import { getWebPasswordlessIdentity } from '../../../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

const verifySchema = z
  .object({
    code: z.string().regex(/^\d{6}$/),
    email: z.string().trim().min(3).max(254).email(),
  })
  .strict();

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = request.headers.get('x-correlation-id') ?? randomUUID();
  const minimumResponse = new Promise<void>((resolve) => setTimeout(resolve, 300));
  try {
    assertSameOriginAuthRequest(request);
    const body = verifySchema.parse(await request.json());
    const result = await getWebPasswordlessIdentity().verifyCode({
      clientBucket: authClientBucket(request),
      code: body.code,
      context: { correlationId },
      email: body.email,
      purpose: 'STAFF_LOGIN',
    });
    await minimumResponse;
    const response = NextResponse.json(
      {
        next: '/admin',
        status: 'AUTHENTICATED',
      },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId } },
    );
    setPasswordlessSession(response, result);
    return response;
  } catch (error) {
    await minimumResponse;
    const validation = error instanceof z.ZodError;
    const unavailable =
      error instanceof IdentityError && error.code === 'IDENTITY_DEPENDENCY_UNAVAILABLE';
    return NextResponse.json(
      {
        code: unavailable ? 'DEPENDENCY_UNAVAILABLE' : 'AUTHENTICATION_REQUIRED',
        correlationId,
        message: unavailable
          ? 'Сервис входа временно недоступен. Попробуйте позже.'
          : validation
            ? 'Введите шестизначный код.'
            : 'Код неверен или уже истёк. Запросите новый код.',
      },
      {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
        status: unavailable ? 503 : 401,
      },
    );
  }
}
