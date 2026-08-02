import { load } from 'cheerio';

import { CatalogSourceError } from '../../errors.js';
import { type SourceMaterialProperty } from '../../types.js';
import { type AmigoPilotCategoryConfig, type AmigoPilotSystemConfig } from './config.js';
import { validateAmigoUrl } from './security.js';

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
  if (!Number.isSafeInteger(rubles) || rubles <= 0) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO source price is invalid.');
  }
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
