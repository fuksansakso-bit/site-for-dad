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

const publicReadWindowMs = 60_000;
const publicReadLimit = 60;
const publicReadCounters = new Map<string, { count: number; resetAt: number }>();

export function enforcePublicRequestReadAddress(address: string): void {
  const key = createHash('sha256').update(`phase1e-public-read:${address}`).digest('hex');
  const now = Date.now();
  const current = publicReadCounters.get(key);
  if (current === undefined || current.resetAt <= now) {
    if (publicReadCounters.size > 2_000) publicReadCounters.clear();
    publicReadCounters.set(key, { count: 1, resetAt: now + publicReadWindowMs });
    return;
  }
  current.count += 1;
  if (current.count > publicReadLimit) throw new PricingRequestError('RATE_LIMITED');
}

export function enforcePublicRequestRead(request: NextRequest): void {
  enforcePublicRequestReadAddress(
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'direct',
  );
}
import { createHash } from 'node:crypto';
