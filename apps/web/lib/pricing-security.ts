import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { createSafeErrorResponse, foundationErrorDefinitions, type FoundationErrorCode } from '@project-name/contracts/error';
import { type NextRequest, NextResponse } from 'next/server';

export const pricingCsrfCookieName = 'project_name_pricing_csrf';
const requestLimit = 60;
const windowMs = 60_000;
const counters = new Map<string, { count: number; resetAt: number }>();

export class PricingRequestError extends Error {
  public constructor(public readonly code: FoundationErrorCode) {
    super(code);
    this.name = 'PricingRequestError';
  }
}

function signature(nonce: string, key: string): string {
  return createHmac('sha256', key).update(`pricing-csrf:${nonce}`).digest('base64url');
}

export function issuePricingCsrfToken(key: string): string {
  const nonce = randomBytes(24).toString('base64url');
  return `${nonce}.${signature(nonce, key)}`;
}

function tokenValid(token: string, key: string): boolean {
  const [nonce, supplied, extra] = token.split('.');
  if (nonce === undefined || supplied === undefined || extra !== undefined) return false;
  const expectedBuffer = Buffer.from(signature(nonce, key));
  const suppliedBuffer = Buffer.from(supplied);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}

function enforceRateBoundary(request: NextRequest): void {
  const key = request.cookies.get(pricingCsrfCookieName)?.value
    ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? 'anonymous';
  const now = Date.now();
  const current = counters.get(key);
  if (current === undefined || current.resetAt <= now) {
    if (counters.size > 2_000) counters.clear();
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > requestLimit) throw new PricingRequestError('RATE_LIMITED');
}

export function requirePricingMutation(
  request: NextRequest,
  signingKey: string,
  options: { readonly csrf: boolean } = { csrf: true },
): string {
  if (request.method === 'GET' || request.method === 'HEAD') {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isSafeInteger(contentLength) || contentLength < 0 || contentLength > 32_768) {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  let originHost: string | null = null;
  try {
    originHost = origin === null ? null : new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (originHost === null || host === null || originHost !== host) {
    throw new PricingRequestError('PERMISSION_DENIED');
  }
  if (options.csrf) {
    const cookie = request.cookies.get(pricingCsrfCookieName)?.value;
    const header = request.headers.get('x-csrf-token');
    if (cookie === undefined || header === null || cookie !== header || !tokenValid(header, signingKey)) {
      throw new PricingRequestError('PERMISSION_DENIED');
    }
  }
  enforceRateBoundary(request);
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey === null || !/^[A-Za-z0-9:._-]{8,180}$/u.test(idempotencyKey)) {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  return idempotencyKey;
}

export function pricingNoStoreHeaders(correlationId: string): Record<string, string> {
  return {
    'Cache-Control': 'private, no-store',
    'X-Correlation-ID': correlationId,
    'X-Content-Type-Options': 'nosniff',
  };
}

export function pricingSafeFailure(code: FoundationErrorCode, correlationId: string): NextResponse {
  return NextResponse.json(createSafeErrorResponse(code, correlationId), {
    headers: pricingNoStoreHeaders(correlationId),
    status: foundationErrorDefinitions[code].httpStatus,
  });
}
