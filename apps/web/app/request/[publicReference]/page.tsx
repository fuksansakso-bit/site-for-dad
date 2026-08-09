import { randomUUID } from 'node:crypto';

import { requestPublicReferenceSchema } from '@project-name/contracts/request';
import { RequestStoreError } from '@project-name/db';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getWebBusinessAdministration, getWebRequests } from '../../../lib/catalog-runtime';
import { enforcePublicRequestReadAddress } from '../../../lib/request-route';
import { publicRequestSummaryResponse } from '../../../lib/request-summary';
import { RequestPreviewImage } from './request-preview-image';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Безопасное резюме заявки без контактных данных.',
  robots: { follow: false, index: false, nocache: true },
  title: 'Резюме заявки · PROJECT_NAME',
};

function money(kopecks: number | null): string {
  if (kopecks === null) return 'Стоимость уточнит менеджер';
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  })
    .format(kopecks / 100)
    .replace(/\u00a0/gu, ' ');
}

export default async function PublicRequestPage({
  params,
}: {
  readonly params: Promise<{ readonly publicReference: string }>;
}): Promise<React.JSX.Element> {
  const candidate = (await params).publicReference;
  const parsed = requestPublicReferenceSchema.safeParse(candidate);
  if (!parsed.success) notFound();
  const requestHeaders = await headers();
  try {
    enforcePublicRequestReadAddress(
      requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'direct-page',
    );
  } catch {
    notFound();
  }
  let source;
  try {
    source = await getWebRequests().getPublicSummary(parsed.data);
  } catch (error) {
    if (error instanceof RequestStoreError && error.code === 'REQUEST_NOT_FOUND') notFound();
    throw error;
  }
  const settings = await getWebBusinessAdministration().getActiveSettings();
  const request = publicRequestSummaryResponse(source, parsed.data, randomUUID(), settings);
  return (
    <main className="request-summary-shell">
      <header className="request-summary-header">
        <Link className="configurator-brand" href="/catalog" aria-label="Вернуться в каталог">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Без контактных данных</p>
      </header>

      <div className="request-summary-layout">
        <section className="request-summary-main" aria-labelledby="request-title">
          <p className="configurator-kicker">{request.statusLabel}</p>
          <h1 id="request-title">Заявка {request.requestNumber}</h1>
          <p className="request-summary-lead">
            Состав и цена зафиксированы на момент отправки. Расчёт предварительный — итоговую
            стоимость подтвердит менеджер, при необходимости после бесплатного замера.
          </p>

          <div className="request-summary-items">
            {request.items.map((item) => (
              <article className="request-summary-item" key={item.sequence}>
                {item.previewAssetHref === null ? (
                  <div className="request-preview-fallback">Стандартная примерка не сохранена</div>
                ) : (
                  <RequestPreviewImage
                    alt={`Примерка: ${item.product.family}, ${item.product.material}`}
                    src={item.previewAssetHref}
                  />
                )}
                <div className="request-summary-item-copy">
                  <span className="request-item-number">Изделие {item.sequence}</span>
                  <h2>
                    {item.product.family} · {item.product.system}
                  </h2>
                  <p>
                    {item.product.model} · {item.product.material}, арт.{' '}
                    {item.product.materialArticle}
                  </p>
                  <dl>
                    <div>
                      <dt>Размер</dt>
                      <dd>
                        {item.product.widthMm === null || item.product.heightMm === null
                          ? 'Уточнит мастер'
                          : `${item.product.widthMm} × ${item.product.heightMm} мм`}
                      </dd>
                    </div>
                    <div>
                      <dt>Количество</dt>
                      <dd>{item.product.quantity} шт.</dd>
                    </div>
                    <div>
                      <dt>Статус</dt>
                      <dd>{item.pricingLabel}</dd>
                    </div>
                    <div>
                      <dt>Стоимость</dt>
                      <dd>{money(item.quantityTotalKopecks)}</dd>
                    </div>
                  </dl>
                  {item.minimumPriceApplied ? (
                    <p className="request-note">Применена минимальная цена изделия.</p>
                  ) : null}
                  {item.warnings.map((warning) => (
                    <p className="request-note" key={warning}>
                      {warning}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="request-summary-aside" aria-label="Итог заявки">
          <h2>Предварительный итог</h2>
          <dl className="request-total-lines">
            <div>
              <dt>Изделия</dt>
              <dd>{money(request.summary.knownProductsKopecks)}</dd>
            </div>
            <div>
              <dt>Дополнительные опции</dt>
              <dd>{money(request.summary.knownOptionsKopecks)}</dd>
            </div>
            <div>
              <dt>Замер</dt>
              <dd>{request.services.measurement}</dd>
            </div>
            <div>
              <dt>Доставка</dt>
              <dd>{request.services.delivery}</dd>
            </div>
            <div>
              <dt>Установка</dt>
              <dd>{request.services.installation}</dd>
            </div>
          </dl>
          <strong className="request-known-total">
            {request.summary.pricedItemCount === 0
              ? 'Стоимость уточнит менеджер'
              : money(request.summary.knownSubtotalKopecks)}
          </strong>
          {request.summary.unknownItemCount > 0 ? (
            <p>Часть стоимости уточнит менеджер: {request.summary.unknownItemCount} поз.</p>
          ) : null}
          <hr />
          <p>Изготовление: {request.manufacturingLeadTime}</p>
          <p>Гарантия: {request.warranty}</p>
          {request.measurementRequested ? <p>Бесплатный замер запрошен.</p> : null}
          {request.installmentInterest ? <p>{request.installmentText}</p> : null}
          <Link className="primary-link" href="/catalog">
            Вернуться в каталог
          </Link>
        </aside>
      </div>
    </main>
  );
}
