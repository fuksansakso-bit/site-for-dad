import { load } from 'cheerio';

import { CatalogSourceError } from '../../errors.js';
import { type SourceDiscoveryDiagnostic, type SourceMaterialProperty } from '../../types.js';
import { type AmigoPilotCategoryConfig, type AmigoPilotSystemConfig } from './config.js';
import { validateAmigoUrl, validateDiscoveredAmigoPageUrl } from './security.js';

function replaceControlCharacters(value: string): string {
  return [...value]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127
        ? ' '
        : character;
    })
    .join('');
}

function sanitizeText(value: string, field: string, maximumLength = 512): string {
  const sanitized = replaceControlCharacters(value).replace(/\s+/g, ' ').trim();
  if (sanitized.length === 0) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'Required AMIGO text is empty.', {
      safeDetails: { field },
    });
  }
  if (sanitized.length > maximumLength) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO text exceeds its safe limit.', {
      safeDetails: { field },
    });
  }
  return sanitized;
}

function sanitizeOptionalText(value: string, maximumLength = 512): string | undefined {
  const sanitized = replaceControlCharacters(value).replace(/\s+/g, ' ').trim();
  if (sanitized.length === 0) {
    return undefined;
  }
  if (sanitized.length > maximumLength) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO text exceeds its safe limit.');
  }
  return sanitized;
}

function parseWidthMm(title: string): number | undefined {
  const centimetersMatch = title.match(/(?:,|\s)([0-9]+(?:[.,][0-9]+)?)\s*(?:см|cm)(?:\s|$)/iu);
  const millimetersMatch = title.match(/(?:,|\s)([0-9]+(?:[.,][0-9]+)?)\s*мм(?:\s|$)/iu);
  const lamellaMatch = title.match(/лента\s+([0-9]+(?:[.,][0-9]+)?)x/iu);
  const rawValue = centimetersMatch?.[1] ?? millimetersMatch?.[1] ?? lamellaMatch?.[1];
  if (rawValue === undefined) {
    return undefined;
  }
  const value = Number(rawValue.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0 || value > 10_000) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO material width is invalid.');
  }
  return centimetersMatch === null ? value : value * 10;
}

function parseArticle(
  displayName: string,
  sourceId: string,
): {
  readonly article: string;
  readonly materialName: string;
} {
  const match = displayName.match(/(?:^|\s)([0-9][0-9A-Za-zА-Яа-яЁё./-]*)$/u);
  if (match?.[1] === undefined) {
    return { article: sourceId, materialName: displayName };
  }
  const materialName = displayName
    .slice(0, Math.max(0, match.index ?? 0))
    .replace(/[\s,;:-]+$/u, '')
    .trim();
  return {
    article: match[1],
    materialName: materialName.length === 0 ? displayName : materialName,
  };
}

function parsePriceMinor(label: string | undefined): number | null {
  if (label === undefined) {
    return null;
  }
  const digits = label.replace(/[^0-9]/g, '');
  if (digits.length === 0) {
    return null;
  }
  const rubles = Number(digits);
  if (!Number.isSafeInteger(rubles) || rubles < 0) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO source price is invalid.');
  }
  if (rubles === 0) return null;
  return rubles * 100;
}

function inferContentType(url: URL): string | undefined {
  const extension = url.pathname.split('.').at(-1)?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return undefined;
}

export interface ParsedAmigoMedia {
  readonly contentTypeHint?: string;
  readonly role: 'DETAIL' | 'PRIMARY';
  readonly sourceUrl: string;
}

export interface ParsedAmigoMaterial {
  readonly article: string;
  readonly color: string;
  readonly isBlackout: boolean;
  readonly materialName: string;
  readonly media: readonly ParsedAmigoMedia[];
  readonly opaquePriceTableToken?: string;
  readonly priceLabel?: string;
  readonly priceMinor: number | null;
  readonly properties: readonly SourceMaterialProperty[];
  readonly sourceId: string;
  readonly sourceSectionId: string;
  readonly title: string;
  readonly variantName: string;
  readonly widthMm?: number;
}

export interface ParsedAmigoCategoryPage {
  readonly materials: readonly ParsedAmigoMaterial[];
}

