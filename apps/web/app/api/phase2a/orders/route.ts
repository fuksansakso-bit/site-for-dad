import { NextResponse } from 'next/server';

import { normalizeRussianPhone } from '../../../../lib/phase2a/phone';
import {
  allowRequest,
  isTrustedSameOrigin,
  readJsonBody,
} from '../../../../lib/phase2a/request-security';
import { checkoutSchema } from '../../../../lib/phase2a/schemas';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';
import { getAiGuestSession } from '../../../../lib/ai-visualization/session';

export async function POST(request: Request) {
  if (!isTrustedSameOrigin(request)) {
    return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 });
  }
  if (!allowRequest(request, 'order')) {
    return NextResponse.json(
      { message: 'Слишком много попыток. Попробуйте позже.' },
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
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: 'Проверьте обязательные поля.' }, { status: 400 });
  }
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json(
      { message: 'Заявки временно недоступны: Supabase не подключён.' },
      { status: 503 },
    );
  }
  let phone: string;
  try {
    phone = normalizeRussianPhone(parsed.data.customerPhone);
  } catch {
    return NextResponse.json({ message: 'Введите российский номер телефона.' }, { status: 400 });
  }
  const slugs = [...new Set(parsed.data.items.map((item) => item.materialSlug))];
  const { data: materials, error: materialError } = await client
    .from('materials')
    .select('id,slug,categories!inner(is_published)')
    .in('slug', slugs)
    .eq('is_published', true)
    .eq('categories.is_published', true);
  if (materialError || !materials || materials.length !== slugs.length) {
    return NextResponse.json(
      { message: 'Один из материалов больше не доступен.' },
      { status: 409 },
    );
  }
  const guest = await getAiGuestSession();
  const references = [
    ...new Set(
      parsed.data.items
        .map((item) => item.aiVisualizationPublicReference)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const visualizationByReference = new Map<string, { id: string; material_id: string }>();
  if (guest && references.length > 0) {
    const { data: visualizations, error: visualizationError } = await client
      .from('ai_visualization_jobs')
      .select('id,public_reference,material_id,status')
      .eq('guest_session_hash', guest.hash)
      .in('public_reference', references)
      .in('status', ['SUCCEEDED', 'EXPIRED', 'DELETED']);
    if (visualizationError) {
      return NextResponse.json(
        { message: 'Не удалось безопасно проверить AI-визуализацию. Попробуйте позже.' },
        { status: 503 },
      );
    }
    for (const visualization of visualizations ?? []) {
      visualizationByReference.set(visualization.public_reference, {
        id: visualization.id,
        material_id: visualization.material_id,
      });
    }
  }
  const materialBySlug = new Map((materials ?? []).map((material) => [material.slug, material.id]));
  const payload = {
    ...parsed.data,
    customerPhone: phone,
    aiGuestSessionHash: guest?.hash,
    items: parsed.data.items.map((item) => {
      const reference = item.aiVisualizationPublicReference;
      const visualization = reference ? visualizationByReference.get(reference) : undefined;
      const validVisualization =
        visualization && visualization.material_id === materialBySlug.get(item.materialSlug)
          ? visualization.id
          : undefined;
      return {
        heightMm: item.heightMm,
        materialSlug: item.materialSlug,
        quantity: item.quantity,
        widthMm: item.widthMm,
        ...(validVisualization ? { aiVisualizationJobId: validVisualization } : {}),
      };
    }),
  };
  const { data, error } = await client.rpc('create_order_from_server', { p_payload: payload });
  if (error || !data) {
    return NextResponse.json(
      { message: 'Не удалось сохранить заявку. Попробуйте позже.' },
      { status: 503 },
    );
  }
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
    status: 201,
  });
}
