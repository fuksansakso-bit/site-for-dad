import { describe, expect, it } from 'vitest';

import { CatalogSourceError, isPublicNetworkAddress, validateAmigoUrl } from '../src/index.js';

describe('AMIGO source transport security', () => {
  it('accepts only explicit pilot pages and image paths', () => {
    expect(
      validateAmigoUrl('https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/', 'page').pathname,
    ).toBe('/rulonnye-shtory/rulonnye-tkani/');
    expect(validateAmigoUrl('/upload/iblock/abc/material.jpg', 'media').pathname).toBe(
      '/upload/iblock/abc/material.jpg',
    );
    expect(
      validateAmigoUrl('https://shop.amigo.ru/rulonnye-shtory/#system-7556', 'provenance').hash,
    ).toBe('#system-7556');
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

  it('rejects private and local network resolutions', () => {
    expect(isPublicNetworkAddress('93.184.216.34')).toBe(true);
    expect(isPublicNetworkAddress('10.0.0.1')).toBe(false);
    expect(isPublicNetworkAddress('127.0.0.1')).toBe(false);
    expect(isPublicNetworkAddress('169.254.169.254')).toBe(false);
    expect(isPublicNetworkAddress('::1')).toBe(false);
    expect(isPublicNetworkAddress('fd00::1')).toBe(false);
  });
});
