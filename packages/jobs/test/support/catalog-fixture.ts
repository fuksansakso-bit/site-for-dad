import {
  hashCanonicalSource,
  sha256,
  type CapturedSource,
  type CatalogSourceVersion,
  type FixtureCatalogDataset,
  type SourceCaptureMetadata,
  type SourceCategory,
  type SourceIdentity,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourceMediaFile,
  type SourceModel,
  type SourcePrice,
  type SourceSystem,
} from '@project-name/catalog';

import type {
  CatalogMediaStorageMetadata,
  CatalogMediaStoragePort,
} from '../../src/catalog/media.js';

const capturedAt = '2026-08-02T12:00:00.000Z';
const categorySourceId = 'jobs-category-roller';
const materialSourceId = 'jobs-material-roller-1001';
const modelSourceId = 'jobs-model-roller-ready-1001';
const systemSourceId = 'jobs-system-mini';

function identity(
  sourceEntityType: SourceIdentity['sourceEntityType'],
  sourceId: string,
  sourceCategory?: string,
): SourceIdentity {
  return {
    sourceCapturedAt: capturedAt,
    ...(sourceCategory === undefined ? {} : { sourceCategory }),
    sourceEntityType,
    sourceHash: hashCanonicalSource({ sourceCategory, sourceEntityType, sourceId }),
    sourceId,
    sourceLastVerifiedAt: capturedAt,
    sourceSlug: `jobs-${sourceEntityType.toLowerCase()}-${sourceId}`,
    sourceType: 'FIXTURE',
    sourceUrl: `https://fixture.invalid/${sourceEntityType.toLowerCase()}/${sourceId}`,
    supplierSlug: 'fixture',
  };
}

const capture: SourceCaptureMetadata = {
  capturedAt,
  contentHash: hashCanonicalSource({ fixture: 'jobs-catalog-pipeline-v1' }),
  httpStatus: 200,
  mappingVersion: 'jobs-fixture/1',
  parserVersion: 'jobs-fixture/1',
  sourceUrl: 'https://fixture.invalid/jobs-catalog',
  sourceVersion: 'jobs-fixture-v1',
  status: 'CAPTURED',
};

function captured<T>(data: T): CapturedSource<T> {
  return { capture, data };
}

const family = {
  code: 'ROLLER',
  name: 'Рулонные шторы',
  slug: 'jobs-roller',
  sourceId: 'jobs-family-roller',
} as const;

const sourceVersion: CatalogSourceVersion = {
  capturedAt,
  sourceType: 'FIXTURE',
  version: 'jobs-fixture-v1',
};

const imageBody = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);

export function createJobsCatalogFixture(): FixtureCatalogDataset {
  const category: SourceCategory = {
    family,
    identity: identity('CATEGORY', categorySourceId),
    materialSourceIds: [materialSourceId],
    modelSourceIds: [modelSourceId],
    name: 'Рулонные ткани',
    systemSourceIds: [systemSourceId],
  };
  const system: SourceSystem = {
    categorySourceId,
    family,
    identity: identity('SYSTEM', systemSourceId, categorySourceId),
    name: 'MINI',
  };
  const material: SourceMaterial = {
    article: 'AMIGO-JOBS-1001',
    categorySourceId,
    color: 'Серый',
    family,
    identity: identity('MATERIAL_VARIANT', materialSourceId, categorySourceId),
    isBlackout: false,
    isZebra: false,
    materialName: 'Тестовая ткань',
    properties: [{ key: 'texture', name: 'Фактура', value: 'гладкая' }],
    systemSourceIds: [systemSourceId],
    variantName: 'Тестовая ткань — серый',
  };
  const model: SourceModel = {
    categorySourceId,
    family,
    identity: identity('MODEL', modelSourceId, categorySourceId),
    mediaSourceUrls: [],
    name: 'Р“РѕС‚РѕРІР°СЏ СЂСѓР»РѕРЅРЅР°СЏ С€С‚РѕСЂР°',
    sourceAvailability: 'UNKNOWN',
    systemSourceId,
  };
  const price: SourcePrice = {
    amountMinor: 150_000,
    currency: 'RUB',
    identity: identity('PRICE', materialSourceId, categorySourceId),
    kind: 'FROM',
    sourceContext: { label: 'от 1 500 ₽' },
    sourcePriceCategory: '1',
    status: 'AVAILABLE',
  };
  const mediaManifest: SourceMediaManifest = {
    identity: identity('MEDIA', materialSourceId, categorySourceId),
    materialSourceId,
    media: [
      {
        contentTypeHint: 'image/png',
        identity: identity('MEDIA', `${materialSourceId}:primary:1`, categorySourceId),
        role: 'PRIMARY',
      },
    ],
  };
  const mediaFile: SourceMediaFile = {
    body: imageBody,
    capturedAt,
    contentHash: sha256(imageBody),
    contentType: 'image/png',
    httpStatus: 200,
    originalFilename: 'jobs-material-roller-1001.png',
    sourceUrl: mediaManifest.media[0]!.identity.sourceUrl,
  };

  return {
    categories: [captured(category)],
    materials: [captured(material)],
    mediaManifests: [captured(mediaManifest)],
    mediaFiles: [mediaFile],
    models: [captured(model)],
    prices: [captured(price)],
    sourceVersion,
    systems: [captured(system)],
  };
}

class FixtureStorageError extends Error {
  readonly code: 'STORAGE_CONFLICT' | 'STORAGE_NOT_FOUND';

  constructor(code: 'STORAGE_CONFLICT' | 'STORAGE_NOT_FOUND') {
    super(code);
    this.name = 'StorageError';
    this.code = code;
  }
}

export function createMemoryCatalogStorage(): CatalogMediaStoragePort {
  const objects = new Map<string, CatalogMediaStorageMetadata>();
  const locatorKey = (locator: { readonly key: string; readonly zone: 'private' }) =>
    `${locator.zone}:${locator.key}`;
  const requireObject = (locator: {
    readonly key: string;
    readonly zone: 'private';
  }): CatalogMediaStorageMetadata => {
    const stored = objects.get(locatorKey(locator));
    if (stored === undefined) {
      throw new FixtureStorageError('STORAGE_NOT_FOUND');
    }
    return structuredClone(stored);
  };

  return {
    async head(locator) {
      return requireObject(locator);
    },
    async put(input): Promise<CatalogMediaStorageMetadata> {
      const key = locatorKey(input.locator);
      if (objects.has(key)) {
        throw new FixtureStorageError('STORAGE_CONFLICT');
      }
      const metadata: CatalogMediaStorageMetadata = {
        checksumSha256: sha256(input.body),
        contentLength: input.body.byteLength,
        contentType: input.contentType,
        source: input.source,
        zone: input.locator.zone,
      };
      objects.set(key, metadata);
      return metadata;
    },
  };
}
