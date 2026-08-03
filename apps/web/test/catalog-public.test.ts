import { createHash } from 'node:crypto';

import type { CatalogPublicSnapshot } from '@project-name/catalog';
import {
  publicCatalogMaterialResponseSchema,
  publicCatalogResponseSchema,
} from '@project-name/contracts/catalog';
import { StorageError } from '@project-name/storage';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { createPublicCatalogMaterialsHandler } from '../app/api/v1/catalog/materials/route';
import { createPublicCatalogMaterialHandler } from '../app/api/v1/catalog/materials/[id]/route';
import { createPublicCatalogMediaHandler } from '../app/api/v1/catalog/media/[id]/route';
import {
  CatalogPublicQueryError,
  parseCatalogPublicQuery,
  selectCatalogPublicMaterial,
  selectCatalogPublicPage,
} from '../lib/catalog-public';

const versionId = '00000000-0000-4000-8000-000000000501';
const priceVersionId = '00000000-0000-4000-8000-000000000502';
const assetId = '00000000-0000-4000-8000-000000000503';
const signingKey = 'catalog-public-test-signing-key-000000000000000000000000';
const body = new TextEncoder().encode('approved-image-bytes');
const bodyChecksum = createHash('sha256').update(body).digest('hex');

const snapshot: CatalogPublicSnapshot = {
  catalogVersion: {
    activatedAt: '2026-08-03T09:00:00.000Z',
    differenceChecksum: 'b'.repeat(64),
    id: versionId,
    versionNumber: 3,
  },
  categories: [
    {
      depth: 0,
      id: '00000000-0000-4000-8000-000000000504',
      name: 'Рулонные жалюзи',
      parentId: null,
      path: [
        {
          id: '00000000-0000-4000-8000-000000000504',
          name: 'Рулонные жалюзи',
          slug: 'rulonnye-zhalyuzi',
        },
      ],
      slug: 'rulonnye-zhalyuzi',
      sortOrder: 1,
    },
    {
      depth: 1,
      id: '00000000-0000-4000-8000-000000000507',
      name: 'Зебра',
      parentId: '00000000-0000-4000-8000-000000000504',
      path: [
        {
          id: '00000000-0000-4000-8000-000000000504',
          name: 'Рулонные жалюзи',
          slug: 'rulonnye-zhalyuzi',
        },
        {
          id: '00000000-0000-4000-8000-000000000507',
          name: 'Зебра',
          slug: 'zebra',
        },
      ],
      slug: 'zebra',
      sortOrder: 2,
    },
  ],
  items: [
    {
      article: '49129',
      availability: 'IN_STOCK',
      category: {
        depth: 0,
        id: '00000000-0000-4000-8000-000000000504',
        name: 'Рулонные жалюзи',
        parentId: null,
        path: [
          {
            id: '00000000-0000-4000-8000-000000000504',
            name: 'Рулонные жалюзи',
            slug: 'rulonnye-zhalyuzi',
          },
        ],
        slug: 'rulonnye-zhalyuzi',
        sortOrder: 1,
      },
      color: { hex: '#EEE8DA', name: 'Молочный', slug: 'molochnyy' },
      description: null,
      id: '00000000-0000-4000-8000-000000000505',
      isBlackout: true,
      isZebra: false,
      localOrder: 1,
      materialName: 'Альфа Blackout',
      media: {
        byteSize: body.byteLength,
        checksumSha256: bodyChecksum,
        contentType: 'image/jpeg',
        height: 1_200,
        id: assetId,
        objectKey: 'catalog/private/approved-image.jpg',
        storageZone: 'private',
        width: 1_600,
      },
      name: 'Альфа Blackout молочный',
      price: {
        amountMinor: 199_900,
        currency: 'RUB',
        kind: 'FROM',
        origin: 'SOURCE_VERSION',
        status: 'AVAILABLE',
      },
      slug: 'alfa-blackout-molochnyy',
      system: {
        categoryId: '00000000-0000-4000-8000-000000000504',
        id: '00000000-0000-4000-8000-000000000506',
        name: 'Рулонная система',
        slug: 'rulonnaya-sistema',
        sortOrder: 1,
      },
      widthMm: 2_000,
    },
    {
      article: '49850',
      availability: 'OUT_OF_STOCK',
      category: {
        depth: 1,
        id: '00000000-0000-4000-8000-000000000507',
        name: 'Зебра',
        parentId: '00000000-0000-4000-8000-000000000504',
        path: [
          {
            id: '00000000-0000-4000-8000-000000000504',
            name: 'Рулонные жалюзи',
            slug: 'rulonnye-zhalyuzi',
          },
          {
            id: '00000000-0000-4000-8000-000000000507',
            name: 'Зебра',
            slug: 'zebra',
          },
        ],
        slug: 'zebra',
        sortOrder: 2,
      },
      color: { hex: '#62564A', name: 'Коричневый', slug: 'korichnevyy' },
      description: null,
      id: '00000000-0000-4000-8000-000000000508',
      isBlackout: true,
      isZebra: true,
      localOrder: 2,
      materialName: 'Саванна',
      media: {
        byteSize: body.byteLength,
        checksumSha256: 'c'.repeat(64),
        contentType: 'image/jpeg',
        height: 1_200,
        id: '00000000-0000-4000-8000-000000000509',
        objectKey: 'catalog/private/second-image.jpg',
        storageZone: 'private',
        width: 1_600,
      },
      name: 'Саванна коричневый',
      price: {
        amountMinor: null,
        currency: 'RUB',
        kind: 'FROM',
        origin: 'SOURCE_VERSION',
        status: 'PRICE_ON_REQUEST',
      },
      slug: 'savanna-korichnevyy',
      system: {
        categoryId: '00000000-0000-4000-8000-000000000507',
        id: '00000000-0000-4000-8000-000000000510',
        name: 'Зебра система',
        slug: 'zebra-sistema',
        sortOrder: 2,
      },
      widthMm: null,
    },
  ],
  priceVersion: {
    activatedAt: '2026-08-03T09:00:00.000Z',
    differenceChecksum: 'd'.repeat(64),
    id: priceVersionId,
    versionNumber: 3,
  },
  systems: [
    {
      categoryId: '00000000-0000-4000-8000-000000000504',
      id: '00000000-0000-4000-8000-000000000506',
      name: 'Рулонная система',
      slug: 'rulonnaya-sistema',
      sortOrder: 1,
    },
    {
      categoryId: '00000000-0000-4000-8000-000000000507',
      id: '00000000-0000-4000-8000-000000000510',
      name: 'Зебра система',
      slug: 'zebra-sistema',
      sortOrder: 2,
    },
  ],
};

