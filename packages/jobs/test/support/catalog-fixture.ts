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
} from '@project-name/catalog';

const capturedAt = '2026-08-02T12:00:00.000Z';
const categorySourceId = 'jobs-category-roller';
const materialSourceId = 'jobs-material-roller-1001';
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

export function createJobsCatalogFixture(): FixtureCatalogDataset {
  const category: SourceCategory = {
    family,
    identity: identity('CATEGORY', categorySourceId),
    materialSourceIds: [materialSourceId],
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
        contentTypeHint: 'image/jpeg',
        identity: identity('MEDIA', `${materialSourceId}:primary:1`, categorySourceId),
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
