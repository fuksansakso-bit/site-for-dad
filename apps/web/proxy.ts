import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

function safeRequestId(value: string | null): string {
  return value?.match(/^[A-Za-z0-9_-]{8,128}$/u) ? value : globalThis.crypto.randomUUID();
}

function supabaseOrigin(): string | null {
  const value = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function createContentSecurityPolicy(
  nonce: string,
  development: boolean,
  dataOrigin: string | null = null,
): string {
  const remote = dataOrigin === null ? '' : ` ${dataOrigin}`;
  return `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''};
    style-src 'self' 'unsafe-inline';
    connect-src 'self'${remote};
    img-src 'self' blob: data:${remote};
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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const correlationId = safeRequestId(request.headers.get('x-correlation-id'));
  const requestId = safeRequestId(request.headers.get('x-request-id'));
  const nonce = btoa(globalThis.crypto.randomUUID());
  const contentSecurityPolicy = createContentSecurityPolicy(
    nonce,
    process.env['NODE_ENV'] === 'development',
    supabaseOrigin(),
  );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('content-security-policy', contentSecurityPolicy);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-correlation-id', correlationId);
  requestHeaders.set('x-request-id', requestId);
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          for (const cookie of cookies) request.cookies.set(cookie.name, cookie.value);
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const cookie of cookies)
            response.cookies.set(cookie.name, cookie.value, cookie.options);
        },
      },
    });
    await supabase.auth.getClaims();
  }
  response.headers.set('X-Correlation-ID', correlationId);
  response.headers.set('X-Request-ID', requestId);
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