describe('public catalog query projection', () => {
  it('treats empty optional HTML select values as absent filters', () => {
    expect(
      parseCatalogPublicQuery(
        new URLSearchParams({ availability: '', category: '', color: '', q: '49129', system: '' }),
      ),
    ).toMatchObject({ q: '49129' });
  });

  it('filters only verified facets and binds pagination cursor to version and query', () => {
    const query = parseCatalogPublicQuery(new URLSearchParams({ limit: '1' }));
    const first = selectCatalogPublicPage(snapshot, query, signingKey);

    expect(first.total).toBe(2);
    expect(first.items).toHaveLength(1);
    expect(first.facets.categories).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    expect(JSON.stringify(first)).not.toMatch(/objectKey|catalog\/private/);

    const nextQuery = parseCatalogPublicQuery(
      new URLSearchParams({ cursor: first.nextCursor ?? '', limit: '1' }),
    );
    expect(selectCatalogPublicPage(snapshot, nextQuery, signingKey).items[0]?.article).toBe(
      '49850',
    );
    expect(() =>
      selectCatalogPublicPage(snapshot, { ...nextQuery, q: 'другой запрос' }, signingKey),
    ).toThrow(CatalogPublicQueryError);
  });

  it('combines search, availability and feature filters with AND semantics', () => {
    const query = parseCatalogPublicQuery(
      new URLSearchParams({ availability: 'OUT_OF_STOCK', blackout: 'true', q: 'саванна' }),
    );
    const page = selectCatalogPublicPage(snapshot, query, signingKey);

    expect(page.items.map((item) => item.article)).toEqual(['49850']);
    expect(page.facets.availability).toContainEqual({
      count: 1,
      label: 'Временно нет в наличии',
      value: 'OUT_OF_STOCK',
    });
  });

  it('includes descendant materials in a parent category and keeps sort cursor-bound', () => {
    const query = parseCatalogPublicQuery(
      new URLSearchParams({ category: 'rulonnye-zhalyuzi', limit: '1', sort: 'name-asc' }),
    );
    const page = selectCatalogPublicPage(snapshot, query, signingKey);

    expect(page.total).toBe(2);
    expect(page.facets.categories).toEqual([
      expect.objectContaining({ count: 2, depth: 0, value: 'rulonnye-zhalyuzi' }),
      expect.objectContaining({ count: 1, depth: 1, value: 'zebra' }),
    ]);
    expect(page.items[0]?.article).toBe('49129');
    expect(() =>
      selectCatalogPublicPage(
        snapshot,
        { ...query, cursor: page.nextCursor ?? undefined, sort: 'price-desc' },
        signingKey,
      ),
    ).toThrow(CatalogPublicQueryError);
  });

  it('selects one shareable active material without exposing its object locator', () => {
    const selected = selectCatalogPublicMaterial(snapshot, 'alfa-blackout-molochnyy');

    expect(selected?.item.category.path.map((segment) => segment.slug)).toEqual([
      'rulonnye-zhalyuzi',
    ]);
    expect(JSON.stringify(selected)).not.toMatch(/objectKey|catalog\/private/);
  });
});