export function parseAmigoCategoryPage(
  html: string,
  config: AmigoPilotCategoryConfig,
): ParsedAmigoCategoryPage {
  const $ = load(html, { scriptingEnabled: false });
  const allowedIds = new Set(config.pilotMaterialSourceIds);
  const parsed = new Map<string, ParsedAmigoMaterial>();

  $('.catalog_all__item[data-id]').each((_index, element) => {
    const card = $(element);
    const sourceId = card.attr('data-id')?.trim();
    if (sourceId === undefined || !allowedIds.has(sourceId)) {
      return;
    }
    if (parsed.has(sourceId)) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'AMIGO category contains a duplicate pilot source identity.',
        { safeDetails: { sourceId } },
      );
    }

    const sourceSectionId = card.attr('data-sec')?.trim() ?? '';
    const sourcePage = card.attr('data-page')?.trim() ?? '';
    if (sourceSectionId !== config.categorySourceId || sourcePage !== config.categoryPath) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'AMIGO category identity no longer matches the pilot mapping.',
        { safeDetails: { sourceId } },
      );
    }

    const title = sanitizeText(card.attr('title') ?? '', 'material.title', 255);
    const displayName = sanitizeText(
      card.find('.catalog_all__desc').first().text(),
      'material.name',
    );
    const sourceColor = sanitizeOptionalText(card.find('.catalog_all__info').first().text(), 160);
    const priceLabel = sanitizeOptionalText(card.find('.single-item5__price').first().text(), 96);
    const widthMm = parseWidthMm(title);
    const { article, materialName } = parseArticle(displayName, sourceId);
    const color = sourceColor ?? article;
    const media: ParsedAmigoMedia[] = [];

    const primarySource = card.find('.catalog_all__img .box_img img').first().attr('src');
    if (primarySource === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO pilot material has no primary image reference.',
        { safeDetails: { sourceId } },
      );
    }
    const primaryUrl = validateAmigoUrl(primarySource, 'media');
    const primaryContentType = inferContentType(primaryUrl);
    media.push({
      ...(primaryContentType === undefined ? {} : { contentTypeHint: primaryContentType }),
      role: 'PRIMARY',
      sourceUrl: primaryUrl.href,
    });

    const detailSource = card.find('.catalog_all__img .thumb_small img').first().attr('src');
    if (detailSource !== undefined) {
      const detailUrl = validateAmigoUrl(detailSource, 'media');
      if (detailUrl.href !== primaryUrl.href) {
        const detailContentType = inferContentType(detailUrl);
        media.push({
          ...(detailContentType === undefined ? {} : { contentTypeHint: detailContentType }),
          role: 'DETAIL',
          sourceUrl: detailUrl.href,
        });
      }
    }

    const properties: SourceMaterialProperty[] = [
      {
        key: 'source_section',
        name: 'Раздел источника',
        value: sourceSectionId,
      },
    ];
    if (widthMm !== undefined) {
      properties.push({
        key: 'fabric_width',
        name: 'Ширина материала',
        unit: 'mm',
        value: String(widthMm),
      });
    }
    if (sourceColor === undefined) {
      properties.push({
        key: 'source_color_code',
        name: 'Код цвета AMIGO',
        value: article,
      });
    }

    const opaquePriceTableToken = sanitizeOptionalText(card.attr('data-table') ?? '', 64);
    parsed.set(sourceId, {
      article,
      color,
      isBlackout: /(?:black[ -]?out|бл[эе]каут|\bbo\b)/iu.test(title),
      materialName,
      media,
      ...(opaquePriceTableToken === undefined ? {} : { opaquePriceTableToken }),
      ...(priceLabel === undefined ? {} : { priceLabel }),
      priceMinor: parsePriceMinor(priceLabel),
      properties,
      sourceId,
      sourceSectionId,
      title,
      variantName: [displayName, color].join(' — '),
      ...(widthMm === undefined ? {} : { widthMm }),
    });
  });

  const missingIds = config.pilotMaterialSourceIds.filter((sourceId) => !parsed.has(sourceId));
  if (missingIds.length > 0) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO category is missing one or more pilot source identities.',
      { safeDetails: { missingSourceIds: missingIds.join(',') } },
    );
  }
  return {
    materials: config.pilotMaterialSourceIds.map((sourceId) => {
      const material = parsed.get(sourceId);
      if (material === undefined) {
        throw new CatalogSourceError(
          'SOURCE_MAPPING_INCOMPLETE',
          'AMIGO pilot mapping is incomplete.',
        );
      }
      return material;
    }),
  };
}

