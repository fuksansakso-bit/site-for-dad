import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

import { CatalogSourceError } from '../../errors.js';
import { amigoAllowedPagePaths, amigoOrigin } from './config.js';

export type AmigoUrlKind = 'media' | 'page' | 'provenance';

function rejectUrl(reason: string): never {
  throw new CatalogSourceError('SOURCE_URL_REJECTED', 'AMIGO source URL was rejected.', {
    safeDetails: { reason },
  });
}

export function amigoPageReference(url: URL): string {
  return `${url.pathname}${url.search}`;
}

export function validateAmigoUrl(
  input: string,
  kind: AmigoUrlKind,
  allowedPageReferences: ReadonlySet<string> = amigoAllowedPagePaths,
): URL {
  let url: URL;
  try {
    url = new URL(input, amigoOrigin);
  } catch (error) {
    throw new CatalogSourceError('SOURCE_URL_REJECTED', 'AMIGO source URL is invalid.', {
      cause: error,
      safeDetails: { reason: 'malformed' },
    });
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname !== 'shop.amigo.ru' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== ''
  ) {
    rejectUrl('origin');
  }
  if (url.pathname.includes('%') || url.pathname.includes('\\')) {
    rejectUrl('encoded-or-backslash-path');
  }

  if (kind === 'media') {
    const mediaPathPatterns = [
      /^\/upload\/iblock\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i,
      /^\/upload\/resize_cache\/iblock\/[a-zA-Z0-9_-]+\/[0-9_a-zA-Z-]+\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i,
      /^\/upload\/webp\/resize_cache\/[a-zA-Z0-9_-]+\/[0-9_a-zA-Z-]+\/[a-zA-Z0-9._-]+\.webp$/i,
      /^\/upload\/(?:medialibrary|uf)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp)$/i,
    ];
    if (
      url.search !== '' ||
      url.hash !== '' ||
      !mediaPathPatterns.some((pattern) => pattern.test(url.pathname))
    ) {
      rejectUrl('media-path');
    }
    return url;
  }

  if (!allowedPageReferences.has(amigoPageReference(url))) {
    rejectUrl('page-path');
  }
  if (kind === 'page' && url.hash !== '') {
    rejectUrl('page-fragment');
  }
  if (kind === 'provenance' && !/^(?:|#(?:material|system)-[0-9]+)$/.test(url.hash)) {
    rejectUrl('provenance-fragment');
  }
  return url;
}

const forbiddenDiscoverySegments = new Set([
  'ajax',
  'api',
  'auth',
  'bitrix',
  'calculator',
  'contacts',
  'filter',
  'login',
  'payments',
  'personal',
  'projects',
  'search',
  'services',
  'upload',
]);

export function validateDiscoveredAmigoPageUrl(input: string, parentSourceUrl: string): URL {
  const parent = new URL(parentSourceUrl);
  let url: URL;
  try {
    url = new URL(input, parent);
  } catch (error) {
    throw new CatalogSourceError('SOURCE_URL_REJECTED', 'AMIGO discovery URL is invalid.', {
      cause: error,
      safeDetails: { reason: 'malformed-discovery-link' },
    });
  }
  if (
    parent.protocol !== 'https:' ||
    parent.hostname !== 'shop.amigo.ru' ||
    url.protocol !== 'https:' ||
    url.hostname !== 'shop.amigo.ru' ||
    url.port !== '' ||
    url.username !== '' ||
    url.password !== '' ||
    url.hash !== '' ||
    url.pathname.includes('%') ||
    url.pathname.includes('\\') ||
    url.pathname.length > 256 ||
    !/^\/(?:[a-z0-9-]+\/){1,4}$/u.test(url.pathname)
  ) {
    rejectUrl('discovery-origin-or-path');
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.some((segment) => forbiddenDiscoverySegments.has(segment))) {
    rejectUrl('discovery-forbidden-segment');
  }
  if (url.search !== '') {
    const match = url.search.match(/^\?PAGEN_([1-9][0-9]*)=([1-9][0-9]*)$/u);
    if (match === null || Number(match[1]) > 10_000 || Number(match[2]) > 10_000) {
      rejectUrl('discovery-query');
    }
  }
  return url;
}

function parseIpv4(address: string): readonly number[] | null {
  if (isIP(address) !== 4) {
    return null;
  }
  const octets = address.split('.').map(Number);
  return octets.length === 4 ? octets : null;
}

export function isPublicNetworkAddress(address: string): boolean {
  const ipv4 = parseIpv4(address);
  if (ipv4 !== null) {
    const [first = 0, second = 0] = ipv4;
    return !(
      first === 0 ||
      first === 10 ||
      first === 127 ||
      first >= 224 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 0) ||
      (first === 192 && second === 168) ||
      (first === 198 && (second === 18 || second === 19))
    );
  }

  if (isIP(address) !== 6) {
    return false;
  }
  const normalized = address.toLowerCase();
  if (normalized.startsWith('::ffff:')) {
    return isPublicNetworkAddress(normalized.slice('::ffff:'.length));
  }
  return !(
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized)
  );
}

export type AmigoHostResolver = (hostname: string) => Promise<readonly string[]>;

export const defaultAmigoHostResolver: AmigoHostResolver = async (hostname) => {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
};

export async function assertAmigoHostResolvesPublicly(resolver: AmigoHostResolver): Promise<void> {
  let addresses: readonly string[];
  try {
    addresses = await resolver('shop.amigo.ru');
  } catch (error) {
    throw new CatalogSourceError('SOURCE_TRANSPORT_UNAVAILABLE', 'AMIGO host resolution failed.', {
      cause: error,
      retryable: true,
    });
  }
  if (addresses.length === 0 || addresses.some((address) => !isPublicNetworkAddress(address))) {
    throw new CatalogSourceError('SOURCE_URL_REJECTED', 'AMIGO host resolved unsafely.', {
      safeDetails: { reason: 'non-public-address' },
    });
  }
}
