import { CatalogSourceError } from '../../errors.js';
import { hashCanonicalSource } from '../../hash.js';
import {
  type CapturedSource,
  type CatalogSourceAdapter,
  type CatalogSourceHealth,
  type CatalogSourceVersion,
  type SourceCatalogDiscovery,
  type SourceCaptureMetadata,
  type SourceCategory,
  type SourceDiscoveryDiagnostic,
  type SourceDiscoveryPage,
  type SourceFamilyReference,
  type SourceIdentity,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourceMediaFile,
  type SourceMediaReference,
  type SourceModel,
  type SourcePrice,
  type SourceSystem,
} from '../../types.js';
import {
  type AmigoCatalogScope,
  type AmigoPilotCategoryConfig,
  type AmigoPilotSystemConfig,
  amigoAdapterVersions,
  amigoAllowedPagePaths,
  amigoCatalogIndexPath,
  amigoOrigin,
  amigoPilotCategories,
  amigoPilotSystems,
} from './config.js';
import {
  parseAmigoCatalogIndexPage,
  parseAmigoCategoryDiscoveryPage,
  parseAmigoCategoryPage,
  parseAmigoMaterialCollectionPage,
  parseAmigoModelDetailPage,
  parseAmigoSystemsPage,
  type ParsedAmigoCategoryPage,
  type ParsedAmigoMaterial,
  type ParsedAmigoModel,
  type ParsedAmigoSystem,
} from './parser.js';
import {
  amigoPageReference,
  validateAmigoUrl,
  validateDiscoveredAmigoPageUrl,
} from './security.js';
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

interface FullCategoryBuilder {
  readonly capturePages: AmigoHtmlPage[];
  readonly childKeys: Set<string>;
  readonly depth: number;
  description?: string;
  readonly family: SourceFamilyReference;
  readonly isTopLevel: boolean;
  readonly key: string;
  readonly materialSourceIds: Set<string>;
  readonly mediaSourceUrls: Set<string>;
  readonly modelSourceIds: Set<string>;
  name: string;
  readonly pageReference: string;
  readonly parentKey?: string;
  readonly sortOrder: number;
  sourceId: string;
  readonly systemSourceIds: Set<string>;
}

interface FullMaterialLocation {
  readonly categoryKey: string;
  readonly page: AmigoHtmlPage;
  readonly parsed: ParsedAmigoMaterial;
}

interface FullSystemLocation {
  readonly categoryKey: string;
  readonly page: AmigoHtmlPage;
  readonly parsed: ParsedAmigoSystem;
}

interface FullModelLocation {
  readonly categoryKey: string;
  readonly page: AmigoHtmlPage;
  readonly parsed: ParsedAmigoModel;
}

interface FullDiscoveryState {
  readonly catalog: SourceCatalogDiscovery;
  readonly categoriesById: ReadonlyMap<string, CapturedSource<SourceCategory>>;
  readonly categoriesByKey: ReadonlyMap<string, CapturedSource<SourceCategory>>;
  readonly materials: ReadonlyMap<string, FullMaterialLocation>;
  readonly models: ReadonlyMap<string, FullModelLocation>;
  readonly systems: ReadonlyMap<string, FullSystemLocation>;
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

function slugFromPageReference(reference: string): string {
  const path = new URL(reference, amigoOrigin).pathname;
  return path.split('/').filter(Boolean).join('--') || 'catalog';
}

function pathCategorySourceId(reference: string): string {
  return `category:path:${slugFromPageReference(reference)}`;
}

function familyFromCategory(input: {
  readonly name: string;
  readonly pageReference: string;
}): SourceFamilyReference {
  const slug = slugFromPageReference(input.pageReference);
  return {
    code: slug.replace(/-/g, '_').toUpperCase().slice(0, 96),
    name: input.name,
    slug,
    sourceId: `family:path:${slug}`,
  };
}

function aggregateCaptureMetadata(
  pages: readonly AmigoHtmlPage[],
  sourceUrl: string,
): SourceCaptureMetadata {
  const capturedAt =
    pages
      .map((page) => page.capturedAt)
      .sort()
      .at(-1) ?? new Date().toISOString();
  const pageFacts = pages
    .map((page) => ({
      contentHash: page.contentHash,
      sourceUrl: page.sourceUrl,
      sourceVersion: page.sourceVersion,
    }))
    .sort((left, right) => left.sourceUrl.localeCompare(right.sourceUrl));
  return {
    capturedAt,
    contentHash: hashCanonicalSource(pageFacts),
    httpStatus: pages.every((page) => page.httpStatus === 200) ? 200 : 207,
    mappingVersion: amigoAdapterVersions.mapping,
    parserVersion: amigoAdapterVersions.parser,
    sourceUrl,
    sourceVersion: `sha256:${hashCanonicalSource(pageFacts)}`,
    status: 'CAPTURED',
  };
}

function compareSourceIds(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true });
}