export interface ParsedAmigoSystem {
  readonly description?: string;
  readonly mediaSourceUrl?: string;
  readonly name: string;
  readonly sourceId: string;
}

export function parseAmigoSystemsPage(
  html: string,
  configs: readonly AmigoPilotSystemConfig[],
): readonly ParsedAmigoSystem[] {
  const $ = load(html, { scriptingEnabled: false });
  const allowedIds = new Set(configs.map((config) => config.sourceId));
  const parsed = new Map<string, ParsedAmigoSystem>();

  $('.windows__item:not(.windows__item_modif)').each((_index, element) => {
    const card = $(element);
    const sourceId = card.find('.windows__bay[data-id]').first().attr('data-id')?.trim();
    if (sourceId === undefined || !allowedIds.has(sourceId)) {
      return;
    }
    const name = sanitizeText(card.find('.h2').first().text(), 'system.name', 255);
    const description = sanitizeOptionalText(card.find('.windows__list').first().text(), 2000);
    const mediaSource = card.find('.windows__item-img img').first().attr('src');
    const mediaUrl =
      mediaSource === undefined ? undefined : validateAmigoUrl(mediaSource, 'media').href;
    parsed.set(sourceId, {
      ...(description === undefined ? {} : { description }),
      ...(mediaUrl === undefined ? {} : { mediaSourceUrl: mediaUrl }),
      name,
      sourceId,
    });
  });

  const missingIds = configs
    .map((config) => config.sourceId)
    .filter((sourceId) => !parsed.has(sourceId));
  if (missingIds.length > 0) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO systems page is missing one or more pilot source identities.',
      { safeDetails: { missingSourceIds: missingIds.join(',') } },
    );
  }
  return configs.map((config) => {
    const system = parsed.get(config.sourceId);
    if (system === undefined) {
      throw new CatalogSourceError(
        'SOURCE_MAPPING_INCOMPLETE',
        'AMIGO system mapping is incomplete.',
      );
    }
    return system;
  });
}

export interface ParsedAmigoCatalogCategoryLink {
  readonly description?: string;
  readonly mediaSourceUrl?: string;
  readonly name: string;
  readonly pageReference: string;
  readonly sortOrder: number;
}

export interface ParsedAmigoCatalogIndex {
  readonly categories: readonly ParsedAmigoCatalogCategoryLink[];
}

export interface ParsedAmigoPagination {
  readonly pageParameter?: string;
  readonly pageReferences: readonly string[];
  readonly totalPages: number;
}

export interface ParsedAmigoMaterialCollection {
  readonly diagnostics: readonly SourceDiscoveryDiagnostic[];
  readonly materials: readonly ParsedAmigoMaterial[];
  readonly pagination: ParsedAmigoPagination;
  readonly sourceSectionIds: readonly string[];
}

export interface ParsedAmigoModel {
  readonly description?: string;
  readonly mediaSourceUrls: readonly string[];
  readonly name: string;
  readonly pageReference: string;
  readonly priceMinor: number | null;
  readonly sourceAvailability: 'AVAILABLE' | 'OUT_OF_STOCK' | 'UNKNOWN';
  readonly sourceCategoryName?: string;
  readonly sourceId: string;
}

export interface ParsedAmigoCategoryDiscoveryPage {
  readonly childPageReferences: readonly string[];
  readonly description?: string;
  readonly diagnostics: readonly SourceDiscoveryDiagnostic[];
  readonly name: string;
  readonly models: readonly ParsedAmigoModel[];
  readonly systems: readonly ParsedAmigoSystem[];
}

function pageReference(url: URL): string {
  return `${url.pathname}${url.search}`;
}

