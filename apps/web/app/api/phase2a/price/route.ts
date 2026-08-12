import { NextResponse } from 'next/server';

import { priceExactCart, type ExactMaterial } from '../../../../lib/phase2a/amigo-pricing';
import {
  allowRequest,
  isTrustedSameOrigin,
  readJsonBody,
} from '../../../../lib/phase2a/request-security';
import { cartSchema } from '../../../../lib/phase2a/schemas';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';

export async function POST(request: Request) {
  if (!isTrustedSameOrigin(request)) {
    return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 });
  }
  if (!allowRequest(request, 'price')) {
    return NextResponse.json(
      { message: 'Слишком много расчётов. Попробуйте позже.' },
      { headers: { 'Retry-After': '600' }, status: 429 },
    );
  }
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    const tooLarge = error instanceof Error && error.message === 'REQUEST_TOO_LARGE';
    return NextResponse.json(
      { message: tooLarge ? 'Запрос слишком большой.' : 'Некорректный запрос.' },
      { status: tooLarge ? 413 : 400 },
    );
  }
  const parsed = cartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Проверьте размеры и количество.' }, { status: 400 });
  }
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { message: 'Расчёт временно недоступен: Supabase не подключён.' },
      { status: 503 },
    );
  }
  const { data: activeVersion, error: versionError } = await client
    .from('amigo_price_versions')
    .select('source_version')
    .eq('is_active', true)
    .maybeSingle();
  if (versionError || !activeVersion) {
    return NextResponse.json(
      { message: 'Активная версия цен AMIGO временно недоступна.' },
      { status: 503 },
    );
  }
  const slugs = [...new Set(parsed.data.map((item) => item.materialSlug))];
  const { data, error } = await client
    .from('materials')
    .select(
      'id,category_id,name,slug,article,description,color_name,normalized_color,material_type,price_per_m2_kopecks,fixed_price_kopecks,minimum_price_kopecks,pricing_mode,availability,primary_image_path,amigo_price_version,amigo_calculator_origin,amigo_calculator_model_id,amigo_calculator_material_id,categories!inner(is_published)',
    )
    .in('slug', slugs)
    .eq('is_published', true)
    .eq('categories.is_published', true)
    .eq('amigo_price_version', activeVersion.source_version)
    .eq('amigo_mapping_status', 'READY');
  if (error || !data || data.length !== slugs.length) {
    return NextResponse.json(
      { message: 'Один из материалов больше не доступен.' },
      { status: 409 },
    );
  }
  const exact = (data as unknown as ExactMaterial[]).filter(
    (material) => material.pricing_mode === 'AMIGO_EXACT',
  );
  if (exact.length !== slugs.length) {
    return NextResponse.json(
      { message: 'Для выбранного материала нет точной цены AMIGO.' },
      { status: 409 },
    );
  }
  const bySlug = new Map(exact.map((material) => [material.slug, material]));
  let items;
  try {
    items = await priceExactCart(client, parsed.data, bySlug);
  } catch {
    return NextResponse.json(
      { message: 'Точная цена AMIGO временно недоступна. Повторите расчёт немного позже.' },
      { status: 503 },
    );
  }
  const knownTotalKopecks = items.reduce((sum, item) => sum + item.totalPriceKopecks, 0);
  return NextResponse.json({
    items,
    knownTotalKopecks,
    pricingStatus: 'KNOWN',
  });
}
