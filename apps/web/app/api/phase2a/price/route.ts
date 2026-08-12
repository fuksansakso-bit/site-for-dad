import { NextResponse } from 'next/server';

import { priceItem } from '../../../../lib/phase2a/pricing';
import {
  allowRequest,
  isTrustedSameOrigin,
  readJsonBody,
} from '../../../../lib/phase2a/request-security';
import { cartSchema } from '../../../../lib/phase2a/schemas';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';
import type { Material } from '../../../../lib/phase2a/types';

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
  const slugs = [...new Set(parsed.data.map((item) => item.materialSlug))];
  const { data, error } = await client
    .from('materials')
    .select(
      'id,category_id,name,slug,article,description,color_name,normalized_color,material_type,price_per_m2_kopecks,fixed_price_kopecks,minimum_price_kopecks,pricing_mode,availability,primary_image_path,categories!inner(is_published)',
    )
    .in('slug', slugs)
    .eq('is_published', true)
    .eq('categories.is_published', true);
  if (error || !data || data.length !== slugs.length) {
    return NextResponse.json(
      { message: 'Один из материалов больше не доступен.' },
      { status: 409 },
    );
  }
  const bySlug = new Map(
    (data as unknown as Material[]).map((material) => [material.slug, material]),
  );
  const items = parsed.data.map((item) => priceItem(item, bySlug.get(item.materialSlug)!));
  const knownTotalKopecks = items
    .filter((item) => item.totalPriceKopecks !== null)
    .reduce((sum, item) => sum + item.totalPriceKopecks!, 0);
  return NextResponse.json({
    items,
    knownTotalKopecks,
    pricingStatus: items.every((item) => item.pricingStatus === 'KNOWN')
      ? 'KNOWN'
      : knownTotalKopecks > 0
        ? 'PARTIAL'
        : 'MANUAL',
  });
}
