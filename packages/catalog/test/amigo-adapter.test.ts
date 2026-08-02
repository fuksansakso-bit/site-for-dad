import { describe, expect, it } from 'vitest';

import {
  AmigoCatalogSourceAdapter,
  amigoPilotCategories,
  amigoPilotMaterialCount,
  amigoPilotSystems,
} from '../src/index.js';

function categoryHtml(category: (typeof amigoPilotCategories)[number]): string {
  const aluminumArticles: Readonly<Record<string, string>> = {
    '143': '0225',
    '28074': '2403',
    '28075': '1853',
    '28076': '1884',
    '38917': '6020',
    '38918': '6021',
    '38919': '6007',
    '38920': '6006',
  };
  return `<!doctype html><html><body><div class="catalog_all">${category.pilotMaterialSourceIds
    .map((sourceId, index) => {
      const blackout = ['49129', '50772', '49850', '49849', '49848', '49847'].includes(sourceId);
      const isAluminum = category.categorySourceId === '68';
      const name = isAluminum
        ? `Лента 25x0.18, ${aluminumArticles[sourceId] ?? sourceId}`
        : `${blackout ? 'Blackout' : 'Материал'} ${sourceId}`;
      const title = isAluminum ? name : `${name} серый, 200см`;
      return `
        <a class="catalog_all__item" data-id="${sourceId}" data-sec="${category.categorySourceId}"
          data-page="${category.categoryPath}" data-table="4,6"
          title="${title}">
          <div class="catalog_all__img">
            <div class="box_img"><img src="/upload/iblock/abc/${sourceId}.jpg" alt=""></div>
            <div class="thumb_small"><img src="/upload/iblock/def/${sourceId}-detail.jpg" alt=""></div>
          </div>
          <p class="catalog_all__desc">${name}</p>
          <span class="single-item5__price">от ${1541 + index} ₽</span>
          <p class="catalog_all__info">${isAluminum ? '' : 'серый'}</p>
        </a>`;
    })
    .join('')}</div></body></html>`;
}

function systemsHtml(path: string): string {
  const systems = amigoPilotSystems.filter((system) => system.pagePath === path);
  return `<!doctype html><html><body><div class="windowsContent">${systems
    .map(
      (system) => `
        <div class="windows__item">
          <a class="windows__item-img"><img src="/upload/iblock/sys/${system.sourceId}.png"></a>
          <div class="windows__itemContent">
            <p class="h2">Система ${system.sourceId}</p>
            <div class="windows__list">Описание системы ${system.sourceId}</div>
            <a class="windows__bay" data-id="${system.sourceId}">Узнать цену</a>
          </div>
        </div>`,
    )
    .join('')}</div></body></html>`;
}

function createFetchStub(calls: string[]): typeof globalThis.fetch {
  return async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(url.href);
    const category = amigoPilotCategories.find(
      (candidate) => candidate.categoryPath === url.pathname,
    );
    const html = category === undefined ? systemsHtml(url.pathname) : categoryHtml(category);
    const body = new TextEncoder().encode(html);
    return new Response(body, {
      headers: {
        'content-length': String(body.byteLength),
        'content-type': 'text/html; charset=utf-8',
        etag: `"${url.pathname}"`,
      },
      status: 200,
    });
  };
}

describe('AmigoCatalogSourceAdapter', () => {
  it('maps the controlled pilot without exposing source-specific selectors', async () => {
    const calls: string[] = [];
    const adapter = new AmigoCatalogSourceAdapter({
      fetchImplementation: createFetchStub(calls),
      hostResolver: async () => ['93.184.216.34'],
      minimumDelayMs: 0,
      sleep: async () => undefined,
    });

    const categories = await adapter.discoverCategories();
    expect(categories).toHaveLength(4);
    expect(categories.flatMap((category) => category.data.materialSourceIds)).toHaveLength(
      amigoPilotMaterialCount,
    );

    const material = await adapter.fetchMaterial('49129');
    expect(material.data).toMatchObject({
      article: '49129',
      categorySourceId: '80',
      color: 'серый',
      isBlackout: true,
      isZebra: false,
      widthMm: 2000,
    });
    expect(material.data.identity).toMatchObject({
      sourceEntityType: 'MATERIAL_VARIANT',
      sourceId: '49129',
      sourceType: 'AUTHORIZED_PUBLIC_WEB',
      supplierSlug: 'amigo',
    });

    const zebra = await adapter.fetchMaterial('49850');
    expect(zebra.data.isZebra).toBe(true);
    expect(zebra.data.isBlackout).toBe(true);
    const aluminum = await adapter.fetchMaterial('38920');
    expect(aluminum.data).toMatchObject({
      article: '6006',
      color: '6006',
      materialName: 'Лента 25x0.18',
      widthMm: 25,
    });
    const price = await adapter.fetchPrice('49129');
    expect(price.data).toMatchObject({
      amountMinor: 154_700,
      currency: 'RUB',
      sourcePriceCategory: null,
      status: 'AVAILABLE',
    });
    expect(price.data.sourceContext).toMatchObject({ opaqueTableToken: '4,6' });
    const media = await adapter.fetchMediaManifest('49129');
    expect(media.data.media.map((item) => item.role)).toEqual(['PRIMARY', 'DETAIL']);
    expect((await adapter.fetchProduct('7556')).data.name).toBe('Система 7556');

    const sourceVersion = await adapter.getSourceVersion();
    expect(sourceVersion.version).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect((await adapter.healthCheck()).status).toBe('healthy');
    expect(new Set(calls)).toHaveLength(6);
  });

  it('classifies a missing pilot card as a mapping failure', async () => {
    const adapter = new AmigoCatalogSourceAdapter({
      fetchImplementation: async () =>
        new Response('<html><body></body></html>', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        }),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      minimumDelayMs: 0,
    });

    await expect(adapter.fetchCategory('80')).rejects.toMatchObject({
      code: 'SOURCE_MAPPING_INCOMPLETE',
      retryable: false,
    });
  });
});
