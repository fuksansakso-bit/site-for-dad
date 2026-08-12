import { describe, expect, it } from 'vitest';
import { calculateUnitPrice, MINIMUM_UNIT_KOPECKS, priceItem } from '../lib/phase2a/pricing';
const base = {
  id: '00000000-0000-4000-8000-000000000001',
  category_id: 'c',
  name: 'Ткань',
  slug: 'tkan',
  article: 'A1',
  description: null,
  color_name: null,
  normalized_color: null,
  material_type: null,
  availability: 'AVAILABLE' as const,
  primary_image_path: null,
  categories: null,
};
describe('Phase 2A pricing', () => {
  it('calculates area and rounds kopecks up', () =>
    expect(
      calculateUnitPrice(
        {
          ...base,
          pricing_mode: 'AREA',
          price_per_m2_kopecks: 200001,
          fixed_price_kopecks: null,
          minimum_price_kopecks: MINIMUM_UNIT_KOPECKS,
        },
        1001,
        1001,
      ),
    ).toBe(200402));
  it('applies 1500 RUB to every separately made item', () =>
    expect(
      priceItem(
        { materialSlug: base.slug, widthMm: 500, heightMm: 500, quantity: 2 },
        {
          ...base,
          pricing_mode: 'AREA',
          price_per_m2_kopecks: 100000,
          fixed_price_kopecks: null,
          minimum_price_kopecks: 150000,
        },
      ).totalPriceKopecks,
    ).toBe(300000));
  it('uses fixed price', () =>
    expect(
      calculateUnitPrice(
        {
          ...base,
          pricing_mode: 'FIXED',
          price_per_m2_kopecks: null,
          fixed_price_kopecks: 210000,
          minimum_price_kopecks: null,
        },
        400,
        400,
      ),
    ).toBe(210000));
  it('never presents zero for manual pricing', () =>
    expect(
      calculateUnitPrice(
        {
          ...base,
          pricing_mode: 'MANUAL',
          price_per_m2_kopecks: null,
          fixed_price_kopecks: null,
          minimum_price_kopecks: null,
        },
        400,
        400,
      ),
    ).toBeNull());
  it('matches bigint server rounding at unsafe Number boundaries', () =>
    expect(
      calculateUnitPrice(
        {
          ...base,
          pricing_mode: 'AREA',
          price_per_m2_kopecks: 1910707474,
          fixed_price_kopecks: null,
          minimum_price_kopecks: 150000,
        },
        4994,
        5609,
      ),
    ).toBe(53521488160));
});
