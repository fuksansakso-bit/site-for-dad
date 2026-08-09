import { randomUUID } from 'node:crypto';

import Link from 'next/link';

import { requireBusinessAdminPrincipal } from '../../../lib/business-admin-session';
import { getWebBusinessAdministration } from '../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

function pageNumber(value: string | undefined): number {
  const parsed = Number(value ?? '1');
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100_000 ? parsed : 1;
}

function link(action: string, outcome: string, page: number): string {
  const query = new URLSearchParams();
  if (action !== '') query.set('action', action);
  if (outcome !== '') query.set('outcome', outcome);
  if (page > 1) query.set('page', String(page));
  return query.size === 0 ? '/admin/audit' : `/admin/audit?${query.toString()}`;
}

export default async function AuditLogPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly action?: string;
    readonly outcome?: string;
    readonly page?: string;
  }>;
}): Promise<React.JSX.Element> {
  const query = await searchParams;
  const action = (query.action ?? '').trim().slice(0, 128);
  const outcome = ['FAILED', 'SUCCEEDED'].includes(query.outcome ?? '')
    ? (query.outcome as 'FAILED' | 'SUCCEEDED')
    : '';
  const page = pageNumber(query.page);
  const { principal, role } = await requireBusinessAdminPrincipal();
  const result = await getWebBusinessAdministration().listAuditEvents({
    action,
    actorId: principal.actorId,
    correlationId: `audit-list-${randomUUID()}`,
    outcome,
    page,
    pageSize: 50,
    role,
  });
  const pageCount = Math.max(1, Math.ceil(result.totalCount / result.pageSize));
  return (
    <main className="audit-admin-page">
      <header className="business-page-heading">
        <div>
          <p>Без секретов и сырой PII</p>
          <h1>Журнал действий</h1>
        </div>
        <span>{result.totalCount} событий</span>
      </header>
      <form action="/admin/audit" className="audit-filter-form" method="get">
        <label>
          Действие
          <input defaultValue={action} maxLength={128} name="action" type="search" />
        </label>
        <label>
          Результат
          <select defaultValue={outcome} name="outcome">
            <option value="">Все</option>
            <option value="SUCCEEDED">Успешно</option>
            <option value="FAILED">Ошибка</option>
          </select>
        </label>
        <button type="submit">Применить</button>
      </form>
      <div className="audit-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Время</th>
              <th>Действие</th>
              <th>Результат</th>
              <th>Кто</th>
              <th>Объект</th>
              <th>Причина</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((event) => (
              <tr key={event.id}>
                <td>{new Date(event.occurredAt).toLocaleString('ru-RU')}</td>
                <td>{event.action}</td>
                <td>{event.outcome}</td>
                <td>
                  {event.actorType}
                  {event.actorIdentityId === null ? '' : ` · ${event.actorIdentityId.slice(0, 8)}`}
                </td>
                <td>
                  {event.targetType ?? '—'}
                  {event.targetId === null ? '' : ` · ${event.targetId.slice(0, 18)}`}
                </td>
                <td>{event.reasonCode ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount <= 1 ? null : (
        <nav aria-label="Страницы журнала" className="request-admin-pagination">
          {page > 1 ? <Link href={link(action, outcome, page - 1)}>← Назад</Link> : <span />}
          <span>
            Страница {page} из {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={link(action, outcome, page + 1)}>Вперёд →</Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
