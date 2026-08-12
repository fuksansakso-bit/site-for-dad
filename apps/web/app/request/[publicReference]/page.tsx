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
};
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
      'material_name_snapshot,article_snapshot,width_mm,height_mm,quantity,unit_price_kopecks,total_price_kopecks,pricing_status',
    )
    .eq('order_id', order.id)
    .order('created_at');
  if (!data?.length) notFound();
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
  );
  return (
    <section className="shell">
      <p className="eyebrow">Заявка сохранена</p>
      <h1>{order.request_number}</h1>
      <div className="grid">
        {items.map((item, index) => (
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
          </article>
        ))}
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
        Мы подготовим текст, но не утверждаем, что сообщение отправлено или доставлено.
      </p>
      <Link href="/catalog">Вернуться в каталог</Link>
    </section>
  );
}
