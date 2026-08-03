import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { parseAmigoMaterialCollectionPage } from '../src/adapters/amigo/parser.js';

const fixtureUrl = new URL('./fixtures/amigo/material-zero-price.html', import.meta.url);
const previewFixtureUrl = new URL(
  './fixtures/amigo/material-preview-and-canonical.html',
  import.meta.url,
);

describe('AMIGO full catalog parser regressions', () => {
  it('keeps a source zero-price material and normalizes its price to PRICE_ON_REQUEST', async () => {
    const html = await readFile(fixtureUrl, 'utf8');
    const parsed = parseAmigoMaterialCollectionPage(
      html,
      'https://shop.amigo.ru/gorizontalnye-derevyannye-zhalyuzi/bambuk-derevo-plastik/',
    );

    expect(parsed.materials).toHaveLength(1);
    expect(parsed.materials[0]).toMatchObject({ priceMinor: null, sourceId: '986' });
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'SOURCE_ZERO_PRICE_NORMALIZED',
        entitySourceId: '986',
        severity: 'WARNING',
      }),
    ]);
  });

  it('ignores non-canonical overview cards when the full material card is present', async () => {
    const html = await readFile(previewFixtureUrl, 'utf8');
    const parsed = parseAmigoMaterialCollectionPage(
      html,
      'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/',
    );

    expect(parsed.materials).toHaveLength(1);
    expect(parsed.materials[0]).toMatchObject({
      materialName: 'Ткань',
      priceMinor: 210_000,
      sourceId: '1001',
    });
    expect(parsed.diagnostics).toEqual([]);
  });

  it('keeps cards with multiple price labels but makes the ambiguous price inquiry-only', async () => {
    const html = (await readFile(previewFixtureUrl, 'utf8')).replace(
      'от 2 100 ₽',
      'от 4 650 ₽ от 4 160 ₽',
    );
    const parsed = parseAmigoMaterialCollectionPage(
      html,
      'https://shop.amigo.ru/rulonnye-shtory/rulonnye-tkani/',
    );

    expect(parsed.materials).toHaveLength(1);
    expect(parsed.materials[0]).toMatchObject({ priceMinor: null, sourceId: '1001' });
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        code: 'AMBIGUOUS_SOURCE_PRICE_NORMALIZED',
        entitySourceId: '1001',
        severity: 'WARNING',
      }),
    ]);
  });
});
