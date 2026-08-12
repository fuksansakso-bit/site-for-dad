import type { CartItem, Material, PricedItem } from './types';
export const MINIMUM_UNIT_KOPECKS = 150_000;
export function calculateUnitPrice(
  material: Pick<
    Material,
    'pricing_mode' | 'price_per_m2_kopecks' | 'fixed_price_kopecks' | 'minimum_price_kopecks'
  >,
  widthMm: number,
  heightMm: number,
) {
  if (material.pricing_mode === 'MANUAL') return null;
  if (material.pricing_mode === 'FIXED') return material.fixed_price_kopecks;
  if (!material.price_per_m2_kopecks) return null;
  const numerator = BigInt(widthMm) * BigInt(heightMm) * BigInt(material.price_per_m2_kopecks);
  const rawBigInt = (numerator + 999_999n) / 1_000_000n;
  if (rawBigInt > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  const raw = Number(rawBigInt);
  return Math.max(
    raw,
    material.minimum_price_kopecks ?? MINIMUM_UNIT_KOPECKS,
    MINIMUM_UNIT_KOPECKS,
  );
}
export function priceItem(item: CartItem, material: Material): PricedItem {
  const unit = calculateUnitPrice(material, item.widthMm, item.heightMm);
  return {
    ...item,
    name: material.name,
    article: material.article,
    pricingStatus: unit === null ? 'MANUAL' : 'KNOWN',
    unitPriceKopecks: unit,
    totalPriceKopecks: unit === null ? null : unit * item.quantity,
  };
}
export function formatMoney(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value / 100);
}
