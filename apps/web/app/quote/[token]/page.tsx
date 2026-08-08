import { PricingStoreError } from '@project-name/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getWebPricing } from '../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

function money(minor: number | null): string {
  if (minor === null) return '—';
  return `${Math.trunc(minor / 100).toLocaleString('ru-RU')},${String(minor % 100).padStart(2, '0')} ₽`;
}

export default async function QuotePage({
  params,
}: {
  readonly params: Promise<{ token: string }>;
}): Promise<React.JSX.Element> {
  const { token } = await params;
  let quote;
  try {
    quote = await getWebPricing().getQuote(token);
  } catch (error) {
    if (error instanceof PricingStoreError && error.code === 'PRICING_NOT_FOUND') notFound();
    throw error;
  }
  const names = (quote.configuration['names'] ?? {}) as Record<string, unknown>;
  return (
    <main className="quote-shell">
      <article className="quote-card">
        <p className="configurator-kicker">
          Сохранено{' '}
          {new Intl.DateTimeFormat('ru-RU', {
            dateStyle: 'long',
            timeStyle: 'short',
            timeZone: 'Europe/Moscow',
          }).format(new Date(quote.createdAt))}
        </p>
        <h1>Предварительная стоимость</h1>
        <strong className="pricing-total">{money(quote.breakdown.grandTotalKopecks)}</strong>
        <p>
          {String(names['family'] ?? 'Жалюзи')} · {String(names['system'] ?? '')}
        </p>
        <dl>
          <dt>Модель</dt>
          <dd>{String(names['model'] ?? '—')}</dd>
          <dt>Материал</dt>
          <dd>
            {String(names['material'] ?? '—')} · арт. {String(names['materialArticle'] ?? '—')}
          </dd>
          <dt>Количество</dt>
          <dd>{quote.breakdown.quantity}</dd>
          <dt>Изделия</dt>
          <dd>{money(quote.breakdown.productsSubtotalKopecks)}</dd>
          <dt>Замер</dt>
          <dd>{money(quote.breakdown.measurementKopecks)}</dd>
          <dt>Доставка</dt>
          <dd>{money(quote.breakdown.deliveryKopecks)}</dd>
          <dt>Установка</dt>
          <dd>{money(quote.breakdown.installationKopecks)}</dd>
        </dl>
        <footer>
          <span>Версия каталога {quote.catalogVersionId.slice(0, 8)}</span>
          <span>Версия цены {quote.priceVersionId?.slice(0, 8) ?? '—'}</span>
        </footer>
        <Link className="configurator-next" href="/configure">
          Новый расчёт
        </Link>
      </article>
    </main>
  );
}
