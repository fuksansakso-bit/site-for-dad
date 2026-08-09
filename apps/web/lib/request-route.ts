import { RequestStoreError } from '@project-name/db';
import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PricingRequestError } from './pricing-security';

export function requestRouteErrorCode(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) {
    return 'VALIDATION_ERROR' as const;
  }
  if (error instanceof PricingRequestError) return error.code;
  if (error instanceof RequestStoreError) {
    switch (error.code) {
      case 'REQUEST_AUTHORIZATION':
        return 'PERMISSION_DENIED' as const;
      case 'REQUEST_CART_EMPTY':
      case 'REQUEST_CONFLICT':
        return 'CONFLICT' as const;
      case 'REQUEST_INVALID_INPUT':
        return 'VALIDATION_ERROR' as const;
      case 'REQUEST_NOT_FOUND':
        return 'NOT_FOUND' as const;
      case 'REQUEST_DATABASE':
        return 'DEPENDENCY_UNAVAILABLE' as const;
    }
  }
  return 'INTERNAL_ERROR' as const;
}

export function requestPublicOrigin(request: NextRequest): string {
  const origin = new URL(request.nextUrl.origin);
  if (origin.username || origin.password) throw new TypeError('REQUEST_ORIGIN_INVALID');
  const environment = process.env['APP_ENV'] ?? '';
  if (['local', 'test', 'ci'].includes(environment)) {
    if (!['127.0.0.1', 'localhost'].includes(origin.hostname)) {
      throw new TypeError('REQUEST_ORIGIN_INVALID');
    }
  } else if (origin.protocol !== 'https:') {
    throw new TypeError('REQUEST_ORIGIN_INVALID');
  }
  return origin.origin;
}
