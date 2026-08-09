import { randomUUID } from 'node:crypto';

import Link from 'next/link';

import { getWebCustomerContacts } from '../../../lib/catalog-runtime';
import { requestAdminRole, requireRequestAdminPrincipal } from '../../../lib/request-admin-session';

export const dynamic = 'force-dynamic';

function pageNumber(value: string | undefined): number {
  const parsed = Number(value ?? '1');
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : 1;
}

function href(query: string, page: number): string {
  const params = new URLSearchParams();
  if (query !== '') params.set('q', query);
  if (page > 1) params.set('page', String(page));
  return params.size === 0 ? '/admin/customers' : `/admin/customers?${params.toString()}`;
}

function moment(value: string | null): string {
  if (value === null) return 'Нет заявок';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default async function CustomerContactsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly page?: string; readonly q?: string }>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const q = (query.q ?? '').trim().slice(0, 120);
  const page = pageNumber(query.page);
  const principal = await requireRequestAdminPrincipal();
  const result = await getWebCustomerContacts().listContacts({
    actorId: principal.actorId,
    correlationId: `customer-contact-list-${randomUUID()}`,
    page,
    pageSize: 30,
    query: q,
    role: requestAdminRole(principal),
  });
  const pageCount = Math.max(1, Math.ceil(result.totalCount / result.pageSize));

  return (
    <main className="customer-admin-page">
      <header className="business-page-heading">
        <div>
          <p>CRM без аккаунтов</p>
          <h1>Клиенты</h1>
        </div>
        <span>{result.totalCount} контактов</span>
      </header>
      <p className="customer-admin-intro">
        Контакты собираются только из заявок. Здесь нет паролей, входа или клиентских сессий.
      </p>
      <form action="/admin/customers" className="customer-admin-search" method="get" role="search">
        <label htmlFor="customer-search">Имя, телефон, e-mail или населённый пункт</label>
        <div>
          <input defaultValue={q} id="customer-search" maxLength={120} name="q" type="search" />
          <button type="submit">Найти</button>
        </div>
      </form>
      <section aria-label="Контакты клиентов" className="customer-admin-list">
        {result.items.length === 0 ? <p>Контакты не найдены.</p> : null}
        {result.items.map((contact) => (
          <Link href={`/admin/customers/${contact.id}`} key={contact.id}>
            <div>
              <strong>{contact.displayName}</strong>
              <span>{contact.phone}</span>
            </div>
            <div>
              <span>{contact.locality ?? 'Населённый пункт не указан'}</span>
              <small>{contact.email ?? 'E-mail не предоставлен'}</small>
            </div>
            <div>
              <strong>{contact.requestCount}</strong>
              <span>{contact.requestCount === 1 ? 'заявка' : 'заявок'}</span>
            </div>
            <div>
              <span>{contact.lastRequestNumber ?? '—'}</span>
              <small>{moment(contact.lastRequestAt)}</small>
            </div>
          </Link>
        ))}
      </section>
      {pageCount <= 1 ? null : (
        <nav aria-label="Страницы контактов" className="request-admin-pagination">
          {page > 1 ? <Link href={href(q, page - 1)}>← Назад</Link> : <span />}
          <span>
            Страница {page} из {pageCount}
          </span>
          {page < pageCount ? <Link href={href(q, page + 1)}>Вперёд →</Link> : <span />}
        </nav>
      )}
    </main>
  );
}
