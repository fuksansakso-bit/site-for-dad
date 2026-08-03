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

function fullMaterialCard(input: {
  readonly id: string;
  readonly page: string;
  readonly section: string;
}): string {
  return `<a class="catalog_all__item" data-id="${input.id}" data-sec="${input.section}"
    data-page="${input.page}" title="Ткань ${input.id}, 200см">
    <div class="catalog_all__img"><div class="box_img"><img src="/upload/iblock/full/${input.id}.jpg"></div></div>
    <p class="catalog_all__desc">Ткань ${input.id}</p>
    <span class="single-item5__price">от 2 100 ₽</span>
    <p class="catalog_all__info">бежевый</p>
  </a>`;
}

function createFullDiscoveryFetchStub(
  calls: string[],
  volatilePageToken = 'capture-one',
): typeof globalThis.fetch {
  return async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    calls.push(`${url.pathname}${url.search}`);
    let html: string;
    if (url.pathname === '/catalog/') {
      html = `<!doctype html><h1>Каталог продукции компании «Амиго»</h1>
        <div class="catalog__sub-fon">
          <a href="/rulonnye-shtory/">Рулонные шторы</a>
          <a href="/novaya-kategoriya/">Новая категория</a>
          <a href="/readymade/">Готовые решения</a>
        </div>`;
    } else if (url.pathname === '/rulonnye-shtory/') {
      html = `<!doctype html><h1>Рулонные шторы</h1>
        <section class="materials_section"><a class="articleBtn" href="/rulonnye-shtory/rulonnye-tkani/">Посмотреть все материалы</a></section>
        <div class="windows__item"><h2 class="h2">MINI</h2><div class="windows__list">Описание</div><a class="windows__bay" data-id="7556">Цена</a></div>`;
    } else if (url.pathname === '/novaya-kategoriya/') {
      html = `<!doctype html><h1>Новая категория</h1><div class="catalog_all">${fullMaterialCard({ id: '9001', page: url.pathname, section: '900' })}</div>`;
    } else if (url.pathname === '/readymade/') {
      html = `<!doctype html><h1>Готовые решения</h1>
        <div class="catalog-base__product-preview" id="bx_3966226736_49094_abcdef" data-entity="item">
          <a class="js_change_offer_href" href="/readymade/shtornye-karnizy/fixline/"><div class="catalog-base__img-wrap"><img src="/upload/webp/resize_cache/abc/300_400_1/model-preview.webp"></div></a>
          <div class="catalog-base__title-product">FixLine</div>
          <div class="catalog-base__price-product">14 200 руб.</div>
        </div>`;
    } else if (url.pathname === '/readymade/shtornye-karnizy/fixline/') {
      html = `<!doctype html><div class="product-card">
        <meta itemprop="name" content="FixLine"><meta itemprop="category" content="Карнизы">
        <span itemprop="offers"><meta itemprop="price" content="14200"><link itemprop="availability" href="http://schema.org/InStock"></span>
        <div class="product-card__title-product"><h2>FixLine</h2></div>
        <a class="product-card__slide-preview" data-fancybox="offer_49094" href="/upload/iblock/abc/model-original.jpg"><img src="/upload/webp/resize_cache/abc/600_800_1/model.webp"></a>
        <div class="description__in">Описание FixLine</div>
      </div>`;
    } else if (url.search === '?PAGEN_5=2') {
      html = `<!doctype html><h1>Рулонные ткани</h1><div class="catalog_all">${fullMaterialCard({ id: '1003', page: url.pathname, section: '80' })}</div>`;
    } else {
      html = `<!doctype html><h1>Рулонные ткани</h1><div class="catalog_all">
        ${fullMaterialCard({ id: '1001', page: url.pathname, section: '80' })}
        ${fullMaterialCard({ id: '1002', page: url.pathname, section: '80' })}
        </div><a href="?PAGEN_5=2">2</a>`;
    }
    html += `<script data-volatile-page-token="${volatilePageToken}"></script>`;
    const body = new TextEncoder().encode(html);
    return new Response(body, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        etag: `"${url.pathname}${url.search}"`,
      },
      status: 200,
    });
  };
}

describe('AmigoCatalogSourceAdapter', () => {
  it('discovers a dynamic nested catalog with strict pagination and stable identities', async () => {
    const calls: string[] = [];
    const adapter = new AmigoCatalogSourceAdapter({
      catalogScope: 'full',
      fetchImplementation: createFullDiscoveryFetchStub(calls, 'capture-one'),
      hostResolver: async () => ['93.184.216.34'],
      minimumDelayMs: 0,
      random: () => 0,
      sleep: async () => undefined,
    });

    const discovery = await adapter.discoverCatalog();
    expect(discovery.diagnostics).toEqual([]);
    expect(discovery.complete).toBe(true);
    expect(discovery.categories.map((category) => category.data.identity.sourceId)).toEqual([
      'category:path:rulonnye-shtory',
      'category:path:novaya-kategoriya',
      'category:path:readymade',
      '80',
    ]);
    expect(discovery.materialSourceIds).toEqual(['1001', '1002', '1003', '9001']);
    expect(discovery.modelSourceIds).toEqual(['49094']);
    expect(discovery.systemSourceIds).toEqual(['7556']);
    expect(discovery.pages.map((page) => page.kind)).toEqual([
      'CATALOG_INDEX',
      'CATEGORY',
      'CATEGORY',
      'CATEGORY',
      'MODEL_DETAIL',
      'MATERIAL_COLLECTION',
      'PAGINATION',
    ]);
    expect((await adapter.fetchMaterial('1003')).data).toMatchObject({
      categorySourceId: '80',
      color: 'бежевый',
      systemSourceIds: ['7556'],
    });
    expect((await adapter.fetchPrice('1003')).data).toMatchObject({
      amountMinor: 210_000,
      status: 'AVAILABLE',
    });
    expect((await adapter.fetchProduct('7556')).data.name).toBe('MINI');
    expect((await adapter.fetchModel('49094')).data).toMatchObject({
      categorySourceId: 'category:path:readymade',
      mediaSourceUrls: ['https://shop.amigo.ru/upload/iblock/abc/model-original.jpg'],
      name: 'FixLine',
      sourceAvailability: 'AVAILABLE',
    });
    expect((await adapter.fetchPrice('49094')).data).toMatchObject({
      amountMinor: 1_420_000,
      kind: 'BASE',
    });
    await adapter.discoverCatalog();
    expect(calls).toHaveLength(7);

    const secondAdapter = new AmigoCatalogSourceAdapter({
      catalogScope: 'full',
      fetchImplementation: createFullDiscoveryFetchStub([], 'capture-two'),
      hostResolver: async () => ['93.184.216.34'],
      minimumDelayMs: 0,
      random: () => 0,
      sleep: async () => undefined,
    });
    expect((await secondAdapter.getSourceVersion()).version).toBe(discovery.sourceVersion.version);
  });

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
