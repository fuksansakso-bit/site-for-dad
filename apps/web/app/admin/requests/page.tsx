import { randomUUID } from 'node:crypto';

import Link from 'next/link';

import { getWebRequests } from '../../../lib/catalog-runtime';
import { readRequestAdminPrincipal, requestAdminRole } from '../../../lib/request-admin-session';
import { signInRequestAdmin, signOutRequestAdmin } from './actions';

export const dynamic = 'force-dynamic';

const notices: Record<string, string> = {
  IDENTITY_AUTHENTICATION_REQUIRED: 'Ключ сессии не принят или истёк.',
  IDENTITY_PERMISSION_DENIED: 'Для просмотра заявок нужна роль MANAGER, ADMIN или OWNER.',
  REQUEST_ADMIN_SESSION_CLOSED: 'Административная сессия закрыта.',
  REQUEST_ADMIN_SESSION_OPENED: 'Административная сессия открыта.',
};

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
  readonly searchParams: Promise<{ readonly notice?: string }>;
}): Promise<React.JSX.Element> {
  const notice = (await searchParams).notice;
  const principal = await readRequestAdminPrincipal();
  if (principal === null) {
    return (
      <main className="request-admin-shell request-admin-login">
        <section className="request-admin-panel">
          <p className="configurator-kicker">Локальная административная сессия</p>
          <h1>Заявки клиентов</h1>
          {notice === undefined ? null : (
            <p className="request-admin-notice">{notices[notice] ?? notice}</p>
          )}
          <form action={signInRequestAdmin} className="request-admin-form">
            <label htmlFor="request-admin-token">Ключ OWNER / ADMIN / MANAGER</label>
            <input id="request-admin-token" name="token" required type="password" />
            <button className="primary-button" type="submit">
              Открыть сессию
            </button>
          </form>
          <Link href="/catalog">Вернуться в каталог</Link>
        </section>
      </main>
    );
  }

  const list = await getWebRequests().listAdminRequests({
    actorId: principal.actorId,
    correlationId: `request-admin-page-${randomUUID()}`,
    page: 1,
    pageSize: 50,
    role: requestAdminRole(principal),
    status: null,
  });
  return (
    <main className="request-admin-shell">
      <header className="request-admin-header">
        <div>
          <p className="configurator-kicker">Приём заявок · {requestAdminRole(principal)}</p>
          <h1>Заявки</h1>
          <p>Всего: {list.totalCount}. Это базовый список, не CRM.</p>
        </div>
        <form action={signOutRequestAdmin}>
          <button className="secondary-button" type="submit">
            Выйти
          </button>
        </form>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{notices[notice] ?? notice}</p>
      )}
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
    </main>
  );
}
