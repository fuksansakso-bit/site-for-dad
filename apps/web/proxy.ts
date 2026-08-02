import { resolveCorrelationId, resolveRequestId } from '@project-name/observability/ids';
import { type NextRequest, NextResponse } from 'next/server';

export function createContentSecurityPolicy(nonce: string, development: boolean): string {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''};
    style-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-inline'" : ''};
    connect-src 'self';
    img-src 'self' blob: data:;
    font-src 'self';
    media-src 'none';
    object-src 'none';
    base-uri 'none';
    form-action 'self';
    frame-ancestors 'none';
    worker-src 'self';
  `
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function proxy(request: NextRequest): NextResponse {
  const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
  const requestId = resolveRequestId(request.headers.get('x-request-id'));
  const nonce = btoa(globalThis.crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(
    nonce,
    process.env['NODE_ENV'] === 'development',
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', contentSecurityPolicy);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-correlation-id', correlationId);
  requestHeaders.set('x-request-id', requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
