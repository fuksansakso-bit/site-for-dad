import { IdentityError } from '@project-name/identity';
import { enqueueEmailDelivery } from '@project-name/jobs';
import { randomUUID } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { assertSameOriginAuthRequest, authClientBucket } from '../../../../../lib/account-session';
import {
  getWebCatalogJobPool,
  getWebPasswordlessIdentity,
} from '../../../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

const requestSchema = z
  .object({
    email: z.string().trim().min(3).max(254).email(),
  })
  .strict();

const neutralBody = {
  message: 'Если адрес доступен для входа, код уже отправлен.',
  resendAfterSeconds: 60,
  status: 'CODE_REQUESTED',
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const correlationId = request.headers.get('x-correlation-id') ?? randomUUID();
  try {
    assertSameOriginAuthRequest(request);
    const body = requestSchema.parse(await request.json());
    const result = await getWebPasswordlessIdentity().requestCode({
      clientBucket: authClientBucket(request),
      context: { correlationId },
      email: body.email,
      purpose: 'STAFF_LOGIN',
    });
    if (result.deliveryId !== null) {
      await enqueueEmailDelivery(getWebCatalogJobPool(), {
        correlationId,
        deliveryId: result.deliveryId,
        idempotencyKey: `email-delivery:${result.deliveryId}`,
      });
    }
    return NextResponse.json(neutralBody, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
      status: 202,
    });
  } catch (error) {
    if (error instanceof IdentityError && error.code === 'IDENTITY_RATE_LIMITED') {
      return NextResponse.json(neutralBody, {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
        status: 202,
      });
    }
    const validation = error instanceof z.ZodError;
    return NextResponse.json(
      {
        code: validation ? 'VALIDATION_ERROR' : 'DEPENDENCY_UNAVAILABLE',
        correlationId,
        message: validation
          ? 'Проверьте адрес электронной почты.'
          : 'Не удалось запросить код. Попробуйте ещё раз.',
      },
      {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-Id': correlationId },
        status: validation ? 400 : 503,
      },
    );
  }
}