function safeDiscoveredPageReference(
  input: string | undefined,
  parentSourceUrl: string,
): string | undefined {
  if (input === undefined || input === '' || input === '#') return undefined;
  try {
    return pageReference(validateDiscoveredAmigoPageUrl(input, parentSourceUrl));
  } catch {
    return undefined;
  }
}

function normalizeCategoryLinkName(linkText: string, containerText: string): string | undefined {
  const link = sanitizeOptionalText(linkText, 255);
  if (link !== undefined && !/^(?:выбрать|подробнее)$/iu.test(link)) return link;
  const container = sanitizeOptionalText(containerText, 255);
  return container === undefined || /^(?:выбрать|подробнее)$/iu.test(container)
    ? undefined
    : container.replace(/\s+(?:выбрать|подробнее)$/iu, '').trim();
}

export function parseAmigoCatalogIndexPage(
  html: string,
  sourceUrl: string,
): ParsedAmigoCatalogIndex {
  const $ = load(html, { scriptingEnabled: false });
  const title = sanitizeOptionalText($('h1').first().text(), 255);
  if (title === undefined || !/каталог/iu.test(title)) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO catalog index heading is not recognized.',
    );
  }

  const categories = new Map<string, ParsedAmigoCatalogCategoryLink>();
  const selectors = [
    '.bx_catalog_tile_title a[href]',
    '.catalog__sub-fon a[href]',
    '.headerMobilCatalog__content a[href]',
  ] as const;
  for (const selector of selectors) {
    $(selector).each((_index, element) => {
      const link = $(element);
      const reference = safeDiscoveredPageReference(link.attr('href'), sourceUrl);
      if (reference === undefined || reference === '/catalog/' || reference.includes('?')) return;
      const existing = categories.get(reference);
      const name = normalizeCategoryLinkName(link.text(), link.parent().text());
      if (name === undefined) return;
      const tile = link.closest('li');
      const description = sanitizeOptionalText(tile.find('.desc').first().text(), 2000);
      const mediaSource =
        tile.find('a.thumb img').first().attr('data-original') ??
        tile.find('a.thumb img').first().attr('src');
      let mediaSourceUrl: string | undefined;
      if (mediaSource !== undefined) {
        try {
          mediaSourceUrl = validateAmigoUrl(mediaSource, 'media').href;
        } catch {
          mediaSourceUrl = undefined;
        }
      }
      const resolvedDescription = description ?? existing?.description;
      const resolvedMediaSourceUrl = mediaSourceUrl ?? existing?.mediaSourceUrl;
      categories.set(reference, {
        ...(resolvedDescription === undefined ? {} : { description: resolvedDescription }),
        ...(resolvedMediaSourceUrl === undefined ? {} : { mediaSourceUrl: resolvedMediaSourceUrl }),
        name: existing?.name ?? name,
        pageReference: reference,
        sortOrder: existing?.sortOrder ?? categories.size,
      });
    });
  }
  if (categories.size === 0) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO catalog index exposes no recognized category links.',
    );
  }
  return { categories: [...categories.values()] };
}

