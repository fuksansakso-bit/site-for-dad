import { CatalogSourceError } from '../../errors.js';
import { hashCanonicalSource } from '../../hash.js';
import {
  type CapturedSource,
  type CatalogSourceAdapter,
  type CatalogSourceHealth,
  type CatalogSourceVersion,
  type SourceCaptureMetadata,
  type SourceCategory,
  type SourceIdentity,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourceMediaFile,
  type SourceMediaReference,
  type SourcePrice,
  type SourceSystem,
} from '../../types.js';
import {
  type AmigoPilotCategoryConfig,
  type AmigoPilotSystemConfig,
  amigoAdapterVersions,
  amigoOrigin,
  amigoPilotCategories,
  amigoPilotSystems,
} from './config.js';
import {
  parseAmigoCategoryPage,
  parseAmigoSystemsPage,
  type ParsedAmigoCategoryPage,
  type ParsedAmigoMaterial,
  type ParsedAmigoSystem,
} from './parser.js';
import { validateAmigoUrl } from './security.js';
import { AmigoMediaTransport, type AmigoMediaTransportOptions } from './media-transport.js';
import {
  type AmigoHtmlPage,
  AmigoHttpTransport,
  type AmigoHttpTransportOptions,
} from './transport.js';

interface ParsedCategoryCapture {
  readonly page: AmigoHtmlPage;
  readonly parsed: ParsedAmigoCategoryPage;
}

interface ParsedSystemCapture {
  readonly page: AmigoHtmlPage;
  readonly systems: readonly ParsedAmigoSystem[];
}

function sourceIdentity(input: {
  readonly capturedAt: string;
  readonly entityType: SourceIdentity['sourceEntityType'];
  readonly facts: unknown;
  readonly sourceCategory?: string;
  readonly sourceId: string;
  readonly sourceSlug: string;
  readonly sourceUrl: string;
}): SourceIdentity {
  return {
    sourceCapturedAt: input.capturedAt,
    ...(input.sourceCategory === undefined ? {} : { sourceCategory: input.sourceCategory }),
    sourceEntityType: input.entityType,
    sourceHash: hashCanonicalSource(input.facts),
    sourceId: input.sourceId,
    sourceLastVerifiedAt: input.capturedAt,
    sourceSlug: input.sourceSlug,
    sourceType: 'AUTHORIZED_PUBLIC_WEB',
    sourceUrl: input.sourceUrl,
    supplierSlug: 'amigo',
  };
}

function captureMetadata(page: AmigoHtmlPage): SourceCaptureMetadata {
  return {
    capturedAt: page.capturedAt,
    contentHash: page.contentHash,
    httpStatus: page.httpStatus,
    mappingVersion: amigoAdapterVersions.mapping,
    parserVersion: amigoAdapterVersions.parser,
    sourceUrl: page.sourceUrl,
    sourceVersion: page.sourceVersion,
    status: 'CAPTURED',
  };
}

function captured<T>(page: AmigoHtmlPage, data: T): CapturedSource<T> {
  return { capture: captureMetadata(page), data };
}

function materialProvenanceUrl(config: AmigoPilotCategoryConfig, sourceId: string): string {
  return validateAmigoUrl(
    new URL(`${config.categoryPath}#material-${sourceId}`, amigoOrigin).href,
    'provenance',
  ).href;
}

function systemProvenanceUrl(config: AmigoPilotSystemConfig): string {
  return validateAmigoUrl(
    new URL(`${config.pagePath}#system-${config.sourceId}`, amigoOrigin).href,
    'provenance',
  ).href;
}

export type AmigoCatalogSourceAdapterOptions = AmigoHttpTransportOptions &
  AmigoMediaTransportOptions;

export class AmigoCatalogSourceAdapter implements CatalogSourceAdapter {
  readonly #categoryCache = new Map<string, Promise<ParsedCategoryCapture>>();
  readonly #pageCache = new Map<string, Promise<AmigoHtmlPage>>();
  readonly #systemCache = new Map<string, Promise<ParsedSystemCapture>>();
  readonly #transport: AmigoHttpTransport;
  readonly #mediaTransport: AmigoMediaTransport;

  constructor(options: AmigoCatalogSourceAdapterOptions = {}) {
    this.#transport = new AmigoHttpTransport(options);
    this.#mediaTransport = new AmigoMediaTransport(options);
  }

