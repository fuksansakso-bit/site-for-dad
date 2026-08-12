import 'server-only';

import { z } from 'zod';

import type { CartItem, Material, PricedItem } from './types';
import type { createSupabaseAdminClient } from './supabase';

const PINNED_ORIGIN = 'https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru';
const responseSchema = z
  .object({
    cost_currency: z.number().int().positive(),
    currency: z.string().optional(),
  })
  .passthrough();
let providerTail: Promise<void> = Promise.resolve();

async function serializeProviderCall<T>(operation: () => Promise<T>): Promise<T> {
  const previous = providerTail;
  let release = () => {};
  providerTail = new Promise<void>((accept) => {
    release = accept;
  });
  await previous;
  try {
    return await operation();
  } finally {
    release();
  }
}

export type ExactMaterial = Material & {
  amigo_price_version: string;
  amigo_calculator_origin: string;
  amigo_calculator_model_id: number;
  amigo_calculator_material_id: number;
};

export type ExactPricedItem = PricedItem & {
  calculatorMaterialId: number;
  calculatorModelId: number;
  priceSourceVersion: string;
  totalPriceKopecks: number;
  unitPriceKopecks: number;
};

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

async function calculateUnit(
  client: AdminClient,
  item: CartItem,
  material: ExactMaterial,
): Promise<number> {
  if (
    material.pricing_mode !== 'AMIGO_EXACT' ||
    material.amigo_calculator_origin !== PINNED_ORIGIN ||
    !/^amigo-[0-9a-f]{16}$/u.test(material.amigo_price_version) ||
    !Number.isSafeInteger(material.amigo_calculator_model_id) ||
    !Number.isSafeInteger(material.amigo_calculator_material_id)
  ) {
    throw new Error('MATERIAL_PRICE_MAPPING_INVALID');
  }
  const cacheKey = {
    calculator_material_id: material.amigo_calculator_material_id,
    calculator_model_id: material.amigo_calculator_model_id,
    height_mm: item.heightMm,
    source_version: material.amigo_price_version,
    width_mm: item.widthMm,
  };
  const { data: cached, error: cacheError } = await client
    .from('amigo_calculation_cache')
    .select('unit_price_kopecks')
    .match(cacheKey)
    .maybeSingle();
  if (cacheError) throw new Error('PRICE_CACHE_READ_FAILED');
  if (cached && Number.isSafeInteger(Number(cached.unit_price_kopecks))) {
    return Number(cached.unit_price_kopecks);
  }

  const url = new URL('/api/calculate', PINNED_ORIGIN);
  const response = await serializeProviderCall(() =>
    fetch(url, {
      body: JSON.stringify({
        material_id: material.amigo_calculator_material_id,
        model_id: material.amigo_calculator_model_id,
        options_values: {},
        sizes: { height: item.heightMm, width: item.widthMm },
        uuid: '',
      }),
      cache: 'no-store',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
    }),
  );
  if (!response.ok) throw new Error('AMIGO_PRICE_UNAVAILABLE');
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > 65_536) throw new Error('AMIGO_PRICE_RESPONSE_INVALID');
  const responseText = await response.text();
  if (new TextEncoder().encode(responseText).byteLength > 65_536) {
    throw new Error('AMIGO_PRICE_RESPONSE_INVALID');
  }
  let responseBody: unknown;
  try {
    responseBody = JSON.parse(responseText) as unknown;
  } catch {
    throw new Error('AMIGO_PRICE_RESPONSE_INVALID');
  }
  const parsed = responseSchema.safeParse(responseBody);
  if (!parsed.success || (parsed.data.currency && parsed.data.currency !== 'RUB')) {
    throw new Error('AMIGO_PRICE_RESPONSE_INVALID');
  }
  const unitPriceKopecks = parsed.data.cost_currency * 100;
  if (!Number.isSafeInteger(unitPriceKopecks) || unitPriceKopecks <= 0) {
    throw new Error('AMIGO_PRICE_RESPONSE_INVALID');
  }
  const { error: insertError } = await client.from('amigo_calculation_cache').upsert({
    ...cacheKey,
    calculated_at: new Date().toISOString(),
    unit_price_kopecks: unitPriceKopecks,
  });
  if (insertError) throw new Error('PRICE_CACHE_WRITE_FAILED');
  return unitPriceKopecks;
}

export async function priceExactCart(
  client: AdminClient,
  items: readonly CartItem[],
  bySlug: ReadonlyMap<string, ExactMaterial>,
): Promise<ExactPricedItem[]> {
  const resolved = new Map<string, number>();
  const result: ExactPricedItem[] = [];
  for (const item of items) {
    const material = bySlug.get(item.materialSlug);
    if (!material) throw new Error('MATERIAL_NOT_AVAILABLE');
    const key = `${material.amigo_price_version}:${material.amigo_calculator_model_id}:${material.amigo_calculator_material_id}:${item.widthMm}:${item.heightMm}`;
    let unitPriceKopecks = resolved.get(key);
    if (unitPriceKopecks === undefined) {
      unitPriceKopecks = await calculateUnit(client, item, material);
      resolved.set(key, unitPriceKopecks);
    }
    result.push({
      ...item,
      article: material.article,
      calculatorMaterialId: material.amigo_calculator_material_id,
      calculatorModelId: material.amigo_calculator_model_id,
      name: material.name,
      priceSourceVersion: material.amigo_price_version,
      pricingStatus: 'KNOWN',
      totalPriceKopecks: unitPriceKopecks * item.quantity,
      unitPriceKopecks,
    });
  }
  return result;
}