function parseDiscoveredSystems(
  html: string,
  sourceUrl: string,
): {
  readonly diagnostics: readonly SourceDiscoveryDiagnostic[];
  readonly systems: readonly ParsedAmigoSystem[];
} {
  const $ = load(html, { scriptingEnabled: false });
  const systems = new Map<string, ParsedAmigoSystem>();
  const diagnostics: SourceDiscoveryDiagnostic[] = [];
  $('.windows__bay[data-id], [class*="windows__bay"][data-id]').each((_index, element) => {
    const action = $(element);
    const sourceId = action.attr('data-id')?.trim();
    if (sourceId === undefined || !/^[0-9]+$/u.test(sourceId)) return;
    const card = action.closest('.windows__item');
    const name = sanitizeOptionalText(
      card.find('.h2, h2, h3, [class*="title"]').first().text(),
      255,
    );
    const description = sanitizeOptionalText(card.find('.windows__list').first().text(), 2000);
    const mediaSource = card.find('.windows__item-img img, img').first().attr('src');
    let mediaSourceUrl: string | undefined;
    if (mediaSource !== undefined) {
      try {
        mediaSourceUrl = validateAmigoUrl(mediaSource, 'media').href;
      } catch {
        diagnostics.push({
          code: 'PARSER_REVIEW_REQUIRED',
          entitySourceId: sourceId,
          message: 'System media reference did not pass the AMIGO media allowlist.',
          severity: 'WARNING',
          sourceUrl,
        });
      }
    }
    const existing = systems.get(sourceId);
    if (
      existing !== undefined &&
      name !== undefined &&
      existing.name !== '' &&
      existing.name !== name
    ) {
      diagnostics.push({
        code: 'SOURCE_IDENTITY_CONFLICT',
        entitySourceId: sourceId,
        message: 'The same AMIGO system identity has conflicting names.',
        severity: 'FAILURE',
        sourceUrl,
      });
      return;
    }
    if (existing === undefined || (existing.name === '' && name !== undefined)) {
      systems.set(sourceId, {
        ...(description === undefined ? {} : { description }),
        ...(mediaSourceUrl === undefined ? {} : { mediaSourceUrl }),
        name: name ?? '',
        sourceId,
      });
    }
  });
  for (const [sourceId, system] of systems) {
    if (system.name === '') {
      diagnostics.push({
        code: 'PARSER_REVIEW_REQUIRED',
        entitySourceId: sourceId,
        message: 'AMIGO system identity has no usable name.',
        severity: 'FAILURE',
        sourceUrl,
      });
    }
  }
  return { diagnostics, systems: [...systems.values()] };
}

function parseModelPreviewSourceId(cardId: string | undefined): string | undefined {
  if (cardId === undefined) return undefined;
  return cardId.match(/^bx_[0-9]+_([0-9]+)_[0-9a-f]+$/iu)?.[1];
}

function parseAmigoModelPreviews(
  html: string,
  sourceUrl: string,
): {
  readonly diagnostics: readonly SourceDiscoveryDiagnostic[];
  readonly models: readonly ParsedAmigoModel[];
} {
  const $ = load(html, { scriptingEnabled: false });
  const diagnostics: SourceDiscoveryDiagnostic[] = [];
  const models = new Map<string, ParsedAmigoModel>();
  $('.catalog-base__product-preview[data-entity="item"]').each((_index, element) => {
    const card = $(element);
    const sourceId = parseModelPreviewSourceId(card.attr('id'));
    try {
      if (sourceId === undefined) {
        throw new CatalogSourceError(
          'SOURCE_CONTENT_INVALID',
          'AMIGO model preview has no stable source identity.',
        );
      }
      const name = sanitizeText(
        card.find('.catalog-base__title-product').first().text(),
        'model.name',
        255,
      );
      const pageReference = safeDiscoveredPageReference(
        card.find('a.js_change_offer_href[href]').first().attr('href'),
        sourceUrl,
      );
      if (pageReference === undefined || pageReference.includes('?')) {
        throw new CatalogSourceError(
          'SOURCE_CONTENT_INVALID',
          'AMIGO model preview has no safe detail page.',
        );
      }
      const priceLabel = sanitizeOptionalText(
        card.find('.catalog-base__price-product').first().text(),
        96,
      );
      const cardText = card.text().replace(/\s+/g, ' ').trim();
      const sourceAvailability =
        /\u043d\u0435\u0442\s+\u0432\s+\u043d\u0430\u043b\u0438\u0447\u0438\u0438/iu.test(cardText)
          ? 'OUT_OF_STOCK'
          : 'UNKNOWN';
      const mediaSource = card.find('.catalog-base__img-wrap img').first().attr('src');
      const mediaSourceUrls =
        mediaSource === undefined ? [] : [validateAmigoUrl(mediaSource, 'media').href];
      const parsed: ParsedAmigoModel = {
        mediaSourceUrls,
        name,
        pageReference,
        priceMinor: parsePriceMinor(priceLabel),
        sourceAvailability,
        sourceId,
      };
      const existing = models.get(sourceId);
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(parsed)) {
        diagnostics.push({
          code: 'DUPLICATE_SOURCE_ID',
          entitySourceId: sourceId,
          message: 'AMIGO model identity appears with conflicting preview facts.',
          severity: 'FAILURE',
          sourceUrl,
        });
        return;
      }
      models.set(sourceId, parsed);
    } catch {
      diagnostics.push({
        code: 'PARSER_REVIEW_REQUIRED',
        ...(sourceId === undefined ? {} : { entitySourceId: sourceId }),
        message: 'AMIGO model preview could not be safely parsed.',
        severity: 'FAILURE',
        sourceUrl,
      });
    }
  });
  return { diagnostics, models: [...models.values()] };
}

