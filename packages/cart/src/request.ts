import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomInt,
} from 'node:crypto';

export const requestStatuses = ['NEW', 'IN_REVIEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED'] as const;

export type RequestStatus = (typeof requestStatuses)[number];
export type RequestStaffRole = 'MANAGER' | 'ADMIN' | 'OWNER';

const requestAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeContactPhone(value: string): string {
  const compact = value.trim().replace(/[\s()-]/gu, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/u.test(digits)) throw new TypeError('CONTACT_PHONE_INVALID');
  const normalized =
    digits.length === 11 && digits.startsWith('8')
      ? `+7${digits.slice(1)}`
      : digits.length === 11 && digits.startsWith('7')
        ? `+${digits}`
        : compact.startsWith('+')
          ? `+${digits}`
          : '';
  if (!/^\+[1-9]\d{7,14}$/u.test(normalized)) throw new TypeError('CONTACT_PHONE_INVALID');
  return normalized;
}

export function createRequestNumber(now = new Date()): string {
  if (!Number.isFinite(now.valueOf())) throw new TypeError('REQUEST_DATE_INVALID');
  const date = now.toISOString().slice(2, 10).replaceAll('-', '');
  let suffix = '';
  for (let index = 0; index < 8; index += 1) {
    suffix += requestAlphabet[randomInt(requestAlphabet.length)];
  }
  return `REQ-${date}-${suffix}`;
}

export function derivePublicReference(
  signingKey: string,
  ownerTokenHash: string,
  idempotencyKey: string,
): string {
  if (signingKey.length < 32 || !/^[0-9a-f]{64}$/u.test(ownerTokenHash)) {
    throw new TypeError('PUBLIC_REFERENCE_INPUT_INVALID');
  }
  return createHmac('sha256', signingKey)
    .update(`phase1e-request-public:${ownerTokenHash}:${idempotencyKey}`)
    .digest('base64url');
}

export function publicReferenceHash(reference: string): string {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(reference)) {
    throw new TypeError('PUBLIC_REFERENCE_INVALID');
  }
  return createHash('sha256').update(reference).digest('hex');
}

function publicReferenceEncryptionKey(signingKey: string): Buffer {
  if (signingKey.length < 32) throw new TypeError('PUBLIC_REFERENCE_KEY_INVALID');
  return createHash('sha256').update(`phase1e-public-reference-encryption:${signingKey}`).digest();
}

export function sealPublicReference(signingKey: string, reference: string): string {
  publicReferenceHash(reference);
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', publicReferenceEncryptionKey(signingKey), nonce);
  const encrypted = Buffer.concat([cipher.update(reference, 'utf8'), cipher.final()]);
  return `v1.${nonce.toString('base64url')}.${encrypted.toString('base64url')}.${cipher
    .getAuthTag()
    .toString('base64url')}`;
}

export function openPublicReference(signingKey: string, sealed: string): string {
  const [version, nonceText, encryptedText, tagText, extra] = sealed.split('.');
  if (
    version !== 'v1' ||
    nonceText === undefined ||
    encryptedText === undefined ||
    tagText === undefined ||
    extra !== undefined
  ) {
    throw new TypeError('PUBLIC_REFERENCE_SEALED_INVALID');
  }
  try {
    const nonce = Buffer.from(nonceText, 'base64url');
    const encrypted = Buffer.from(encryptedText, 'base64url');
    const tag = Buffer.from(tagText, 'base64url');
    if (nonce.length !== 12 || tag.length !== 16 || encrypted.length === 0) {
      throw new TypeError('PUBLIC_REFERENCE_SEALED_INVALID');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      publicReferenceEncryptionKey(signingKey),
      nonce,
    );
    decipher.setAuthTag(tag);
    const reference = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
      'utf8',
    );
    publicReferenceHash(reference);
    return reference;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'PUBLIC_REFERENCE_SEALED_INVALID') {
      throw error;
    }
    throw new TypeError('PUBLIC_REFERENCE_SEALED_INVALID', { cause: error });
  }
}

export function canTransitionRequestStatus(
  from: RequestStatus,
  to: RequestStatus,
  role: RequestStaffRole,
): boolean {
  if (from === to) return true;
  if (from === 'NEW') return to === 'IN_REVIEW' || to === 'CANCELLED';
  if (from === 'IN_REVIEW') return to === 'CONTACTED' || to === 'CANCELLED';
  if (from === 'CONTACTED') return to === 'CONFIRMED' || to === 'CANCELLED';
  if (from === 'CONFIRMED') return to === 'CANCELLED' && role !== 'MANAGER';
  return from === 'CANCELLED' && to === 'IN_REVIEW' && role !== 'MANAGER';
}
