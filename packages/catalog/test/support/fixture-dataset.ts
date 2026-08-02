import {
  hashCanonicalSource,
  type CapturedSource,
  type CatalogSourceVersion,
  type FixtureCatalogDataset,
  type SourceCaptureMetadata,
  type SourceCategory,
  type SourceIdentity,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourcePrice,
  type SourceSystem,
} from '../../src/index.js';

const capturedAt = '2026-08-02T12:00:00.000Z';

function identity(
  sourceEntityType: SourceIdentity['sourceEntityType'],
  sourceId: string,
): SourceIdentity {
  return {
    sourceCapturedAt: capturedAt,
    sourceEntityType,
    sourceHash: hashCanonicalSource({ sourceEntityType, sourceId }),
    sourceId,
    sourceLastVerifiedAt: capturedAt,
    sourceSlug: `fixture-${sourceEntityType.toLowerCase()}-${sourceId}`,
    sourceType: 'FIXTURE',
    sourceUrl: `https://fixture.invalid/${sourceEntityType.toLowerCase()}/${sourceId}`,
    supplierSlug: 'fixture',
  };
}

const capture: SourceCaptureMetadata = {
  capturedAt,
  contentHash: hashCanonicalSource({ fixture: true }),
  httpStatus: 200,
  mappingVersion: 'fixture/1',
  parserVersion: 'fixture/1',
  sourceUrl: 'https://fixture.invalid/catalog',
  sourceVersion: 'fixture-v1',
  status: 'CAPTURED',
};

function captured<T>(data: T): CapturedSource<T> {
  return { capture, data };
}

const family = {
  code: 'ROLLER',
  name: 'Рулонные шторы',
  slug: 'roller',
  sourceId: 'family-1',
} as const;

const sourceVersion: CatalogSourceVersion = {
  capturedAt,
  sourceType: 'FIXTURE',
  version: 'fixture-v1',
};

export function createFixtureDataset(): FixtureCatalogDataset {
  const category: SourceCategory = {
    family,
    identity: identity('CATEGORY', 'category-1'),
    materialSourceIds: ['material-1'],
    name: 'Ткани',
    systemSourceIds: ['system-1'],
  };
  const system: SourceSystem = {
    categorySourceId: 'category-1',
    family,
    identity: identity('SYSTEM', 'system-1'),
    name: 'MINI',
  };
  const material: SourceMaterial = {
    article: '1001',
    categorySourceId: 'category-1',
    color: 'серый',
    family,
    identity: identity('MATERIAL_VARIANT', 'material-1'),
    isBlackout: false,
    isZebra: false,
    materialName: 'Тестовая ткань',
    properties: [],
    systemSourceIds: ['system-1'],
    variantName: 'Тестовая ткань — серый',
  };
  const price: SourcePrice = {
    amountMinor: 150_000,
    currency: 'RUB',
    identity: identity('PRICE', 'material-1'),
    kind: 'FROM',
    sourceContext: { label: 'от 1 500 ₽' },
    sourcePriceCategory: null,
    status: 'AVAILABLE',
  };
  const mediaManifest: SourceMediaManifest = {
    identity: identity('MEDIA', 'material-1'),
    materialSourceId: 'material-1',
    media: [
      {
        contentTypeHint: 'image/jpeg',
        identity: identity('MEDIA', 'material-1:primary:1'),
        role: 'PRIMARY',
      },
    ],
  };

  return {
    categories: [captured(category)],
    materials: [captured(material)],
    mediaManifests: [captured(mediaManifest)],
    prices: [captured(price)],
    sourceVersion,
    systems: [captured(system)],
  };
}