export function parseAmigoModelDetailPage(
  html: string,
  sourceUrl: string,
  expectedSourceId: string,
): ParsedAmigoModel {
  const $ = load(html, { scriptingEnabled: false });
  const sourceIds = new Set<string>();
  $('[data-fancybox^="offer_"], [id]').each((_index, element) => {
    const fancyboxId = $(element)
      .attr('data-fancybox')
      ?.match(/^offer_([0-9]+)$/u)?.[1];
    if (fancyboxId !== undefined) sourceIds.add(fancyboxId);
    const elementId = $(element).attr('id');
    const embeddedId = elementId?.match(/^bx_[0-9]+_([0-9]+)_/u)?.[1];
    if (embeddedId !== undefined) sourceIds.add(embeddedId);
  });
  if (!sourceIds.has(expectedSourceId)) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO model detail identity does not match its preview identity.',
    );
  }
  const name = sanitizeText(
    $('.product-card__title-product h1, .product-card__title-product h2, meta[itemprop="name"]')
      .first()
      .attr('content') ??
      $('.product-card__title-product h1, .product-card__title-product h2').first().text(),
    'model.name',
    255,
  );
  const description = sanitizeOptionalText($('.description__in').text(), 4000);
  const sourceCategoryName = sanitizeOptionalText(
    $('meta[itemprop="category"]').first().attr('content') ?? '',
    255,
  );
  const availability = $('link[itemprop="availability"]').first().attr('href') ?? '';
  const sourceAvailability = /\/InStock$/iu.test(availability)
    ? 'AVAILABLE'
    : /\/OutOfStock$/iu.test(availability)
      ? 'OUT_OF_STOCK'
      : 'UNKNOWN';
  const rawPrice = $('meta[itemprop="price"]').first().attr('content');
  let priceMinor: number | null = null;
  if (rawPrice !== undefined && rawPrice.trim() !== '') {
    const price = Number(rawPrice.replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0) {
      throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO model price is invalid.');
    }
    priceMinor = Math.round(price * 100);
  }
  const mediaSourceUrls: string[] = [];
  const seenMedia = new Set<string>();
  const originalMediaCandidates = $('.product-card__slide-preview[href]')
    .toArray()
    .map((element) => $(element).attr('href'));
  const mediaCandidates =
    originalMediaCandidates.length > 0
      ? originalMediaCandidates
      : $('.product-card__slide-preview img[src]')
          .toArray()
          .map((element) => $(element).attr('src'));
  for (const candidate of mediaCandidates) {
    if (candidate === undefined) continue;
    const mediaUrl = validateAmigoUrl(candidate, 'media').href;
    if (seenMedia.has(mediaUrl)) continue;
    seenMedia.add(mediaUrl);
    mediaSourceUrls.push(mediaUrl);
  }
  return {
    ...(description === undefined ? {} : { description }),
    mediaSourceUrls,
    name,
    pageReference: pageReference(new URL(sourceUrl)),
    priceMinor,
    sourceAvailability,
    ...(sourceCategoryName === undefined ? {} : { sourceCategoryName }),
    sourceId: expectedSourceId,
  };
}

