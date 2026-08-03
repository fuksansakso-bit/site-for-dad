import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { CatalogPublicMaterial, CatalogPublicSnapshot } from '@project-name/catalog';
import {
  publicCatalogMaterialSchema,
  publicCatalogQuerySchema,
  type PublicCatalogFacetOption,
  type PublicCatalogFacets,
  type PublicCatalogMaterial,
  type PublicCatalogQuery,
  type PublicCatalogResponse,
} from '@project-name/contracts/catalog';

const allowedQueryKeys = new Set([
  'availability',
  'blackout',
  'category',
  'color',
  'cursor',
  'limit',
  'q',
  'system',
  'zebra',
]);

const availabilityLabels = {
  INQUIRY_ONLY: 'Наличие по запросу',
  IN_STOCK: 'Материал доступен',
  OUT_OF_STOCK: 'Временно нет в наличии',
} as const;

export class CatalogPublicQueryError extends Error {
  constructor() {
    super('CATALOG_PUBLIC_QUERY_INVALID');
    this.name = 'CatalogPublicQueryError';
  }
}

export type CatalogPublicPage = Omit<PublicCatalogResponse, 'correlationId'>;

type SearchParameters =
  Readonly<Record<string, string | readonly string[] | undefined>> | URLSearchParams;

function rawQuery(parameters: SearchParameters): Record<string, string> {
  const result: Record<string, string> = {};
  if (parameters instanceof URLSearchParams) {
    for (const key of new Set(parameters.keys())) {
      const values = parameters.getAll(key);
      if (!allowedQueryKeys.has(key) || values.length !== 1) {
        throw new CatalogPublicQueryError();
      }
      const value = values[0];
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined) continue;
    if (!allowedQueryKeys.has(key) || typeof value !== 'string') {
      throw new CatalogPublicQueryError();
    }
    result[key] = value;
  }
  return result;
}

export function parseCatalogPublicQuery(parameters: SearchParameters): PublicCatalogQuery {
  const parsed = publicCatalogQuerySchema.safeParse(rawQuery(parameters));
  if (!parsed.success) throw new CatalogPublicQueryError();
  return parsed.data;
}

function normalizedQuery(query: PublicCatalogQuery): Record<string, boolean | number | string> {
  return {
    availability: query.availability ?? '',
    blackout: query.blackout,
    category: query.category ?? '',
    color: query.color ?? '',
    limit: query.limit,
    q: query.q.toLocaleLowerCase('ru-RU'),
    system: query.system ?? '',
    zebra: query.zebra,
  };
}

function queryFingerprint(snapshot: CatalogPublicSnapshot, query: PublicCatalogQuery): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        catalogVersionId: snapshot.catalogVersion.id,
        priceVersionId: snapshot.priceVersion.id,
        query: normalizedQuery(query),
      }),
    )
    .digest('hex');
}

interface CursorPayload {
  readonly fingerprint: string;
  readonly offset: number;
}

function signCursor(encodedPayload: string, signingKey: string): string {
  return createHmac('sha256', signingKey).update(encodedPayload).digest('base64url');
}

