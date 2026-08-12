import { CatalogSourceError } from '../errors.js';
import {
  type CapturedSource,
  type CatalogSourceAdapter,
  type CatalogSourceHealth,
  type CatalogSourceVersion,
  type FixtureCatalogDataset,
  type SourceCatalogDiscovery,
  type SourceCategory,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourceMediaFile,
  type SourceModel,
  type SourcePrice,
  type SourceSystem,
} from '../types.js';

function buildUniqueMap<T extends { readonly identity: { readonly sourceId: string } }>(
  records: readonly CapturedSource<T>[],
  recordType: string,
): ReadonlyMap<string, CapturedSource<T>> {
  const result = new Map<string, CapturedSource<T>>();
  for (const record of records) {
    const sourceId = record.data.identity.sourceId;
    if (result.has(sourceId)) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'Fixture catalog contains a duplicate source identity.',
        { safeDetails: { recordType, sourceId } },
      );
    }
    result.set(sourceId, structuredClone(record));
  }
  return result;
}

function requireRecord<T>(
  records: ReadonlyMap<string, CapturedSource<T>>,
  sourceId: string,
  recordType: string,
): CapturedSource<T> {
  const record = records.get(sourceId);
  if (record === undefined) {
    throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'Catalog source identity was not found.', {
      safeDetails: { recordType, sourceId },
    });
  }
  return structuredClone(record);
}

export class FixtureCatalogSourceAdapter implements CatalogSourceAdapter {
  readonly #categories: ReadonlyMap<string, CapturedSource<SourceCategory>>;
  readonly #dataset: FixtureCatalogDataset;
  readonly #materials: ReadonlyMap<string, CapturedSource<SourceMaterial>>;
  readonly #mediaFiles: ReadonlyMap<string, SourceMediaFile>;
  readonly #mediaManifests: ReadonlyMap<string, CapturedSource<SourceMediaManifest>>;
  readonly #models: ReadonlyMap<string, CapturedSource<SourceModel>>;
  readonly #prices: ReadonlyMap<string, CapturedSource<SourcePrice>>;
  readonly #systems: ReadonlyMap<string, CapturedSource<SourceSystem>>;

  constructor(dataset: FixtureCatalogDataset) {
    this.#dataset = structuredClone(dataset);
    this.#categories = buildUniqueMap(dataset.categories, 'category');
    this.#systems = buildUniqueMap(dataset.systems, 'system');
    this.#materials = buildUniqueMap(dataset.materials, 'material');
    this.#models = buildUniqueMap(dataset.models ?? [], 'model');
    this.#prices = buildUniqueMap(dataset.prices, 'price');
    this.#mediaManifests = buildUniqueMap(dataset.mediaManifests, 'media-manifest');
    this.#mediaFiles = new Map(
      dataset.mediaFiles.map((file) => [file.sourceUrl, structuredClone(file)]),
    );
    if (this.#mediaFiles.size !== dataset.mediaFiles.length) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'Fixture catalog contains a duplicate media URL.',
      );
    }
  }

  async discoverCategories(): Promise<readonly CapturedSource<SourceCategory>[]> {
    return [...this.#categories.values()].map((record) => structuredClone(record));
  }

  async discoverCatalog(): Promise<SourceCatalogDiscovery> {
    const categories = await this.discoverCategories();
    return {
      categories,
      complete: true,
      diagnostics: [],
      materialSourceIds: [...this.#materials.keys()].sort(),
      modelSourceIds: [...this.#models.keys()].sort(),
      pages: [],
      sourceVersion: await this.getSourceVersion(),
      systemSourceIds: [...this.#systems.keys()].sort(),
    };
  }

  async fetchCategory(sourceId: string): Promise<CapturedSource<SourceCategory>> {
    return requireRecord(this.#categories, sourceId, 'category');
  }

  async fetchMaterial(sourceId: string): Promise<CapturedSource<SourceMaterial>> {
    return requireRecord(this.#materials, sourceId, 'material');
  }

  async fetchMediaManifest(sourceId: string): Promise<CapturedSource<SourceMediaManifest>> {
    return requireRecord(this.#mediaManifests, sourceId, 'media-manifest');
  }

  async fetchMedia(sourceUrl: string): Promise<SourceMediaFile> {
    const file = this.#mediaFiles.get(sourceUrl);
    if (file === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'Catalog media URL was not found.', {
        safeDetails: { recordType: 'media-file' },
      });
    }
    return structuredClone(file);
  }

  async fetchModel(sourceId: string): Promise<CapturedSource<SourceModel>> {
    return requireRecord(this.#models, sourceId, 'model');
  }

  async fetchPrice(sourceId: string): Promise<CapturedSource<SourcePrice>> {
    return requireRecord(this.#prices, sourceId, 'price');
  }

  async fetchProduct(sourceId: string): Promise<CapturedSource<SourceSystem>> {
    return requireRecord(this.#systems, sourceId, 'system');
  }

  async getSourceVersion(): Promise<CatalogSourceVersion> {
    return structuredClone(this.#dataset.sourceVersion);
  }

  async healthCheck(): Promise<CatalogSourceHealth> {
    return {
      checkedAt: new Date().toISOString(),
      latencyMs: 0,
      status: this.#dataset.healthy === false ? 'unavailable' : 'healthy',
    };
  }
}