export function parseAmigoCategoryDiscoveryPage(
  html: string,
  sourceUrl: string,
): ParsedAmigoCategoryDiscoveryPage {
  const $ = load(html, { scriptingEnabled: false });
  const name = sanitizeText($('h1').first().text(), 'category.name', 255);
  const description = sanitizeOptionalText(
    $('h1').first().nextAll('p, h2, h3').first().text(),
    2000,
  );
  const childPageReferences = new Set<string>();
  const selectors = [
    '.materials_section a[href]',
    'a.articleBtn[href]',
    '.materials_pag a[href]',
    '.windows__list a[href]',
  ] as const;
  for (const selector of selectors) {
    $(selector).each((_index, element) => {
      const link = $(element);
      const text = link.text().replace(/\s+/g, ' ').trim();
      const classes = `${link.attr('class') ?? ''} ${link.parents('[class]').first().attr('class') ?? ''}`;
      if (!/(?:материал|ткан|лент|каталог)/iu.test(text) && !/material/iu.test(classes)) return;
      const reference = safeDiscoveredPageReference(link.attr('href'), sourceUrl);
      if (reference !== undefined && reference !== pageReference(new URL(sourceUrl))) {
        childPageReferences.add(reference);
      }
    });
  }
  const systems = parseDiscoveredSystems(html, sourceUrl);
  const models = parseAmigoModelPreviews(html, sourceUrl);
  return {
    childPageReferences: [...childPageReferences].sort(),
    ...(description === undefined ? {} : { description }),
    diagnostics: [...systems.diagnostics, ...models.diagnostics],
    name,
    models: models.models,
    systems: systems.systems,
  };
}

function parsePagination($: ReturnType<typeof load>, sourceUrl: string): ParsedAmigoPagination {
  const source = new URL(sourceUrl);
  const parameters = new Map<string, number>();
  $('a[href]').each((_index, element) => {
    const reference = safeDiscoveredPageReference($(element).attr('href'), sourceUrl);
    if (reference === undefined) return;
    const candidate = new URL(reference, sourceUrl);
    if (candidate.pathname !== source.pathname || candidate.search === '') return;
    const match = candidate.search.match(/^\?PAGEN_([1-9][0-9]*)=([1-9][0-9]*)$/u);
    if (match?.[1] === undefined || match[2] === undefined) return;
    const parameter = `PAGEN_${match[1]}`;
    parameters.set(parameter, Math.max(parameters.get(parameter) ?? 1, Number(match[2])));
  });
  if (parameters.size === 0) return { pageReferences: [], totalPages: 1 };
  if (parameters.size > 1) {
    throw new CatalogSourceError(
      'SOURCE_MAPPING_INCOMPLETE',
      'AMIGO material page exposes conflicting pagination parameters.',
    );
  }
  const [pageParameter, totalPages] = [...parameters.entries()][0] ?? [];
  if (pageParameter === undefined || totalPages === undefined || totalPages < 1) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO pagination is invalid.');
  }
  const pageReferences = Array.from({ length: totalPages - 1 }, (_item, index) => {
    const page = index + 2;
    return `${source.pathname}?${pageParameter}=${page}`;
  });
  return { pageParameter, pageReferences, totalPages };
}