  async discoverCategories(): Promise<readonly CapturedSource<SourceCategory>[]> {
    const categories: CapturedSource<SourceCategory>[] = [];
    for (const config of amigoPilotCategories) {
      categories.push(await this.#fetchCategory(config));
    }
    return categories;
  }

  async fetchCategory(sourceId: string): Promise<CapturedSource<SourceCategory>> {
    return this.#fetchCategory(this.#requireCategory(sourceId));
  }

  async fetchMaterial(sourceId: string): Promise<CapturedSource<SourceMaterial>> {
    const config = this.#requireMaterialCategory(sourceId);
    const { page, parsed } = await this.#loadCategory(config);
    const material = this.#requireParsedMaterial(parsed, sourceId);
    const provenanceUrl = materialProvenanceUrl(config, sourceId);
    const facts = {
      article: material.article,
      categorySourceId: config.categorySourceId,
      color: material.color,
      family: config.family,
      isBlackout: material.isBlackout,
      isZebra: config.family.code === 'ZEBRA',
      materialName: material.materialName,
      properties: material.properties,
      systemSourceIds: config.systemSourceIds,
      variantName: material.variantName,
      ...(material.widthMm === undefined ? {} : { widthMm: material.widthMm }),
    };
    return captured(page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: page.capturedAt,
        entityType: 'MATERIAL_VARIANT',
        facts,
        sourceCategory: config.categorySourceId,
        sourceId,
        sourceSlug: `amigo-material-${sourceId}`,
        sourceUrl: provenanceUrl,
      }),
    });
  }

  async fetchMediaManifest(sourceId: string): Promise<CapturedSource<SourceMediaManifest>> {
    const config = this.#requireMaterialCategory(sourceId);
    const { page, parsed } = await this.#loadCategory(config);
    const material = this.#requireParsedMaterial(parsed, sourceId);
    const media: SourceMediaReference[] = material.media.map((item, index) => {
      const mediaSourceId = `${sourceId}:${item.role.toLowerCase()}:${index + 1}`;
      const facts = {
        materialSourceId: sourceId,
        role: item.role,
        sourceUrl: item.sourceUrl,
      };
      return {
        ...(item.contentTypeHint === undefined ? {} : { contentTypeHint: item.contentTypeHint }),
        identity: sourceIdentity({
          capturedAt: page.capturedAt,
          entityType: 'MEDIA',
          facts,
          sourceCategory: config.categorySourceId,
          sourceId: mediaSourceId,
          sourceSlug: `amigo-media-${sourceId}-${item.role.toLowerCase()}-${index + 1}`,
          sourceUrl: item.sourceUrl,
        }),
        role: item.role,
      };
    });
    const provenanceUrl = materialProvenanceUrl(config, sourceId);
    const facts = { materialSourceId: sourceId, media };
    return captured(page, {
      identity: sourceIdentity({
        capturedAt: page.capturedAt,
        entityType: 'MEDIA',
        facts,
        sourceCategory: config.categorySourceId,
        sourceId,
        sourceSlug: `amigo-media-manifest-${sourceId}`,
        sourceUrl: provenanceUrl,
      }),
      materialSourceId: sourceId,
      media,
    });
  }

  fetchMedia(sourceUrl: string): Promise<SourceMediaFile> {
    return this.#mediaTransport.fetchMedia(sourceUrl);
  }

  async fetchPrice(sourceId: string): Promise<CapturedSource<SourcePrice>> {
    const config = this.#requireMaterialCategory(sourceId);
    const { page, parsed } = await this.#loadCategory(config);
    const material = this.#requireParsedMaterial(parsed, sourceId);
    const provenanceUrl = materialProvenanceUrl(config, sourceId);
    const sourceContext: Record<string, string> = {
      categoryPath: config.categoryPath,
      priceLabel: material.priceLabel ?? 'PRICE_ON_REQUEST',
      ...(material.opaquePriceTableToken === undefined
        ? {}
        : { opaqueTableToken: material.opaquePriceTableToken }),
    };
    const facts = {
      amountMinor: material.priceMinor,
      currency: 'RUB',
      kind: 'FROM',
      sourceContext,
      sourcePriceCategory: null,
      status: material.priceMinor === null ? 'PRICE_ON_REQUEST' : 'AVAILABLE',
    } as const;
    return captured(page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: page.capturedAt,
        entityType: 'PRICE',
        facts,
        sourceCategory: config.categorySourceId,
        sourceId,
        sourceSlug: `amigo-price-${sourceId}`,
        sourceUrl: provenanceUrl,
      }),
    });
  }

  async fetchProduct(sourceId: string): Promise<CapturedSource<SourceSystem>> {
    const config = this.#requireSystem(sourceId);
    const { page, systems } = await this.#loadSystems(config.pagePath);
    const parsed = systems.find((system) => system.sourceId === sourceId);
    if (parsed === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO pilot system mapping is incomplete.',
        { safeDetails: { sourceId } },
      );
    }
    const facts = {
      categorySourceId: config.categorySourceId,
      ...(parsed.description === undefined ? {} : { description: parsed.description }),
      family: config.family,
      ...(parsed.mediaSourceUrl === undefined ? {} : { mediaSourceUrl: parsed.mediaSourceUrl }),
      name: parsed.name,
    };
    return captured(page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: page.capturedAt,
        entityType: 'SYSTEM',
        facts,
        sourceCategory: config.categorySourceId,
        sourceId,
        sourceSlug: `amigo-system-${sourceId}`,
        sourceUrl: systemProvenanceUrl(config),
      }),
    });
  }

  async getSourceVersion(): Promise<CatalogSourceVersion> {
    const pagePaths = [
      ...new Set([
        ...amigoPilotCategories.map((category) => category.categoryPath),
        ...amigoPilotSystems.map((system) => system.pagePath),
      ]),
    ].sort();
    const pages: AmigoHtmlPage[] = [];
    for (const path of pagePaths) {
      pages.push(await this.#loadPage(path));
    }
    return {
      capturedAt:
        pages
          .map((page) => page.capturedAt)
          .sort()
          .at(-1) ?? new Date().toISOString(),
      sourceType: 'AUTHORIZED_PUBLIC_WEB',
      version: `sha256:${hashCanonicalSource(
        pages.map((page) => ({ contentHash: page.contentHash, sourceUrl: page.sourceUrl })),
      )}`,
    };
  }

  async healthCheck(): Promise<CatalogSourceHealth> {
    const startedAt = Date.now();
    try {
      await this.#loadPage(amigoPilotCategories[0]?.categoryPath ?? '/');
      return {
        checkedAt: new Date().toISOString(),
        latencyMs: Math.max(0, Date.now() - startedAt),
        status: 'healthy',
      };
    } catch {
      return {
        checkedAt: new Date().toISOString(),
        latencyMs: Math.max(0, Date.now() - startedAt),
        status: 'unavailable',
      };
    }
  }

  async #fetchCategory(config: AmigoPilotCategoryConfig): Promise<CapturedSource<SourceCategory>> {
    const { page } = await this.#loadCategory(config);
    const facts = {
      family: config.family,
      materialSourceIds: config.pilotMaterialSourceIds,
      name: config.categoryName,
      systemSourceIds: config.systemSourceIds,
    };
    return captured(page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: page.capturedAt,
        entityType: 'CATEGORY',
        facts,
        sourceCategory: config.categorySourceId,
        sourceId: config.categorySourceId,
        sourceSlug: `amigo-category-${config.categorySourceId}`,
        sourceUrl: validateAmigoUrl(new URL(config.categoryPath, amigoOrigin).href, 'page').href,
      }),
    });
  }

  #loadCategory(config: AmigoPilotCategoryConfig): Promise<ParsedCategoryCapture> {
    let operation = this.#categoryCache.get(config.categorySourceId);
    if (operation === undefined) {
      operation = this.#loadPage(config.categoryPath).then((page) => ({
        page,
        parsed: parseAmigoCategoryPage(page.html, config),
      }));
      this.#categoryCache.set(config.categorySourceId, operation);
    }
    return operation;
  }

  #loadPage(path: string): Promise<AmigoHtmlPage> {
    const sourceUrl = validateAmigoUrl(new URL(path, amigoOrigin).href, 'page').href;
    let operation = this.#pageCache.get(sourceUrl);
    if (operation === undefined) {
      operation = this.#transport.fetchPage(sourceUrl);
      this.#pageCache.set(sourceUrl, operation);
    }
    return operation;
  }

  #loadSystems(path: string): Promise<ParsedSystemCapture> {
    let operation = this.#systemCache.get(path);
    if (operation === undefined) {
      const configs = amigoPilotSystems.filter((system) => system.pagePath === path);
      operation = this.#loadPage(path).then((page) => ({
        page,
        systems: parseAmigoSystemsPage(page.html, configs),
      }));
      this.#systemCache.set(path, operation);
    }
    return operation;
  }

  #requireCategory(sourceId: string): AmigoPilotCategoryConfig {
    const config = amigoPilotCategories.find((category) => category.categorySourceId === sourceId);
    if (config === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO category was not found.', {
        safeDetails: { sourceId },
      });
    }
    return config;
  }

  #requireMaterialCategory(sourceId: string): AmigoPilotCategoryConfig {
    const config = amigoPilotCategories.find((category) =>
      category.pilotMaterialSourceIds.includes(sourceId),
    );
    if (config === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO material was not found.', {
        safeDetails: { sourceId },
      });
    }
    return config;
  }

  #requireParsedMaterial(parsed: ParsedAmigoCategoryPage, sourceId: string): ParsedAmigoMaterial {
    const material = parsed.materials.find((candidate) => candidate.sourceId === sourceId);
    if (material === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO material was not found.', {
        safeDetails: { sourceId },
      });
    }
    return material;
  }

  #requireSystem(sourceId: string): AmigoPilotSystemConfig {
    const config = amigoPilotSystems.find((system) => system.sourceId === sourceId);
    if (config === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO system was not found.', {
        safeDetails: { sourceId },
      });
    }
    return config;
  }
}
