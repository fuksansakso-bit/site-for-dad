import { randomUUID } from 'node:crypto';

import { requestStatusSchema, type RequestStatus } from '@project-name/contracts/request';
import Link from 'next/link';

import { getWebRequests } from '../../../lib/catalog-runtime';
import { requestAdminRole, requireRequestAdminPrincipal } from '../../../lib/request-admin-session';

export const dynamic = 'force-dynamic';

const notices: Record<string, string> = {
  IDENTITY_PERMISSION_DENIED: 'Для просмотра заявок нужна роль MANAGER, ADMIN или OWNER.',
};

const statusLabels: Readonly<Record<RequestStatus, string>> = {
  CANCELLED: 'Отменённые',
  CONFIRMED: 'Подтверждённые',
  CONTACTED: 'Связались',
  IN_REVIEW: 'На рассмотрении',
  NEW: 'Новые',
};

function positivePage(value: string | undefined): number {
  const parsed = Number(value ?? '1');
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : 1;
}

function requestListHref(status: RequestStatus | null, page = 1): string {
  const query = new URLSearchParams();
  if (status !== null) query.set('status', status);
  if (page > 1) query.set('page', String(page));
  return query.size === 0 ? '/admin/requests' : `/admin/requests?${query.toString()}`;
}

function money(amount: number, pricingStatus: string): string {
  if (pricingStatus === 'PRICE_ON_REQUEST') return 'Уточняется';
  const formatted = new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  })
    .format(amount / 100)
    .replace(/\u00a0/gu, ' ');
  return pricingStatus === 'PARTIALLY_PRICED' ? `${formatted} + уточнение` : formatted;
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly notice?: string;
    readonly page?: string;
    readonly status?: string;
  }>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const notice = query.notice;
  const page = positivePage(query.page);
  const parsedStatus = requestStatusSchema.safeParse(query.status);
  const status = parsedStatus.success ? parsedStatus.data : null;
  const principal = await requireRequestAdminPrincipal();

  const list = await getWebRequests().listAdminRequests({
    actorId: principal.actorId,
    correlationId: `request-admin-page-${randomUUID()}`,
    page,
    pageSize: 25,
    role: requestAdminRole(principal),
    status,
  });
  const pageCount = Math.max(1, Math.ceil(list.totalCount / list.pageSize));
  return (
    <main className="request-admin-shell">
      <header className="request-admin-header">
        <div>
          <p className="configurator-kicker">Приём заявок · {requestAdminRole(principal)}</p>
          <h1>Заявки</h1>
          <p>Найдено: {list.totalCount}. Контакт и история обращений доступны сотрудникам.</p>
        </div>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{notices[notice] ?? notice}</p>
      )}
      <nav aria-label="Фильтр заявок" className="request-admin-filters">
        <Link aria-current={status === null ? 'page' : undefined} href={requestListHref(null)}>
          Все
        </Link>
        {Object.entries(statusLabels).map(([value, label]) => (
          <Link
            aria-current={status === value ? 'page' : undefined}
            href={requestListHref(value as RequestStatus)}
            key={value}
          >
            {label}
          </Link>
        ))}
      </nav>
      <section className="request-admin-list" aria-label="Список заявок">
        {list.items.length === 0 ? <p>Заявок пока нет.</p> : null}
        {list.items.map((request) => (
          <article className="request-admin-row" key={request.requestNumber}>
            <div>
              <strong>{request.requestNumber}</strong>
              <span>{new Date(request.createdAt).toLocaleString('ru-RU')}</span>
            </div>
            <div>
              <strong>{request.contactName}</strong>
              <span>{request.contactPhone}</span>
            </div>
            <div>
              <strong>{request.locality}</strong>
              <span>
                {request.itemCount} поз. · {request.totalQuantity} шт.
              </span>
            </div>
            <div>
              <strong>{money(request.knownSubtotalKopecks, request.pricingStatus)}</strong>
              <span>
                {request.measurementRequested ? 'Замер' : 'Без замера'} ·{' '}
                {request.installmentInterest ? 'Рассрочка' : 'Без рассрочки'}
              </span>
            </div>
            <div>
              <strong>{request.status}</strong>
              <Link className="primary-link" href={`/admin/requests/${request.requestNumber}`}>
                Открыть
              </Link>
            </div>
          </article>
        ))}
      </section>
      {pageCount <= 1 ? null : (
        <nav aria-label="Страницы заявок" className="request-admin-pagination">
          {page > 1 ? <Link href={requestListHref(status, page - 1)}>← Назад</Link> : <span />}
          <span>
            Страница {page} из {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={requestListHref(status, page + 1)}>Вперёд →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
