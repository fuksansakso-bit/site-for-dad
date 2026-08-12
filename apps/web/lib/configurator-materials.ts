import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import {
  configuratorMaterialSearchQuerySchema,
  type ConfiguratorMaterialSearchQueryContract,
} from '@project-name/contracts';

import { PricingRequestError } from './pricing-security';

interface CursorPayload {
  readonly catalogVersionId: string;
  readonly fingerprint: string;
  readonly offset: number;
}

function fingerprint(query: ConfiguratorMaterialSearchQueryContract): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        category: query.category,
        family: query.family,
        limit: query.limit,
        q: query.q.toLocaleLowerCase('ru-RU'),
        selected: query.selected ?? '',
        system: query.system,
      }),
    )
    .digest('hex');
}

function signature(payload: string, key: string): string {
  return createHmac('sha256', key).update(`configurator-materials:${payload}`).digest('base64url');
}

export function parseConfiguratorMaterialQuery(
  parameters: URLSearchParams,
): ConfiguratorMaterialSearchQueryContract {
  const raw: Record<string, string> = {};
  const allowed = new Set(['category', 'cursor', 'family', 'limit', 'q', 'selected', 'system']);
  for (const key of new Set(parameters.keys())) {
    const values = parameters.getAll(key);
    if (!allowed.has(key) || values.length !== 1) throw new PricingRequestError('VALIDATION_ERROR');
    const value = values[0];
    if (value !== undefined) raw[key] = value;
  }
  return configuratorMaterialSearchQuerySchema.parse(raw);
}

export function decodeConfiguratorMaterialCursor(
  query: ConfiguratorMaterialSearchQueryContract,
  signingKey: string,
): { readonly catalogVersionId: string | null; readonly offset: number } {
  if (query.cursor === undefined) return { catalogVersionId: null, offset: 0 };
  const [encoded, supplied, extra] = query.cursor.split('.');
  if (encoded === undefined || supplied === undefined || extra !== undefined) {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  const expected = Buffer.from(signature(encoded, signingKey));
  const actual = Buffer.from(supplied);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    (payload as CursorPayload).fingerprint !== fingerprint(query) ||
    typeof (payload as CursorPayload).catalogVersionId !== 'string' ||
    !Number.isSafeInteger((payload as CursorPayload).offset) ||
    (payload as CursorPayload).offset < 0
  ) {
    throw new PricingRequestError('VALIDATION_ERROR');
  }
  return {
    catalogVersionId: (payload as CursorPayload).catalogVersionId,
    offset: (payload as CursorPayload).offset,
  };
}

export function encodeConfiguratorMaterialCursor(
  query: ConfiguratorMaterialSearchQueryContract,
  catalogVersionId: string,
  offset: number,
  signingKey: string,
): string {
  const encoded = Buffer.from(
    JSON.stringify({ catalogVersionId, fingerprint: fingerprint(query), offset }),
    'utf8',
  ).toString('base64url');
  return `${encoded}.${signature(encoded, signingKey)}`;
}
