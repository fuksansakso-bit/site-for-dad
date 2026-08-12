import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { createWhatsAppUrl } from '../../../lib/phase2a/whatsapp';
import type { PricedItem } from '../../../lib/phase2a/types';
type OrderItem = {
  material_name_snapshot: string;
  article_snapshot: string;
  width_mm: number;
  height_mm: number;
  quantity: number;
  unit_price_kopecks: number | null;
  total_price_kopecks: number | null;
  pricing_status: 'KNOWN' | 'MANUAL';
  ai_visualization_job_id: string | null;
};

function safeSummaryUrl(publicReference: string): string | null {
  const configured = process.env['NEXT_PUBLIC_SITE_URL'];
  if (!configured) return null;
  try {
    const origin = new URL(configured);
    if (
      origin.protocol !== 'https:' &&
      origin.hostname !== '127.0.0.1' &&
      origin.hostname !== 'localhost'
    ) {
      return null;
    }
    return new URL(`/request/${publicReference}`, origin).toString();
  } catch {
    return null;
  }
}
export default async function RequestPage({
  params,
}: {
  params: Promise<{ publicReference: string }>;
}) {
  const { publicReference } = await params;
  if (!/^[0-9a-f]{48}$/.test(publicReference)) notFound();
  const client = createSupabaseAdminClient();
  if (!client) notFound();
  const { data: order } = await client
    .from('orders')
    .select(
      'id,request_number,known_total_kopecks,pricing_status,measurement_requested,installment_interest',
    )
    .eq('public_reference', publicReference)
    .maybeSingle();
  if (!order) notFound();
  const { data } = await client
    .from('order_items')
    .select(
      'material_name_snapshot,article_snapshot,width_mm,height_mm,quantity,unit_price_kopecks,total_price_kopecks,pricing_status,ai_visualization_job_id',
    )
    .eq('order_id', order.id)
    .order('created_at');
  if (!data?.length) notFound();
  const visualizationIds = (data as OrderItem[])
    .map((item) => item.ai_visualization_job_id)
    .filter((value): value is string => Boolean(value));
  const visualizationById = new Map<
    string,
    { public_reference: string; status: string; expires_at: string; deleted_at: string | null }
  >();
  if (visualizationIds.length > 0) {
    const { data: visualizations } = await client
      .from('ai_visualization_jobs')
      .select('id,public_reference,status,expires_at,deleted_at')
      .in('id', visualizationIds);
    for (const visualization of visualizations ?? []) {
      visualizationById.set(visualization.id, visualization);
    }
  }
  const items = (data as OrderItem[]).map((item): PricedItem => ({
    materialSlug: 'snapshot',
    widthMm: item.width_mm,
    heightMm: item.height_mm,
    quantity: item.quantity,
    name: item.material_name_snapshot,
    article: item.article_snapshot,
    pricingStatus: item.pricing_status,
    unitPriceKopecks: item.unit_price_kopecks,
    totalPriceKopecks: item.total_price_kopecks,
  }));
  const whatsApp = createWhatsAppUrl(
    order.request_number,
    items,
    order.pricing_status === 'KNOWN' ? order.known_total_kopecks : null,
    safeSummaryUrl(publicReference),
  );
  return (
    <section className="shell">
      <p className="eyebrow">Заявка сохранена</p>
      <h1>{order.request_number}</h1>
      <div className="grid">
        {items.map((item, index) => {
          const source = (data as OrderItem[])[index];
          const visualization = source?.ai_visualization_job_id
            ? visualizationById.get(source.ai_visualization_job_id)
            : undefined;
          const visualizationAvailable = Boolean(
            visualization &&
              visualization.status === 'SUCCEEDED' &&
              !visualization.deleted_at,
          );
          return (
          <article className="card" key={index}>
            <h2>{item.name}</h2>
            <p>Артикул {item.article}</p>
            <p>
              {item.widthMm} × {item.heightMm} мм • {item.quantity} шт.
            </p>
            <p className="price">
              {item.totalPriceKopecks === null
                ? 'Стоимость уточнит менеджер'
                : formatMoney(item.totalPriceKopecks)}
            </p>
            {visualizationAvailable && visualization ? (
              <Link
                className="button secondary"
                href={`/visualizer/${visualization.public_reference}`}
              >
                Открыть AI-визуализацию
              </Link>
            ) : source?.ai_visualization_job_id ? (
              <p className="muted">AI-визуализация больше недоступна.</p>
            ) : null}
          </article>
          );
        })}
      </div>
      <p className="price">
        {order.known_total_kopecks === null
          ? 'Стоимость уточнит менеджер'
          : `Предварительная известная сумма: ${formatMoney(order.known_total_kopecks)}`}
      </p>
      <p>
        Замер, доставка и установка — бесплатно. Срок изготовления 2–7 дней. Гарантия 12 месяцев.
      </p>
      <a className="button" href={whatsApp} target="_blank" rel="noreferrer">
        Подготовить сообщение в WhatsApp
      </a>
      <p className="muted">
        Мы подготовим текст и безопасную ссылку на резюме заявки, но не утверждаем, что
        сообщение отправлено, доставлено или что изображение прикреплено автоматически.
      </p>
      <Link href="/catalog">Вернуться в каталог</Link>
    </section>
  );
}
