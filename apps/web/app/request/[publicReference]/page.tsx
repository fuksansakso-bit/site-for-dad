import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs, StatusBadge } from '../../../components/ui/primitives';
import { getSiteSettings } from '../../../lib/phase2a/data';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';
import type { PricedItem } from '../../../lib/phase2a/types';
import { createWhatsAppUrl } from '../../../lib/phase2a/whatsapp';
import { RequestActions } from './request-actions';

export const metadata: Metadata = {
  description: 'Безопасное резюме гостевой заявки без контактных данных клиента.',
  title: 'Заявка сохранена',
};

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

  const [{ data: order }, settings] = await Promise.all([
    client
      .from('orders')
      .select(
        'id,request_number,known_total_kopecks,pricing_status,measurement_requested,installment_interest',
      )
      .eq('public_reference', publicReference)
      .maybeSingle(),
    getSiteSettings(),
  ]);
  if (!order) notFound();

  const { data } = await client
    .from('order_items')
    .select(
      'material_name_snapshot,article_snapshot,width_mm,height_mm,quantity,unit_price_kopecks,total_price_kopecks,pricing_status,ai_visualization_job_id',
    )
    .eq('order_id', order.id)
    .order('created_at');
  if (!data?.length) notFound();

  const sourceItems = data as OrderItem[];
  const visualizationIds = sourceItems
    .map((item) => item.ai_visualization_job_id)
    .filter((value): value is string => Boolean(value));
  const visualizationById = new Map<
    string,
    { public_reference: string; status: string; deleted_at: string | null }
  >();
  if (visualizationIds.length > 0) {
    const { data: visualizations } = await client
      .from('ai_visualization_jobs')
      .select('id,public_reference,status,deleted_at')
      .in('id', visualizationIds);
    for (const visualization of visualizations ?? []) {
      visualizationById.set(visualization.id, visualization);
    }
  }

  const items = sourceItems.map((item): PricedItem => ({
    article: item.article_snapshot,
    heightMm: item.height_mm,
    materialSlug: 'snapshot',
    name: item.material_name_snapshot,
    pricingStatus: item.pricing_status,
    quantity: item.quantity,
    totalPriceKopecks: item.total_price_kopecks,
    unitPriceKopecks: item.unit_price_kopecks,
    widthMm: item.width_mm,
  }));
  const whatsApp = createWhatsAppUrl(
    order.request_number,
    items,
    order.pricing_status === 'KNOWN' ? order.known_total_kopecks : null,
    safeSummaryUrl(publicReference),
  );
  const freeServices = [
    settings?.free_measurement && 'замер',
    settings?.free_delivery && 'доставка',
    settings?.free_installation && 'установка',
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <section className="request-success-hero">
        <div>
          <span className="request-success-mark" aria-hidden="true">
            ✓
          </span>
          <p className="eyebrow">Заявка сохранена</p>
          <h1>{order.request_number}</h1>
          <p>
            Мастер получил структурированную заявку. Теперь вы можете открыть подготовленное
            сообщение в WhatsApp и начать диалог.
          </p>
        </div>
      </section>

      <section className="shell request-page-shell">
        <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: order.request_number }]} />
        <div className="request-layout">
          <div className="request-items">
            <div className="request-section-heading">
              <h2>Состав заявки</h2>
              <StatusBadge tone={order.pricing_status === 'KNOWN' ? 'success' : 'warning'}>
                {order.pricing_status === 'KNOWN' ? 'Цена рассчитана' : 'Есть цена по запросу'}
              </StatusBadge>
            </div>
            {items.map((item, index) => {
              const source = sourceItems[index];
              const visualization = source?.ai_visualization_job_id
                ? visualizationById.get(source.ai_visualization_job_id)
                : undefined;
              const visualizationAvailable = Boolean(
                visualization && visualization.status === 'SUCCEEDED' && !visualization.deleted_at,
              );
              return (
                <article className="request-item" key={`${item.article}-${index}`}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p>{item.article}</p>
                    <h3>{item.name}</h3>
                    <dl>
                      <div>
                        <dt>Размер</dt>
                        <dd>
                          {item.widthMm} × {item.heightMm} мм
                        </dd>
                      </div>
                      <div>
                        <dt>Количество</dt>
                        <dd>{item.quantity} шт.</dd>
                      </div>
                      <div>
                        <dt>Стоимость</dt>
                        <dd>
                          {item.totalPriceKopecks === null
                            ? 'Цена не была сохранена'
                            : formatMoney(item.totalPriceKopecks)}
                        </dd>
                      </div>
                    </dl>
                    {visualizationAvailable && visualization ? (
                      <Link href={`/visualizer/${visualization.public_reference}`}>
                        Открыть AI-визуализацию
                      </Link>
                    ) : source?.ai_visualization_job_id ? (
                      <p className="request-expired-note">AI-визуализация больше недоступна.</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="request-summary-card">
            <p className="eyebrow">Предварительный итог</p>
            <strong>
              {order.known_total_kopecks === null
                ? 'Цена не была сохранена'
                : formatMoney(order.known_total_kopecks)}
            </strong>
            {order.pricing_status !== 'KNOWN' && (
              <p>Известная сумма не включает позиции с ручным расчётом.</p>
            )}
            <dl>
              {order.measurement_requested && (
                <div>
                  <dt>Замер</dt>
                  <dd>Запрошен</dd>
                </div>
              )}
              {order.installment_interest && (
                <div>
                  <dt>Рассрочка</dt>
                  <dd>Интерес отмечен</dd>
                </div>
              )}
              {freeServices.length > 0 && (
                <div>
                  <dt>Бесплатно</dt>
                  <dd>{freeServices.join(', ')}</dd>
                </div>
              )}
              <div>
                <dt>Изготовление</dt>
                <dd>{settings?.lead_time_text || '2–7 календарных дней'}</dd>
              </div>
              <div>
                <dt>Гарантия</dt>
                <dd>{settings?.warranty_text || '12 месяцев'}</dd>
              </div>
            </dl>
            <RequestActions whatsAppHref={whatsApp} />
            <p className="request-whatsapp-note">
              Сайт только подготовит текст и откроет WhatsApp. Отправку и доставку сообщения вы
              подтверждаете самостоятельно.
            </p>
          </aside>
        </div>
        <Link className="request-back-link" href="/catalog">
          Вернуться в каталог
        </Link>
      </section>
    </>
  );
}
