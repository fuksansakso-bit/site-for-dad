import { randomUUID } from 'node:crypto';
import Link from 'next/link';

import { readCatalogAdminPrincipal } from '../../lib/catalog-admin-session';
import { getWebCatalogRead, getWebPricing, getWebRequests } from '../../lib/catalog-runtime';
import { requireRequestAdminPrincipal, requestAdminRole } from '../../lib/request-admin-session';

export const dynamic = 'force-dynamic';

function formatMoment(value: string | null): string {
  if (value === null) return 'Нет данных';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default async function BusinessDashboardPage(): Promise<React.JSX.Element> {
  const principal = await requireRequestAdminPrincipal();
  const role = requestAdminRole(principal);
  const catalogPrincipal = await readCatalogAdminPrincipal();
  const requestsPromise = getWebRequests().listAdminRequests({
    actorId: principal.actorId,
    correlationId: `business-dashboard-${randomUUID()}`,
    page: 1,
    pageSize: 6,
    role,
    status: null,
  });
  const [requests, catalog, pricing] = await Promise.all([
    requestsPromise,
    catalogPrincipal === null ? null : getWebCatalogRead().getAdminOverview(),
    catalogPrincipal === null ? null : getWebPricing().getAdminOverview(),
  ]);
  const activePrice = pricing?.versions.find((item) => item.id === pricing.activePriceVersionId);
  const latestRun = catalog?.releases[0] ?? null;

  return (
    <main className="business-dashboard">
      <header className="business-page-heading">
        <div>
          <p>Сегодня в работе</p>
          <h1>Обзор бизнеса</h1>
        </div>
        <span>{formatMoment(new Date().toISOString())}</span>
      </header>

      <section aria-label="Основные показатели" className="business-metric-grid">
        <article>
          <span>Заявки</span>
          <strong>{requests.totalCount}</strong>
          <Link href="/admin/requests">Открыть очередь</Link>
        </article>
        <article>
          <span>Последняя заявка</span>
          <strong>{requests.items[0]?.requestNumber ?? '—'}</strong>
          <small>{formatMoment(requests.items[0]?.createdAt ?? null)}</small>
        </article>
        <article>
          <span>Версия цены</span>
          <strong>{activePrice === undefined ? '—' : `#${activePrice.versionNumber}`}</strong>
          <small>{activePrice?.status ?? 'Нет активной версии'}</small>
        </article>
        <article>
          <span>AMIGO</span>
          <strong>{latestRun?.catalogStatus ?? '—'}</strong>
          <small>
            {latestRun === null ? 'Нет запусков' : `${latestRun.variantCount} материалов`}
          </small>
        </article>
      </section>

      <section className="business-dashboard-section">
        <div className="business-section-heading">
          <div>
            <p>Операционная очередь</p>
            <h2>Последние заявки</h2>
          </div>
          <Link href="/admin/requests">Все заявки</Link>
        </div>
        <div className="business-request-table">
          {requests.items.length === 0 ? <p>Новых заявок пока нет.</p> : null}
          {requests.items.map((item) => (
            <Link href={`/admin/requests/${item.requestNumber}`} key={item.requestNumber}>
              <strong>{item.requestNumber}</strong>
              <span>{item.contactName}</span>
              <span>{item.locality}</span>
              <span>{item.status}</span>
              <time>{formatMoment(item.createdAt)}</time>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
