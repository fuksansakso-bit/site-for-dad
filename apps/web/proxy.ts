import { resolveCorrelationId, resolveRequestId } from '@project-name/observability/ids';
import { type NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest): NextResponse {
  const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
  const requestId = resolveRequestId(request.headers.get('x-request-id'));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-correlation-id', correlationId);
  requestHeaders.set('x-request-id', requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Request-ID', requestId);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