export type AmigoCatalogSourceAdapterOptions = AmigoHttpTransportOptions &
  AmigoMediaTransportOptions & {
    readonly catalogScope?: AmigoCatalogScope;
    readonly maximumDiscoveryPages?: number;
  };

export class AmigoCatalogSourceAdapter implements CatalogSourceAdapter {
  readonly #allowedPageReferences = new Set(amigoAllowedPagePaths);
  readonly #catalogScope: AmigoCatalogScope;
  readonly #categoryCache = new Map<string, Promise<ParsedCategoryCapture>>();
  #fullDiscovery: Promise<FullDiscoveryState> | undefined;
  readonly #maximumDiscoveryPages: number;
  readonly #pageCache = new Map<string, Promise<AmigoHtmlPage>>();
  readonly #systemCache = new Map<string, Promise<ParsedSystemCapture>>();
  readonly #transport: AmigoHttpTransport;
  readonly #mediaTransport: AmigoMediaTransport;

  constructor(options: AmigoCatalogSourceAdapterOptions = {}) {
    this.#catalogScope = options.catalogScope ?? 'pilot';
    this.#maximumDiscoveryPages = options.maximumDiscoveryPages ?? 1000;
    if (
      !Number.isSafeInteger(this.#maximumDiscoveryPages) ||
      this.#maximumDiscoveryPages < 1 ||
      this.#maximumDiscoveryPages > 5000
    ) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'AMIGO discovery page limit is invalid.',
      );
    }
    this.#transport = new AmigoHttpTransport({
      ...options,
      allowedPageReferences: this.#allowedPageReferences,
    });
    this.#mediaTransport = new AmigoMediaTransport(options);
  }

  async discoverCatalog(): Promise<SourceCatalogDiscovery> {
    if (this.#catalogScope === 'full') {
      return (await this.#ensureFullDiscovery()).catalog;
    }
    const categories = await this.discoverCategories();
    return {
      categories,
      complete: true,
      diagnostics: [],
      materialSourceIds: amigoPilotCategories.flatMap(
        (category) => category.pilotMaterialSourceIds,
      ),
      modelSourceIds: [],
      pages: [],
      sourceVersion: await this.getSourceVersion(),
      systemSourceIds: amigoPilotSystems.map((system) => system.sourceId),
    };
  }

  async discoverCategories(): Promise<readonly CapturedSource<SourceCategory>[]> {
    if (this.#catalogScope === 'full') {
      return (await this.#ensureFullDiscovery()).catalog.categories;
    }
    const categories: CapturedSource<SourceCategory>[] = [];
    for (const config of amigoPilotCategories) {
      categories.push(await this.#fetchCategory(config));
    }
    return categories;
  }

  async fetchCategory(sourceId: string): Promise<CapturedSource<SourceCategory>> {
    if (this.#catalogScope === 'full') {
      const category = (await this.#ensureFullDiscovery()).categoriesById.get(sourceId);
      if (category === undefined) {
        throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO category was not found.', {
          safeDetails: { sourceId },
        });
      }
      return category;
    }
    return this.#fetchCategory(this.#requireCategory(sourceId));
  }

  async fetchMaterial(sourceId: string): Promise<CapturedSource<SourceMaterial>> {
    if (this.#catalogScope === 'full') return this.#fetchFullMaterial(sourceId);
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
    if (this.#catalogScope === 'full') return this.#fetchFullMediaManifest(sourceId);
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

  async fetchModel(sourceId: string): Promise<CapturedSource<SourceModel>> {
    if (this.#catalogScope === 'full') return this.#fetchFullModel(sourceId);
    throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO model was not found.', {
      safeDetails: { sourceId },
    });
  }

  async fetchPrice(sourceId: string): Promise<CapturedSource<SourcePrice>> {
    if (this.#catalogScope === 'full') return this.#fetchFullPrice(sourceId);
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
    if (this.#catalogScope === 'full') return this.#fetchFullSystem(sourceId);
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
    if (this.#catalogScope === 'full')
      return (await this.#ensureFullDiscovery()).catalog.sourceVersion;
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
      await this.#loadPage(
        this.#catalogScope === 'full'
          ? amigoCatalogIndexPath
          : (amigoPilotCategories[0]?.categoryPath ?? '/'),
      );
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

  #ensureFullDiscovery(): Promise<FullDiscoveryState> {
    this.#fullDiscovery ??= this.#discoverFullCatalog();
    return this.#fullDiscovery;
  }

  #registerDiscoveredPage(input: string, parentSourceUrl: string): URL {
    const url = validateDiscoveredAmigoPageUrl(input, parentSourceUrl);
    this.#allowedPageReferences.add(amigoPageReference(url));
    return url;
  }

  async #discoverFullCatalog(): Promise<FullDiscoveryState> {
    const diagnostics: SourceDiscoveryDiagnostic[] = [];
    const discoveryPages: SourceDiscoveryPage[] = [];
    const fetchedPages = new Map<string, AmigoHtmlPage>();
    const builders = new Map<string, FullCategoryBuilder>();
    const materials = new Map<string, FullMaterialLocation>();
    const models = new Map<string, FullModelLocation>();
    const systems = new Map<string, FullSystemLocation>();

    const addDiagnostic = (diagnostic: SourceDiscoveryDiagnostic): void => {
      diagnostics.push(diagnostic);
    };
    const recordPage = (
      page: AmigoHtmlPage,
      kind: SourceDiscoveryPage['kind'],
      pageNumber: number,
      parentCategorySourceId?: string,
    ): void => {
      fetchedPages.set(page.sourceUrl, page);
      discoveryPages.push({
        capture: captureMetadata(page),
        kind,
        pageNumber,
        ...(parentCategorySourceId === undefined ? {} : { parentCategorySourceId }),
        sourceReference: amigoPageReference(new URL(page.sourceUrl)),
      });
    };
    const loadDiscoveryPage = async (
      reference: string,
      parentSourceUrl: string,
      kind: SourceDiscoveryPage['kind'],
      pageNumber: number,
      parentCategorySourceId?: string,
    ): Promise<AmigoHtmlPage> => {
      if (discoveryPages.length >= this.#maximumDiscoveryPages) {
        throw new CatalogSourceError(
          'SOURCE_CONTENT_TOO_LARGE',
          'AMIGO discovery exceeded the configured page limit.',
        );
      }
      const url = this.#registerDiscoveredPage(reference, parentSourceUrl);
      const page = await this.#loadPage(amigoPageReference(url));
      recordPage(page, kind, pageNumber, parentCategorySourceId);
      return page;
    };
    const captureFailure = (error: unknown, sourceUrl: string, entitySourceId?: string): void => {
      if (error instanceof CatalogSourceError && error.code === 'SOURCE_CAPTCHA_OR_CHALLENGE') {
        throw error;
      }
      addDiagnostic({
        code: 'PAGE_FETCH_FAILED',
        ...(entitySourceId === undefined ? {} : { entitySourceId }),
        message:
          error instanceof CatalogSourceError
            ? `AMIGO page failed safely with ${error.code}.`
            : 'AMIGO page failed safely with an unknown transport error.',
        severity: 'FAILURE',
        sourceUrl,
      });
    };

    const indexPage = await loadDiscoveryPage(
      amigoCatalogIndexPath,
      amigoOrigin,
      'CATALOG_INDEX',
      1,
    );
    const index = parseAmigoCatalogIndexPage(indexPage.html, indexPage.sourceUrl);
    const queue: FullCategoryBuilder[] = [];
    for (const category of index.categories) {
      const url = this.#registerDiscoveredPage(category.pageReference, indexPage.sourceUrl);
      const key = url.pathname;
      if (builders.has(key)) continue;
      const family = familyFromCategory(category);
      const builder: FullCategoryBuilder = {
        capturePages: [indexPage],
        childKeys: new Set(),
        depth: 0,
        ...(category.description === undefined ? {} : { description: category.description }),
        family,
        isTopLevel: true,
        key,
        materialSourceIds: new Set(),
        mediaSourceUrls: new Set(
          category.mediaSourceUrl === undefined ? [] : [category.mediaSourceUrl],
        ),
        modelSourceIds: new Set(),
        name: category.name,
        pageReference: key,
        sortOrder: category.sortOrder,
        sourceId: pathCategorySourceId(key),
        systemSourceIds: new Set(),
      };
      builders.set(key, builder);
      queue.push(builder);
    }

    const processed = new Set<string>();
    while (queue.length > 0) {
      const builder = queue.shift();
      if (builder === undefined || processed.has(builder.key)) continue;
      processed.add(builder.key);
      let page: AmigoHtmlPage;
      try {
        page = await loadDiscoveryPage(
          builder.pageReference,
          indexPage.sourceUrl,
          builder.isTopLevel ? 'CATEGORY' : 'MATERIAL_COLLECTION',
          1,
          builder.sourceId,
        );
        builder.capturePages.push(page);
      } catch (error) {
        captureFailure(error, new URL(builder.pageReference, amigoOrigin).href, builder.sourceId);
        continue;
      }

      let categoryPage: ReturnType<typeof parseAmigoCategoryDiscoveryPage> | undefined;
      try {
        categoryPage = parseAmigoCategoryDiscoveryPage(page.html, page.sourceUrl);
        builder.name = categoryPage.name;
        if (categoryPage.description !== undefined) {
          builder.description = categoryPage.description;
        }
        diagnostics.push(...categoryPage.diagnostics);
        for (const parsed of categoryPage.systems) {
          const existing = systems.get(parsed.sourceId);
          if (
            existing !== undefined &&
            hashCanonicalSource(existing.parsed) !== hashCanonicalSource(parsed)
          ) {
            addDiagnostic({
              code: 'SOURCE_IDENTITY_CONFLICT',
              entitySourceId: parsed.sourceId,
              message: 'AMIGO system identity appears with conflicting source facts.',
              severity: 'FAILURE',
              sourceUrl: page.sourceUrl,
            });
            continue;
          }
          systems.set(parsed.sourceId, { categoryKey: builder.key, page, parsed });
          builder.systemSourceIds.add(parsed.sourceId);
        }
        for (const preview of categoryPage.models) {
          builder.modelSourceIds.add(preview.sourceId);
          const existing = models.get(preview.sourceId);
          if (existing !== undefined) {
            if (existing.parsed.name !== preview.name) {
              addDiagnostic({
                code: 'SOURCE_IDENTITY_CONFLICT',
                entitySourceId: preview.sourceId,
                message: 'AMIGO model identity appears with conflicting names.',
                severity: 'FAILURE',
                sourceUrl: page.sourceUrl,
              });
            }
            continue;
          }
          let modelPage: AmigoHtmlPage;
          try {
            modelPage = await loadDiscoveryPage(
              preview.pageReference,
              page.sourceUrl,
              'MODEL_DETAIL',
              1,
              builder.sourceId,
            );
          } catch (error) {
            captureFailure(
              error,
              new URL(preview.pageReference, page.sourceUrl).href,
              preview.sourceId,
            );
            models.set(preview.sourceId, { categoryKey: builder.key, page, parsed: preview });
            continue;
          }
          try {
            const detail = parseAmigoModelDetailPage(
              modelPage.html,
              modelPage.sourceUrl,
              preview.sourceId,
            );
            if (detail.name !== preview.name) {
              addDiagnostic({
                code: 'SOURCE_IDENTITY_CONFLICT',
                entitySourceId: preview.sourceId,
                message: 'AMIGO model preview and detail names conflict.',
                severity: 'FAILURE',
                sourceUrl: modelPage.sourceUrl,
              });
              models.set(preview.sourceId, { categoryKey: builder.key, page, parsed: preview });
              continue;
            }
            models.set(preview.sourceId, {
              categoryKey: builder.key,
              page: modelPage,
              parsed: {
                ...detail,
                mediaSourceUrls:
                  detail.mediaSourceUrls.length === 0
                    ? preview.mediaSourceUrls
                    : detail.mediaSourceUrls,
                priceMinor: detail.priceMinor ?? preview.priceMinor,
              },
            });
          } catch {
            addDiagnostic({
              code: 'PARSER_REVIEW_REQUIRED',
              entitySourceId: preview.sourceId,
              message: 'AMIGO model detail could not be safely parsed.',
              severity: 'FAILURE',
              sourceUrl: modelPage.sourceUrl,
            });
            models.set(preview.sourceId, { categoryKey: builder.key, page, parsed: preview });
          }
        }
      } catch {
        addDiagnostic({
          code: 'PARSER_REVIEW_REQUIRED',
          entitySourceId: builder.sourceId,
          message: 'AMIGO category page could not be safely parsed.',
          severity: 'FAILURE',
          sourceUrl: page.sourceUrl,
        });
      }

      let firstCollection: ReturnType<typeof parseAmigoMaterialCollectionPage> | undefined;
      try {
        firstCollection = parseAmigoMaterialCollectionPage(page.html, page.sourceUrl);
        diagnostics.push(...firstCollection.diagnostics);
        if (
          !builder.isTopLevel &&
          firstCollection.sourceSectionIds.length === 1 &&
          firstCollection.sourceSectionIds[0] !== undefined
        ) {
          builder.sourceId = firstCollection.sourceSectionIds[0];
        } else if (!builder.isTopLevel && firstCollection.sourceSectionIds.length > 1) {
          addDiagnostic({
            code: 'MULTIPLE_SOURCE_SECTIONS',
            entitySourceId: builder.sourceId,
            message:
              'AMIGO collection exposes multiple valid source sections; path identity was retained.',
            severity: 'WARNING',
            sourceUrl: page.sourceUrl,
          });
        }
        for (const parsed of firstCollection.materials) {
          const existing = materials.get(parsed.sourceId);
          if (
            existing !== undefined &&
            hashCanonicalSource(existing.parsed) !== hashCanonicalSource(parsed)
          ) {
            addDiagnostic({
              code: 'SOURCE_IDENTITY_CONFLICT',
              entitySourceId: parsed.sourceId,
              message: 'AMIGO material identity appears with conflicting source facts.',
              severity: 'FAILURE',
              sourceUrl: page.sourceUrl,
            });
            continue;
          }
          if (existing === undefined) {
            materials.set(parsed.sourceId, { categoryKey: builder.key, page, parsed });
          }
          builder.materialSourceIds.add(parsed.sourceId);
        }

        for (const [
          indexNumber,
          reference,
        ] of firstCollection.pagination.pageReferences.entries()) {
          let paginationPage: AmigoHtmlPage;
          try {
            paginationPage = await loadDiscoveryPage(
              reference,
              page.sourceUrl,
              'PAGINATION',
              indexNumber + 2,
              builder.sourceId,
            );
            builder.capturePages.push(paginationPage);
          } catch (error) {
            captureFailure(error, new URL(reference, page.sourceUrl).href, builder.sourceId);
            continue;
          }
          try {
            const parsedPage = parseAmigoMaterialCollectionPage(
              paginationPage.html,
              paginationPage.sourceUrl,
            );
            diagnostics.push(...parsedPage.diagnostics);
            for (const parsed of parsedPage.materials) {
              const existing = materials.get(parsed.sourceId);
              if (
                existing !== undefined &&
                hashCanonicalSource(existing.parsed) !== hashCanonicalSource(parsed)
              ) {
                addDiagnostic({
                  code: 'SOURCE_IDENTITY_CONFLICT',
                  entitySourceId: parsed.sourceId,
                  message: 'AMIGO material identity appears with conflicting source facts.',
                  severity: 'FAILURE',
                  sourceUrl: paginationPage.sourceUrl,
                });
                continue;
              }
              if (existing === undefined) {
                materials.set(parsed.sourceId, {
                  categoryKey: builder.key,
                  page: paginationPage,
                  parsed,
                });
              }
              builder.materialSourceIds.add(parsed.sourceId);
            }
          } catch {
            addDiagnostic({
              code: 'PARSER_REVIEW_REQUIRED',
              entitySourceId: builder.sourceId,
              message: 'AMIGO pagination page could not be safely parsed.',
              severity: 'FAILURE',
              sourceUrl: paginationPage.sourceUrl,
            });
          }
        }
      } catch {
        addDiagnostic({
          code: 'PARSER_REVIEW_REQUIRED',
          entitySourceId: builder.sourceId,
          message: 'AMIGO material collection structure requires parser review.',
          severity: 'FAILURE',
          sourceUrl: page.sourceUrl,
        });
      }

      for (const reference of categoryPage?.childPageReferences ?? []) {
        if (builder.depth >= 3) {
          addDiagnostic({
            code: 'PARSER_REVIEW_REQUIRED',
            entitySourceId: builder.sourceId,
            message: 'AMIGO category nesting exceeds the supported safe discovery depth.',
            severity: 'FAILURE',
            sourceUrl: page.sourceUrl,
          });
          continue;
        }
        const childUrl = this.#registerDiscoveredPage(reference, page.sourceUrl);
        const childKey = childUrl.pathname;
        builder.childKeys.add(childKey);
        let child = builders.get(childKey);
        if (child === undefined) {
          child = {
            capturePages: [page],
            childKeys: new Set(),
            depth: builder.depth + 1,
            family: builder.family,
            isTopLevel: false,
            key: childKey,
            materialSourceIds: new Set(),
            mediaSourceUrls: new Set(),
            modelSourceIds: new Set(),
            name: slugFromPageReference(childKey).replace(/--/g, ' / '),
            pageReference: childKey,
            parentKey: builder.key,
            sortOrder: builder.childKeys.size - 1,
            sourceId: pathCategorySourceId(childKey),
            systemSourceIds: new Set(builder.systemSourceIds),
          };
          builders.set(childKey, child);
          queue.push(child);
        }
      }

      if (
        builder.materialSourceIds.size === 0 &&
        builder.modelSourceIds.size === 0 &&
        builder.systemSourceIds.size === 0 &&
        builder.childKeys.size === 0
      ) {
        addDiagnostic({
          code: 'EMPTY_STRUCTURED_CATEGORY',
          entitySourceId: builder.sourceId,
          message:
            'AMIGO category exposes no structured systems, models, materials or child collections; the category was retained without invented entities.',
          severity: 'WARNING',
          sourceUrl: page.sourceUrl,
        });
      }
    }

    const categoriesById = new Map<string, CapturedSource<SourceCategory>>();
    const categoriesByKey = new Map<string, CapturedSource<SourceCategory>>();
    const sortedBuilders = [...builders.values()].sort(
      (left, right) =>
        left.depth - right.depth ||
        left.sortOrder - right.sortOrder ||
        left.name.localeCompare(right.name, 'ru'),
    );
    for (const builder of sortedBuilders) {
      const sourceUrl = validateAmigoUrl(
        new URL(builder.pageReference, amigoOrigin).href,
        'page',
        this.#allowedPageReferences,
      ).href;
      const parentSourceId =
        builder.parentKey === undefined ? undefined : builders.get(builder.parentKey)?.sourceId;
      const childCategorySourceIds = [...builder.childKeys]
        .map((key) => builders.get(key)?.sourceId)
        .filter((sourceId): sourceId is string => sourceId !== undefined)
        .sort(compareSourceIds);
      const pageReferences = [
        ...new Set(
          builder.capturePages
            .map((page) => amigoPageReference(new URL(page.sourceUrl)))
            .filter((reference) => reference !== amigoCatalogIndexPath || builder.isTopLevel),
        ),
      ].sort();
      const hasParserFailure = diagnostics.some(
        (diagnostic) =>
          diagnostic.severity === 'FAILURE' &&
          new URL(diagnostic.sourceUrl).pathname === new URL(sourceUrl).pathname,
      );
      const facts = {
        childCategorySourceIds,
        ...(builder.description === undefined ? {} : { description: builder.description }),
        family: builder.family,
        materialSourceIds: [...builder.materialSourceIds].sort(compareSourceIds),
        mediaSourceUrls: [...builder.mediaSourceUrls].sort(),
        modelSourceIds: [...builder.modelSourceIds].sort(compareSourceIds),
        name: builder.name,
        ...(parentSourceId === undefined ? {} : { parentCategorySourceId: parentSourceId }),
        sortOrder: builder.sortOrder,
        sourcePageReferences: pageReferences,
        sourceStatus: hasParserFailure ? 'PARSER_REVIEW_REQUIRED' : 'ACTIVE',
        systemSourceIds: [...builder.systemSourceIds].sort(compareSourceIds),
      } as const;
      const capture = aggregateCaptureMetadata(builder.capturePages, sourceUrl);
      const category: CapturedSource<SourceCategory> = {
        capture,
        data: {
          ...facts,
          identity: sourceIdentity({
            capturedAt: capture.capturedAt,
            entityType: 'CATEGORY',
            facts,
            ...(parentSourceId === undefined ? {} : { sourceCategory: parentSourceId }),
            sourceId: builder.sourceId,
            sourceSlug: `amigo-category-${slugFromPageReference(builder.pageReference)}`,
            sourceUrl,
          }),
        },
      };
      const existing = categoriesById.get(builder.sourceId);
      if (existing !== undefined && existing.data.identity.sourceUrl !== sourceUrl) {
        addDiagnostic({
          code: 'SOURCE_IDENTITY_CONFLICT',
          entitySourceId: builder.sourceId,
          message: 'AMIGO category identity maps to multiple source paths.',
          severity: 'FAILURE',
          sourceUrl,
        });
        continue;
      }
      categoriesById.set(builder.sourceId, category);
      categoriesByKey.set(builder.key, category);
    }

    const allPages = [...fetchedPages.values()].sort((left, right) =>
      left.sourceUrl.localeCompare(right.sourceUrl),
    );
    const capturedAt =
      allPages
        .map((page) => page.capturedAt)
        .sort()
        .at(-1) ?? new Date().toISOString();
    const sourceVersion: CatalogSourceVersion = {
      capturedAt,
      sourceType: 'AUTHORIZED_PUBLIC_WEB',
      version: `sha256:${hashCanonicalSource({
        categories: [...categoriesById.values()]
          .map((record) => ({
            sourceHash: record.data.identity.sourceHash,
            sourceId: record.data.identity.sourceId,
          }))
          .sort((left, right) => compareSourceIds(left.sourceId, right.sourceId)),
        materials: [...materials.entries()]
          .map(([sourceId, location]) => ({
            sourceHash: hashCanonicalSource(location.parsed),
            sourceId,
          }))
          .sort((left, right) => compareSourceIds(left.sourceId, right.sourceId)),
        models: [...models.entries()]
          .map(([sourceId, location]) => ({
            sourceHash: hashCanonicalSource(location.parsed),
            sourceId,
          }))
          .sort((left, right) => compareSourceIds(left.sourceId, right.sourceId)),
        systems: [...systems.entries()]
          .map(([sourceId, location]) => ({
            sourceHash: hashCanonicalSource(location.parsed),
            sourceId,
          }))
          .sort((left, right) => compareSourceIds(left.sourceId, right.sourceId)),
      })}`,
    };
    const catalog: SourceCatalogDiscovery = {
      categories: [...categoriesById.values()],
      complete: diagnostics.every((diagnostic) => diagnostic.severity !== 'FAILURE'),
      diagnostics: diagnostics.sort(
        (left, right) =>
          left.sourceUrl.localeCompare(right.sourceUrl) || left.code.localeCompare(right.code),
      ),
      materialSourceIds: [...materials.keys()].sort(compareSourceIds),
      modelSourceIds: [...models.keys()].sort(compareSourceIds),
      pages: discoveryPages,
      sourceVersion,
      systemSourceIds: [...systems.keys()].sort(compareSourceIds),
    };
    return { catalog, categoriesById, categoriesByKey, materials, models, systems };
  }

  async #fetchFullMaterial(sourceId: string): Promise<CapturedSource<SourceMaterial>> {
    const state = await this.#ensureFullDiscovery();
    const location = state.materials.get(sourceId);
    if (location === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO material was not found.', {
        safeDetails: { sourceId },
      });
    }
    const category = state.categoriesByKey.get(location.categoryKey);
    if (category === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO material category mapping is incomplete.',
        { safeDetails: { sourceId } },
      );
    }
    const material = location.parsed;
    const sourceUrl = this.#fullProvenanceUrl(location, sourceId, 'material');
    const facts = {
      article: material.article,
      categorySourceId: category.data.identity.sourceId,
      color: material.color,
      family: category.data.family,
      isBlackout: material.isBlackout,
      isZebra: /(?:zebra|зебр|день-ночь)/iu.test(
        `${category.data.family.slug} ${category.data.family.name}`,
      ),
      materialName: material.materialName,
      properties: material.properties,
      systemSourceIds: category.data.systemSourceIds,
      variantName: material.variantName,
      ...(material.widthMm === undefined ? {} : { widthMm: material.widthMm }),
    };
    return captured(location.page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: location.page.capturedAt,
        entityType: 'MATERIAL_VARIANT',
        facts,
        sourceCategory: category.data.identity.sourceId,
        sourceId,
        sourceSlug: `amigo-material-${sourceId}`,
        sourceUrl,
      }),
    });
  }

  async #fetchFullMediaManifest(sourceId: string): Promise<CapturedSource<SourceMediaManifest>> {
    const state = await this.#ensureFullDiscovery();
    const location = state.materials.get(sourceId);
    if (location === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO material was not found.', {
        safeDetails: { sourceId },
      });
    }
    const category = state.categoriesByKey.get(location.categoryKey);
    if (category === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO media category mapping is incomplete.',
      );
    }
    const media: SourceMediaReference[] = location.parsed.media.map((item) => {
      const mediaSourceId = `${sourceId}:${hashCanonicalSource(item.sourceUrl).slice(0, 16)}`;
      const facts = { materialSourceId: sourceId, role: item.role, sourceUrl: item.sourceUrl };
      return {
        ...(item.contentTypeHint === undefined ? {} : { contentTypeHint: item.contentTypeHint }),
        identity: sourceIdentity({
          capturedAt: location.page.capturedAt,
          entityType: 'MEDIA',
          facts,
          sourceCategory: category.data.identity.sourceId,
          sourceId: mediaSourceId,
          sourceSlug: `amigo-media-${mediaSourceId.replace(/:/g, '-')}`,
          sourceUrl: item.sourceUrl,
        }),
        role: item.role,
      };
    });
    const sourceUrl = this.#fullProvenanceUrl(location, sourceId, 'material');
    const facts = { materialSourceId: sourceId, media };
    return captured(location.page, {
      identity: sourceIdentity({
        capturedAt: location.page.capturedAt,
        entityType: 'MEDIA',
        facts,
        sourceCategory: category.data.identity.sourceId,
        sourceId,
        sourceSlug: `amigo-media-manifest-${sourceId}`,
        sourceUrl,
      }),
      materialSourceId: sourceId,
      media,
    });
  }

  async #fetchFullModel(sourceId: string): Promise<CapturedSource<SourceModel>> {
    const state = await this.#ensureFullDiscovery();
    const location = state.models.get(sourceId);
    if (location === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO model was not found.', {
        safeDetails: { sourceId },
      });
    }
    const category = state.categoriesByKey.get(location.categoryKey);
    if (category === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO model category mapping is incomplete.',
        { safeDetails: { sourceId } },
      );
    }
    const model = location.parsed;
    const facts = {
      categorySourceId: category.data.identity.sourceId,
      ...(model.description === undefined ? {} : { description: model.description }),
      family: category.data.family,
      mediaSourceUrls: model.mediaSourceUrls,
      name: model.name,
      sourceAvailability: model.sourceAvailability,
      ...(model.sourceCategoryName === undefined
        ? {}
        : { sourceCategoryName: model.sourceCategoryName }),
    };
    return captured(location.page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: location.page.capturedAt,
        entityType: 'MODEL',
        facts,
        sourceCategory: category.data.identity.sourceId,
        sourceId,
        sourceSlug: `amigo-model-${sourceId}`,
        sourceUrl: location.page.sourceUrl,
      }),
    });
  }

  async #fetchFullPrice(sourceId: string): Promise<CapturedSource<SourcePrice>> {
    const state = await this.#ensureFullDiscovery();
    const location = state.materials.get(sourceId);
    if (location === undefined) {
      const modelLocation = state.models.get(sourceId);
      if (modelLocation === undefined) {
        throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO price was not found.', {
          safeDetails: { sourceId },
        });
      }
      const modelCategory = state.categoriesByKey.get(modelLocation.categoryKey);
      if (modelCategory === undefined) {
        throw new CatalogSourceError(
          'SOURCE_MAPPING_INCOMPLETE',
          'AMIGO model price category mapping is incomplete.',
        );
      }
      const sourceContext: Record<string, string> = {
        categoryPath: new URL(modelLocation.page.sourceUrl).pathname,
        priceLabel:
          modelLocation.parsed.priceMinor === null
            ? 'PRICE_ON_REQUEST'
            : String(modelLocation.parsed.priceMinor),
      };
      const facts = {
        amountMinor: modelLocation.parsed.priceMinor,
        currency: 'RUB',
        kind: 'BASE',
        sourceContext,
        sourcePriceCategory: modelLocation.parsed.sourceCategoryName ?? null,
        status: modelLocation.parsed.priceMinor === null ? 'PRICE_ON_REQUEST' : 'AVAILABLE',
      } as const;
      return captured(modelLocation.page, {
        ...facts,
        identity: sourceIdentity({
          capturedAt: modelLocation.page.capturedAt,
          entityType: 'PRICE',
          facts,
          sourceCategory: modelCategory.data.identity.sourceId,
          sourceId,
          sourceSlug: `amigo-price-${sourceId}`,
          sourceUrl: modelLocation.page.sourceUrl,
        }),
      });
    }
    const category = state.categoriesByKey.get(location.categoryKey);
    if (category === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO price category mapping is incomplete.',
      );
    }
    const material = location.parsed;
    const sourceContext: Record<string, string> = {
      categoryPath: new URL(location.page.sourceUrl).pathname,
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
    return captured(location.page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: location.page.capturedAt,
        entityType: 'PRICE',
        facts,
        sourceCategory: category.data.identity.sourceId,
        sourceId,
        sourceSlug: `amigo-price-${sourceId}`,
        sourceUrl: this.#fullProvenanceUrl(location, sourceId, 'material'),
      }),
    });
  }

  async #fetchFullSystem(sourceId: string): Promise<CapturedSource<SourceSystem>> {
    const state = await this.#ensureFullDiscovery();
    const location = state.systems.get(sourceId);
    if (location === undefined) {
      throw new CatalogSourceError('SOURCE_ID_NOT_FOUND', 'AMIGO system was not found.', {
        safeDetails: { sourceId },
      });
    }
    const category = state.categoriesByKey.get(location.categoryKey);
    if (category === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO system category mapping is incomplete.',
      );
    }
    const parsed = location.parsed;
    const facts = {
      categorySourceId: category.data.identity.sourceId,
      ...(parsed.description === undefined ? {} : { description: parsed.description }),
      family: category.data.family,
      ...(parsed.mediaSourceUrl === undefined ? {} : { mediaSourceUrl: parsed.mediaSourceUrl }),
      name: parsed.name,
    };
    return captured(location.page, {
      ...facts,
      identity: sourceIdentity({
        capturedAt: location.page.capturedAt,
        entityType: 'SYSTEM',
        facts,
        sourceCategory: category.data.identity.sourceId,
        sourceId,
        sourceSlug: `amigo-system-${sourceId}`,
        sourceUrl: this.#fullSystemProvenanceUrl(location, sourceId),
      }),
    });
  }

  #fullProvenanceUrl(location: FullMaterialLocation, sourceId: string, kind: 'material'): string {
    const url = new URL(location.page.sourceUrl);
    url.search = '';
    url.hash = `${kind}-${sourceId}`;
    return validateAmigoUrl(url.href, 'provenance', this.#allowedPageReferences).href;
  }

  #fullSystemProvenanceUrl(location: FullSystemLocation, sourceId: string): string {
    const url = new URL(location.page.sourceUrl);
    url.search = '';
    url.hash = `system-${sourceId}`;
    return validateAmigoUrl(url.href, 'provenance', this.#allowedPageReferences).href;
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
    const sourceUrl = validateAmigoUrl(
      new URL(path, amigoOrigin).href,
      'page',
      this.#allowedPageReferences,
    ).href;
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
