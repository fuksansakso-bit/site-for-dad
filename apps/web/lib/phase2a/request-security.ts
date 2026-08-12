import 'server-only';

type RateBucket = { count: number; resetAt: number };

const buckets = new Map<string, RateBucket>();

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function isTrustedSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new Error('UNSUPPORTED_CONTENT_TYPE');
  }
  const limit = positiveInteger(process.env['REQUEST_BODY_LIMIT_BYTES'], 65_536);
  const declared = Number.parseInt(request.headers.get('content-length') ?? '0', 10);
  if (declared > limit) throw new Error('REQUEST_TOO_LARGE');
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > limit) throw new Error('REQUEST_TOO_LARGE');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error('INVALID_JSON');
  }
}

export function allowRequest(request: Request, scope: 'order' | 'price'): boolean {
  const now = Date.now();
  const windowSeconds = positiveInteger(process.env['REQUEST_RATE_LIMIT_WINDOW_SECONDS'], 600);
  const defaultMaximum = scope === 'order' ? 8 : 60;
  const configuredMaximum =
    scope === 'order'
      ? positiveInteger(process.env['REQUEST_RATE_LIMIT_MAX'], defaultMaximum)
      : defaultMaximum;
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const client = forwarded?.match(/^[0-9a-f:.]{3,64}$/iu) ? forwarded : 'unknown';
  const key = `${scope}:${client}`;
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    if (buckets.size > 10_000) {
      for (const [candidate, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(candidate);
      }
      while (buckets.size > 10_000) {
        const oldest = buckets.keys().next().value as string | undefined;
        if (!oldest) break;
        buckets.delete(oldest);
      }
    }
    return true;
  }
  if (current.count >= configuredMaximum) return false;
  current.count += 1;
  return true;
}
