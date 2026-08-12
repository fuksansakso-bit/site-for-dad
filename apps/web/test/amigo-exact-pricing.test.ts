import { afterEach, describe, expect, it, vi } from 'vitest';

import { priceExactCart, type ExactMaterial } from '../lib/phase2a/amigo-pricing';

const material: ExactMaterial = {
  amigo_calculator_material_id: 93,
  amigo_calculator_model_id: 1,
  amigo_calculator_origin: 'https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru',
  amigo_price_version: 'amigo-0123456789abcdef',
  article: '2259',
  availability: 'AVAILABLE',
  categories: null,
  category_id: '00000000-0000-4000-8000-000000000001',
  color_name: 'магнолия',
  description: null,
  fixed_price_kopecks: null,
  id: '00000000-0000-4000-8000-000000000002',
  material_type: 'fabric',
  minimum_price_kopecks: null,
  name: 'ЛИНА BLACK-OUT 2259',
  normalized_color: 'magnolia',
  price_per_m2_kopecks: null,
  pricing_mode: 'AMIGO_EXACT',
  primary_image_path: 'catalog/material.webp',
  slug: 'amigo-material-test',
};
const item = {
  heightMm: 1000,
  materialSlug: material.slug,
  quantity: 1,
  widthMm: 1000,
};

function fakeClient(cached: number | null) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: cached === null ? null : { unit_price_kopecks: cached },
    error: null,
  });
  const from = vi.fn(() => ({
    match: vi.fn(() => ({ maybeSingle })),
    select: vi.fn(() => ({ match: vi.fn(() => ({ maybeSingle })) })),
    upsert,
  }));
  return { client: { from }, from, upsert };
}

afterEach(() => vi.unstubAllGlobals());

describe('exact AMIGO price adapter', () => {
  it('reuses a complete versioned cache fact and never calls the provider', async () => {
    const { client } = fakeClient(269_500);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const [priced] = await priceExactCart(
      client as never,
      [item],
      new Map([[material.slug, material]]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(priced).toMatchObject({
      priceSourceVersion: material.amigo_price_version,
      pricingStatus: 'KNOWN',
      totalPriceKopecks: 269_500,
      unitPriceKopecks: 269_500,
    });
  });

  it('accepts only the pinned calculator response and persists integer kopecks', async () => {
    const { client, upsert } = fakeClient(null);
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ cost_currency: 2695, currency: 'RUB' }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
      }),
    );
    vi.stubGlobal('fetch', fetchSpy);
    const [priced] = await priceExactCart(
      client as never,
      [item],
      new Map([[material.slug, material]]),
    );
    expect(fetchSpy).toHaveBeenCalledWith(
      new URL('https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru/api/calculate'),
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
    expect(priced?.unitPriceKopecks).toBe(269_500);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ unit_price_kopecks: 269_500 }));
  });

  it('fails closed on an oversized provider response', async () => {
    const { client } = fakeClient(null);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{}', { headers: { 'content-length': '70000' }, status: 200 }),
        ),
    );
    await expect(
      priceExactCart(client as never, [item], new Map([[material.slug, material]])),
    ).rejects.toThrow('AMIGO_PRICE_RESPONSE_INVALID');
  });
});