describe('public catalog HTTP boundaries', () => {
  it('returns a version-pinned safe response and rejects unknown query fields', async () => {
    const handler = createPublicCatalogMaterialsHandler(() => ({
      read: { getPublicCatalog: async () => snapshot },
      signingKey,
    }));
    const response = await handler(
      new NextRequest('http://localhost/api/v1/catalog/materials?limit=1'),
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-catalog-version')).toBe(versionId);
    expect(publicCatalogResponseSchema.parse(JSON.parse(text)).items).toHaveLength(1);
    expect(text).not.toMatch(/objectKey|catalog\/private|sourceHash/);

    const invalid = await handler(
      new NextRequest('http://localhost/api/v1/catalog/materials?unexpected=true'),
    );
    expect(invalid.status).toBe(400);
  });

  it('returns one active material by stable slug and neutral not-found for invalid input', async () => {
    const handler = createPublicCatalogMaterialHandler(() => ({
      read: { getPublicCatalog: async () => snapshot },
    }));
    const response = await handler(
      new NextRequest('http://localhost/api/v1/catalog/materials/alfa-blackout-molochnyy'),
      'alfa-blackout-molochnyy',
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('x-catalog-version')).toBe(versionId);
    expect(publicCatalogMaterialResponseSchema.parse(JSON.parse(text)).item.article).toBe('49129');
    expect(text).not.toMatch(/objectKey|catalog\/private|sourceHash/);

    const missing = await handler(
      new NextRequest('http://localhost/api/v1/catalog/materials/not_valid'),
      'not_valid',
    );
    expect(missing.status).toBe(404);
  });

  it('streams only approved active-version media and verifies round-trip metadata', async () => {
    const get = vi.fn(async () => ({
      body,
      checksumSha256: bodyChecksum,
      contentLength: body.byteLength,
      contentType: 'image/jpeg',
      locator: { key: 'catalog/private/approved-image.jpg', zone: 'private' as const },
      schemaVersion: 1 as const,
      source: 'AMIGO_CATALOG_PILOT' as const,
      zone: 'private' as const,
    }));
    const handler = createPublicCatalogMediaHandler(() => ({
      read: { getPublicCatalog: async () => snapshot },
      storage: { get },
    }));
    const response = await handler(
      new NextRequest(`http://localhost/api/v1/catalog/media/${assetId}?v=${versionId}`),
      assetId,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    expect(get).toHaveBeenCalledWith({
      key: 'catalog/private/approved-image.jpg',
      zone: 'private',
    });

    const staleVersion = await handler(
      new NextRequest(
        `http://localhost/api/v1/catalog/media/${assetId}?v=00000000-0000-4000-8000-000000000599`,
      ),
      assetId,
    );
    expect(staleVersion.status).toBe(404);

    const corruptedHandler = createPublicCatalogMediaHandler(() => ({
      read: { getPublicCatalog: async () => snapshot },
      storage: {
        get: async () => ({
          body: new TextEncoder().encode('approved-image-byteX'),
          checksumSha256: bodyChecksum,
          contentLength: body.byteLength,
          contentType: 'image/jpeg',
          locator: { key: 'catalog/private/approved-image.jpg', zone: 'private' as const },
          schemaVersion: 1 as const,
          source: 'AMIGO_CATALOG_PILOT' as const,
          zone: 'private' as const,
        }),
      },
    }));
    const corrupted = await corruptedHandler(
      new NextRequest(`http://localhost/api/v1/catalog/media/${assetId}?v=${versionId}`),
      assetId,
    );
    expect(corrupted.status).toBe(503);

    const unavailableHandler = createPublicCatalogMediaHandler(() => ({
      read: { getPublicCatalog: async () => snapshot },
      storage: {
        get: async () => {
          throw new StorageError('STORAGE_DEPENDENCY_UNAVAILABLE', 'storage unavailable');
        },
      },
    }));
    const unavailable = await unavailableHandler(
      new NextRequest(`http://localhost/api/v1/catalog/media/${assetId}?v=${versionId}`),
      assetId,
    );
    expect(unavailable.status).toBe(503);
    expect(await unavailable.text()).not.toMatch(/storage unavailable|objectKey|catalog\/private/);
  });
});