export function parseAmigoMaterialCollectionPage(
  html: string,
  sourceUrl: string,
): ParsedAmigoMaterialCollection {
  const $ = load(html, { scriptingEnabled: false });
  const source = new URL(sourceUrl);
  const parsed = new Map<string, ParsedAmigoMaterial>();
  const diagnostics: SourceDiscoveryDiagnostic[] = [];
  const sourceSectionIds = new Set<string>();

  $('.catalog_all__item[data-id][data-sec][data-page]').each((_index, element) => {
    const card = $(element);
    const sourceId = card.attr('data-id')?.trim();
    if (sourceId === undefined || !/^[0-9]+$/u.test(sourceId)) return;
    try {
      const sourceSectionId = sanitizeText(card.attr('data-sec') ?? '', 'material.section', 64);
      if (!/^[0-9]+$/u.test(sourceSectionId)) {
        throw new CatalogSourceError(
          'SOURCE_CONTENT_INVALID',
          'AMIGO material section identity is invalid.',
        );
      }
      const sourcePage = card.attr('data-page')?.trim();
      if (sourcePage !== source.pathname) {
        throw new CatalogSourceError(
          'SOURCE_CONTENT_INVALID',
          'AMIGO material page identity does not match its collection path.',
        );
      }
      const title = sanitizeText(card.attr('title') ?? '', 'material.title', 255);
      const displayName = sanitizeText(
        card.find('.catalog_all__desc, [class*="desc"]').first().text(),
        'material.name',
      );
      const sourceColor = sanitizeOptionalText(
        card.find('.catalog_all__info, [class*="info"]').first().text(),
        160,
      );
      const priceLabel = sanitizeOptionalText(
        card.find('.single-item5__price, [class*="price"]').first().text(),
        96,
      );
      const widthMm = parseWidthMm(title);
      const { article, materialName } = parseArticle(displayName, sourceId);
      const color = sourceColor ?? article;
      const media: ParsedAmigoMedia[] = [];
      const seenMedia = new Set<string>();
      const imageCandidates = [
        ...card.find('.catalog_all__img .box_img img, [class*="catalog_all__img"] img').toArray(),
        ...card.find('.catalog_all__img .thumb_small img, [class*="thumb"] img').toArray(),
      ];
      for (const image of imageCandidates) {
        const mediaSource = $(image).attr('src');
        if (mediaSource === undefined) continue;
        const mediaUrl = validateAmigoUrl(mediaSource, 'media');
        if (seenMedia.has(mediaUrl.href)) continue;
        const contentTypeHint = inferContentType(mediaUrl);
        media.push({
          ...(contentTypeHint === undefined ? {} : { contentTypeHint }),
          role: media.length === 0 ? 'PRIMARY' : 'DETAIL',
          sourceUrl: mediaUrl.href,
        });
        seenMedia.add(mediaUrl.href);
      }
      if (media.length === 0) {
        diagnostics.push({
          code: 'MISSING_MEDIA',
          entitySourceId: sourceId,
          message: 'AMIGO material has no recognized media reference.',
          severity: 'WARNING',
          sourceUrl,
        });
      }
      const properties: SourceMaterialProperty[] = [
        { key: 'source_section', name: 'Раздел источника', value: sourceSectionId },
      ];
      if (widthMm !== undefined) {
        properties.push({
          key: 'fabric_width',
          name: 'Ширина материала',
          unit: 'mm',
          value: String(widthMm),
        });
      }
      if (sourceColor === undefined) {
        properties.push({ key: 'source_color_code', name: 'Код цвета AMIGO', value: article });
      }
      const opaquePriceTableToken = sanitizeOptionalText(card.attr('data-table') ?? '', 64);
      const priceMinor = parsePriceMinor(priceLabel);
      if (priceLabel !== undefined && priceMinor === null && /0/u.test(priceLabel)) {
        diagnostics.push({
          code: 'SOURCE_ZERO_PRICE_NORMALIZED',
          entitySourceId: sourceId,
          message: 'AMIGO source zero price was normalized to PRICE_ON_REQUEST.',
          severity: 'WARNING',
          sourceUrl,
        });
      }
      const material: ParsedAmigoMaterial = {
        article,
        color,
        isBlackout: /(?:black[ -]?out|бл[эе]каут|\bbo\b)/iu.test(title),
        materialName,
        media,
        ...(opaquePriceTableToken === undefined ? {} : { opaquePriceTableToken }),
        ...(priceLabel === undefined ? {} : { priceLabel }),
        priceMinor,
        properties,
        sourceId,
        sourceSectionId,
        title,
        variantName: [displayName, color].join(' — '),
        ...(widthMm === undefined ? {} : { widthMm }),
      };
      const existing = parsed.get(sourceId);
      if (existing !== undefined) {
        if (JSON.stringify(existing) !== JSON.stringify(material)) {
          diagnostics.push({
            code: 'DUPLICATE_SOURCE_ID',
            entitySourceId: sourceId,
            message: 'AMIGO material identity appears with conflicting source facts.',
            severity: 'FAILURE',
            sourceUrl,
          });
        }
        return;
      }
      parsed.set(sourceId, material);
      sourceSectionIds.add(sourceSectionId);
    } catch {
      diagnostics.push({
        code: 'PARSER_REVIEW_REQUIRED',
        entitySourceId: sourceId,
        message: 'AMIGO material card could not be safely parsed.',
        severity: 'FAILURE',
        sourceUrl,
      });
    }
  });

  return {
    diagnostics,
    materials: [...parsed.values()],
    pagination: parsePagination($, sourceUrl),
    sourceSectionIds: [...sourceSectionIds].sort(),
  };
}
