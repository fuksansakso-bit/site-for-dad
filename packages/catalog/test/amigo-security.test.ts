import { describe, expect, it } from 'vitest';

import {
  CatalogSourceError,
  isPublicNetworkAddress,
  validateAmigoUrl,
  validateDiscoveredAmigoPageUrl,
} from '../src/index.js';

describe('AMIGO source transport security', () => {
  it('accepts only explicit seed pages and image paths before discovery', () => {
    expect(validateAmigoUrl('https://shop.amigo.ru/catalog/', 'page').pathname).toBe('/catalog/');
    expect(
      validateAmigoUrl('https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/', 'page').pathname,
    ).toBe('/rulonnye-shtory/rulonnye-tkani/');
    expect(validateAmigoUrl('/upload/iblock/abc/material.jpg', 'media').pathname).toBe(
      '/upload/iblock/abc/material.jpg',
    );
    expect(
      validateAmigoUrl('/upload/webp/resize_cache/abc/600_800_1/material.webp', 'media').pathname,
    ).toBe('/upload/webp/resize_cache/abc/600_800_1/material.webp');
    expect(
      validateAmigoUrl('/upload/resize_cache/iblock/abc/550_550_1/category.png', 'media').pathname,
    ).toBe('/upload/resize_cache/iblock/abc/550_550_1/category.png');
    expect(
      validateAmigoUrl('https://shop.amigo.ru/rulonnye-shtory/#system-7556', 'provenance').hash,
    ).toBe('#system-7556');
  });

  it('accepts only clean discovered catalog paths and strict numeric pagination', () => {
    expect(
      validateDiscoveredAmigoPageUrl('/shtory-plisse/', 'https://shop.amigo.ru/catalog/').pathname,
    ).toBe('/shtory-plisse/');
    expect(
      validateDiscoveredAmigoPageUrl(
        '?PAGEN_5=22',
        'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/',
      ).search,
    ).toBe('?PAGEN_5=22');
    expect(() =>
      validateDiscoveredAmigoPageUrl(
        '?filter=blackout',
        'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/',
      ),
    ).toThrowError(CatalogSourceError);
    expect(() =>
      validateDiscoveredAmigoPageUrl('/personal/account/', 'https://shop.amigo.ru/catalog/'),
    ).toThrowError(CatalogSourceError);
  });

  it.each([
    'http://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/',
    'https://example.com/rulonnye-shtory/rulonnye-tkani/',
    'https://shop.amigo.ru/bitrix/admin/',
    'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/?action=delete',
    'https://shop.amigo.ru@127.0.0.1/rulonnye-shtory/rulonnye-tkani/',
  ])('rejects unsafe source URL %s', (url) => {
    expect(() => validateAmigoUrl(url, 'page')).toThrowError(CatalogSourceError);
  });

  it.each([
    '/upload/webp/resize_cache/abc/600_800_1/material.webp?token=secret',
    '/upload/webp/../../private/material.webp',
    '/upload/arbitrary/material.jpg',
  ])('rejects unsafe media URL %s', (url) => {
    expect(() => validateAmigoUrl(url, 'media')).toThrowError(CatalogSourceError);
  });

  it('rejects private and local network resolutions', () => {
    expect(isPublicNetworkAddress('93.184.216.34')).toBe(true);
    expect(isPublicNetworkAddress('10.0.0.1')).toBe(false);
    expect(isPublicNetworkAddress('127.0.0.1')).toBe(false);
    expect(isPublicNetworkAddress('169.254.169.254')).toBe(false);
    expect(isPublicNetworkAddress('::1')).toBe(false);
    expect(isPublicNetworkAddress('fd00::1')).toBe(false);
  });
});
