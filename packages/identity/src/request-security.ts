import { IdentityError } from './errors.js';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const mutationMethods = new Set(['DELETE', 'PATCH', 'POST', 'PUT']);
const subjectHashPattern = /^[a-f0-9]{64}$/;

export interface RateLimitInput {
  readonly bucket: string;
  readonly subjectHash: string;
}

export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds?: number;
}

export interface RateLimitPort {
  consume(input: RateLimitInput): Promise<RateLimitDecision>;
}

export interface CsrfTokenVerifier {
  verify(input: { readonly subjectHash: string; readonly token: string }): Promise<boolean>;
}

export interface MutationSecurityPolicy {
  readonly allowedOrigins: readonly string[];
  readonly maxBodyBytes: number;
  readonly rateLimitBucket: string;
}

export interface MutationRequestSecurityInput {
  readonly contentLength: string | null;
  readonly contentType: string | null;
  readonly csrfToken: string | null;
  readonly method: string;
  readonly origin: string | null;
  readonly subjectHash: string;
}

function normalizedAllowedOrigins(origins: readonly string[]): ReadonlySet<string> {
  const normalized = new Set<string>();
  for (const candidate of origins) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new IdentityError('IDENTITY_VALIDATION_ERROR');
    }
    if (
      !['http:', 'https:'].includes(parsed.protocol) ||
      parsed.username !== '' ||
      parsed.password !== '' ||
      parsed.pathname !== '/' ||
      parsed.search !== '' ||
      parsed.hash !== ''
    ) {
      throw new IdentityError('IDENTITY_VALIDATION_ERROR');
    }
    normalized.add(parsed.origin);
  }
  if (normalized.size === 0) throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  return normalized;
}

function assertBoundedJsonBody(input: MutationRequestSecurityInput, maximumBytes: number): void {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  if (input.contentLength === null || !/^\d+$/.test(input.contentLength)) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  const contentLength = Number(input.contentLength);
  if (!Number.isSafeInteger(contentLength) || contentLength > maximumBytes) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  const mediaType = input.contentType?.split(';', 1)[0]?.trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
}

export async function enforceMutationRequestSecurity(
  input: MutationRequestSecurityInput,
  policy: MutationSecurityPolicy,
  dependencies: {
    readonly csrf: CsrfTokenVerifier;
    readonly rateLimit: RateLimitPort;
  },
): Promise<'authorized' | 'not-required'> {
  const method = input.method.toUpperCase();
  if (safeMethods.has(method)) return 'not-required';
  if (!mutationMethods.has(method) || !subjectHashPattern.test(input.subjectHash)) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  const allowedOrigins = normalizedAllowedOrigins(policy.allowedOrigins);
  let parsedRequestOrigin: URL;
  try {
    parsedRequestOrigin = new URL(input.origin ?? '');
  } catch {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  if (
    !['http:', 'https:'].includes(parsedRequestOrigin.protocol) ||
    parsedRequestOrigin.username !== '' ||
    parsedRequestOrigin.password !== '' ||
    parsedRequestOrigin.pathname !== '/' ||
    parsedRequestOrigin.search !== '' ||
    parsedRequestOrigin.hash !== '' ||
    !allowedOrigins.has(parsedRequestOrigin.origin)
  ) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  assertBoundedJsonBody(input, policy.maxBodyBytes);
  if (input.csrfToken === null || input.csrfToken.length < 32 || input.csrfToken.length > 512) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  const rateDecision = await dependencies.rateLimit.consume({
    bucket: policy.rateLimitBucket,
    subjectHash: input.subjectHash,
  });
  if (!rateDecision.allowed) throw new IdentityError('IDENTITY_RATE_LIMITED');
  if (
    !(await dependencies.csrf.verify({ subjectHash: input.subjectHash, token: input.csrfToken }))
  ) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  return 'authorized';
}