function encodeCursor(payload: CursorPayload, signingKey: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encodedPayload}.${signCursor(encodedPayload, signingKey)}`;
}

function decodeCursor(cursor: string, fingerprint: string, signingKey: string): number {
  const [encodedPayload, suppliedSignature, extra] = cursor.split('.');
  if (encodedPayload === undefined || suppliedSignature === undefined || extra !== undefined) {
    throw new CatalogPublicQueryError();
  }
  const expectedSignature = Buffer.from(signCursor(encodedPayload, signingKey), 'utf8');
  const actualSignature = Buffer.from(suppliedSignature, 'utf8');
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    throw new CatalogPublicQueryError();
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new CatalogPublicQueryError();
  }
  if (
    typeof payload !== 'object' ||
    payload === null ||
    Array.isArray(payload) ||
    (payload as Record<string, unknown>)['fingerprint'] !== fingerprint ||
    !Number.isSafeInteger((payload as Record<string, unknown>)['offset']) ||
    Number((payload as Record<string, unknown>)['offset']) < 0
  ) {
    throw new CatalogPublicQueryError();
  }
  return Number((payload as Record<string, unknown>)['offset']);
}

type SkippedFilter = 'availability' | 'category' | 'color' | 'features' | 'system' | undefined;

function matchesMaterial(
  item: CatalogPublicMaterial,
  query: PublicCatalogQuery,
  skippedFilter?: SkippedFilter,
): boolean {
  const search = query.q.toLocaleLowerCase('ru-RU');
  if (
    search.length > 0 &&
    ![
      item.article,
      item.category.name,
      item.color?.name ?? '',
      item.materialName,
      item.name,
      item.system?.name ?? '',
    ].some((value) => value.toLocaleLowerCase('ru-RU').includes(search))
  ) {
    return false;
  }
  if (skippedFilter !== 'category' && query.category !== undefined) {
    if (item.category.slug !== query.category) return false;
  }
  if (skippedFilter !== 'system' && query.system !== undefined) {
    if (item.system?.slug !== query.system) return false;
  }
  if (skippedFilter !== 'color' && query.color !== undefined) {
    if (item.color?.slug !== query.color) return false;
  }
  if (skippedFilter !== 'availability' && query.availability !== undefined) {
    if (item.availability !== query.availability) return false;
  }
  if (skippedFilter !== 'features') {
    if (query.blackout && !item.isBlackout) return false;
    if (query.zebra && !item.isZebra) return false;
  }
  return true;
}

function facetOptions(
  items: readonly CatalogPublicMaterial[],
  valueFor: (
    item: CatalogPublicMaterial,
  ) => { readonly label: string; readonly value: string } | null,
): PublicCatalogFacetOption[] {
  const counts = new Map<string, { count: number; label: string }>();
  for (const item of items) {
    const option = valueFor(item);
    if (option === null) continue;
    const current = counts.get(option.value);
    counts.set(option.value, {
      count: (current?.count ?? 0) + 1,
      label: option.label,
    });
  }
  return [...counts.entries()]
    .map(([value, option]) => ({ ...option, value }))
    .sort((left, right) => left.label.localeCompare(right.label, 'ru'));
}

function publicFacets(
  items: readonly CatalogPublicMaterial[],
  query: PublicCatalogQuery,
): PublicCatalogFacets {
  const forFacet = (skipped: Exclude<SkippedFilter, undefined>) =>
    items.filter((item) => matchesMaterial(item, query, skipped));
  const featureItems = forFacet('features');
  const features: PublicCatalogFacetOption[] = [
    {
      count: featureItems.filter((item) => item.isBlackout).length,
      label: 'Blackout',
      value: 'blackout',
    },
    {
      count: featureItems.filter((item) => item.isZebra).length,
      label: 'Зебра / День-Ночь',
      value: 'zebra',
    },
  ].filter((option) => option.count > 0);
  return {
    availability: facetOptions(forFacet('availability'), (item) => ({
      label: availabilityLabels[item.availability],
      value: item.availability,
    })),
    categories: facetOptions(forFacet('category'), (item) => ({
      label: item.category.name,
      value: item.category.slug,
    })),
    colors: facetOptions(forFacet('color'), (item) =>
      item.color === null ? null : { label: item.color.name, value: item.color.slug },
    ),
    features,
    systems: facetOptions(forFacet('system'), (item) =>
      item.system === null ? null : { label: item.system.name, value: item.system.slug },
    ),
  };
}

function publicMaterial(item: CatalogPublicMaterial, versionId: string): PublicCatalogMaterial {
  return publicCatalogMaterialSchema.parse({
    article: item.article,
    availability: item.availability,
    category: item.category,
    color: item.color,
    description: item.description,
    id: item.id,
    isBlackout: item.isBlackout,
    isZebra: item.isZebra,
    materialName: item.materialName,
    media: {
      height: item.media.height,
      id: item.media.id,
      type: item.media.contentType,
      url: `/api/v1/catalog/media/${item.media.id}?v=${versionId}`,
      width: item.media.width,
    },
    name: item.name,
    price: item.price,
    slug: item.slug,
    system: item.system,
    widthMm: item.widthMm,
  });
}

const emptyFacets: PublicCatalogFacets = {
  availability: [],
  categories: [],
  colors: [],
  features: [],
  systems: [],
};

export function selectCatalogPublicPage(
  snapshot: CatalogPublicSnapshot | null,
  query: PublicCatalogQuery,
  signingKey: string,
): CatalogPublicPage {
  if (signingKey.length < 32) throw new CatalogPublicQueryError();
  if (snapshot === null) {
    if (query.cursor !== undefined) throw new CatalogPublicQueryError();
    return {
      facets: emptyFacets,
      items: [],
      limit: query.limit,
      nextCursor: null,
      priceVersion: null,
      total: 0,
      version: null,
    };
  }
  const fingerprint = queryFingerprint(snapshot, query);
  const filteredItems = snapshot.items.filter((item) => matchesMaterial(item, query));
  const offset =
    query.cursor === undefined ? 0 : decodeCursor(query.cursor, fingerprint, signingKey);
  if (offset > filteredItems.length) throw new CatalogPublicQueryError();
  const pageItems = filteredItems.slice(offset, offset + query.limit);
  const nextOffset = offset + pageItems.length;
  return {
    facets: publicFacets(snapshot.items, query),
    items: pageItems.map((item) => publicMaterial(item, snapshot.catalogVersion.id)),
    limit: query.limit,
    nextCursor:
      nextOffset < filteredItems.length
        ? encodeCursor({ fingerprint, offset: nextOffset }, signingKey)
        : null,
    priceVersion: {
      activatedAt: snapshot.priceVersion.activatedAt,
      id: snapshot.priceVersion.id,
      versionNumber: snapshot.priceVersion.versionNumber,
    },
    total: filteredItems.length,
    version: {
      activatedAt: snapshot.catalogVersion.activatedAt,
      id: snapshot.catalogVersion.id,
      versionNumber: snapshot.catalogVersion.versionNumber,
    },
  };
}

export function catalogPublicSearchParameters(
  query: PublicCatalogQuery,
  overrides: Readonly<Record<string, string | undefined>> = {},
): URLSearchParams {
  const parameters = new URLSearchParams();
  if (query.q.length > 0) parameters.set('q', query.q);
  if (query.category !== undefined) parameters.set('category', query.category);
  if (query.system !== undefined) parameters.set('system', query.system);
  if (query.color !== undefined) parameters.set('color', query.color);
  if (query.availability !== undefined) parameters.set('availability', query.availability);
  if (query.blackout) parameters.set('blackout', 'true');
  if (query.zebra) parameters.set('zebra', 'true');
  if (query.limit !== 12) parameters.set('limit', String(query.limit));
  for (const [key, value] of Object.entries(overrides)) {
    if (!allowedQueryKeys.has(key)) throw new CatalogPublicQueryError();
    if (value === undefined || value.length === 0) parameters.delete(key);
    else parameters.set(key, value);
  }
  return parameters;
}

export function catalogPublicEtag(page: CatalogPublicPage): string {
  return `"${createHash('sha256').update(JSON.stringify(page)).digest('base64url')}"`;
}
