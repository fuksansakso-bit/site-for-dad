import { randomUUID } from 'node:crypto';

import { requestNumberSchema } from '@project-name/contracts/request';
import { RequestStoreError } from '@project-name/db';
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getWebCatalogSigningKey, getWebRequests } from '../../../../lib/catalog-runtime';
import {
  adminRequestDetailResponse,
  requestAdminOrigin,
} from '../../../../lib/request-admin-response';
import { readRequestAdminPrincipal, requestAdminRole } from '../../../../lib/request-admin-session';
import { addRequestNote, changeRequestStatus, revokeRequestPublicReference } from '../actions';
import { CopyPhoneButton } from '../copy-phone-button';

export const dynamic = 'force-dynamic';

const noticeLabels: Record<string, string> = {
  REQUEST_AUTHORIZATION: 'Переход статуса запрещён для этой роли.',
  REQUEST_CONFLICT: 'Заявка уже изменилась. Обновите страницу и повторите действие.',
  REQUEST_NOTE_ADDED: 'Внутренняя заметка добавлена.',
  REQUEST_PUBLIC_REFERENCE_REVOKED: 'Публичная ссылка отозвана.',
  REQUEST_STATUS_UPDATED: 'Статус заявки обновлён.',
};

const statusLabels = {
  CANCELLED: 'Отменена',
  CONFIRMED: 'Подтверждена',
  CONTACTED: 'Связались',
  IN_REVIEW: 'На рассмотрении',
  NEW: 'Новая',
} as const;

const eventLabels: Record<string, string> = {
  MESSAGE_COPIED: 'Сообщение скопировано',
  REQUEST_CREATED: 'Заявка создана',
  STATUS_CHANGED: 'Статус изменён',
  WHATSAPP_LINK_GENERATED: 'Ссылка WhatsApp сформирована',
  WHATSAPP_LINK_OPENED: 'Ссылка WhatsApp открыта',
};

function money(amount: number | null): string {
  if (amount === null) return 'Уточнит менеджер';
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  })
    .format(amount / 100)
    .replace(/\u00a0/gu, ' ');
}

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly requestNumber: string }>;
  readonly searchParams: Promise<{ readonly notice?: string }>;
}): Promise<React.JSX.Element> {
  const principal = await readRequestAdminPrincipal();
  if (principal === null) redirect('/admin/requests');
  const parsed = requestNumberSchema.safeParse((await params).requestNumber);
  if (!parsed.success) notFound();
  const correlationId = `request-admin-detail-${randomUUID()}`;
  let stored;
  try {
    stored = await getWebRequests().getAdminRequest({
      actorId: principal.actorId,
      correlationId,
      requestNumber: parsed.data,
      role: requestAdminRole(principal),
    });
  } catch (error) {
    if (error instanceof RequestStoreError && error.code === 'REQUEST_NOT_FOUND') notFound();
    throw error;
  }
  const requestHeaders = await headers();
  const request = adminRequestDetailResponse(
    stored,
    getWebCatalogSigningKey(),
    requestAdminOrigin(requestHeaders.get('host')),
    correlationId,
  );
  const notice = (await searchParams).notice;
  const role = requestAdminRole(principal);
  return (
    <main className="request-admin-shell">
      <header className="request-admin-header">
        <div>
          <Link href="/admin/requests">← Все заявки</Link>
          <p className="configurator-kicker">{statusLabels[request.status]}</p>
          <h1>{request.requestNumber}</h1>
        </div>
        <div className="actions">
          <CopyPhoneButton phone={request.contactPhone} />
          {request.publicSummaryHref === null ? null : (
            <Link className="secondary-button" href={request.publicSummaryHref} target="_blank">
              Публичное резюме
            </Link>
          )}
          {request.whatsappUrl === null ? null : (
            <a className="primary-link" href={request.whatsappUrl} rel="noreferrer" target="_blank">
              Открыть WhatsApp
            </a>
          )}
        </div>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{noticeLabels[notice] ?? notice}</p>
      )}

      <div className="request-admin-detail-grid">
        <section className="request-admin-panel">
          <h2>Контакт</h2>
          <dl className="request-admin-data">
            <div>
              <dt>Имя</dt>
              <dd>{request.contactName}</dd>
            </div>
            <div>
              <dt>Телефон</dt>
              <dd>{request.contactPhone}</dd>
            </div>
            <div>
              <dt>Населённый пункт</dt>
              <dd>{request.locality}</dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{request.address ?? 'Не указан'}</dd>
            </div>
            <div>
              <dt>Бесплатный замер</dt>
              <dd>{request.measurementRequested ? 'Нужен' : 'Не отмечен'}</dd>
            </div>
            <div>
              <dt>Рассрочка</dt>
              <dd>
                {request.installmentInterest
                  ? 'Интересует, условия сообщает менеджер'
                  : 'Не отмечена'}
              </dd>
            </div>
          </dl>
          {request.comment === null ? null : (
            <p className="request-admin-comment">{request.comment}</p>
          )}
        </section>

        <section className="request-admin-panel">
          <h2>Обработка</h2>
          <form action={changeRequestStatus} className="request-admin-form">
            <input name="requestNumber" type="hidden" value={request.requestNumber} />
            <input name="expectedVersion" type="hidden" value={request.version} />
            <label htmlFor="request-status">Статус</label>
            <select defaultValue={request.status} id="request-status" name="status">
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="primary-button" type="submit">
              Сохранить статус
            </button>
          </form>
          <form action={changeRequestStatus}>
            <input name="requestNumber" type="hidden" value={request.requestNumber} />
            <input name="expectedVersion" type="hidden" value={request.version} />
            <input name="status" type="hidden" value="CANCELLED" />
            <button className="secondary-button" type="submit">
              Отменить заявку
            </button>
          </form>
          {role === 'MANAGER' || request.publicReferenceRevokedAt !== null ? null : (
            <form action={revokeRequestPublicReference}>
              <input name="requestNumber" type="hidden" value={request.requestNumber} />
              <button className="secondary-button" type="submit">
                Отозвать публичную ссылку
              </button>
            </form>
          )}
          {request.publicReferenceRevokedAt === null ? null : <p>Публичная ссылка отозвана.</p>}
        </section>

        <section className="request-admin-panel request-admin-items">
          <h2>Позиции</h2>
          {request.snapshot.items.map((item, index) => (
            <article key={item.itemReference}>
              <strong>
                {index + 1}. {item.product.family} · {item.product.system}
              </strong>
              <p>
                {item.product.model} · {item.product.material}, арт. {item.product.materialArticle}
              </p>
              <p>
                {item.product.widthMm ?? '—'} × {item.product.heightMm ?? '—'} мм ·{' '}
                {item.product.quantity} шт.
              </p>
              <p>
                {item.pricingStatus === 'PRICE_ON_REQUEST'
                  ? 'Стоимость уточнит менеджер'
                  : item.pricingStatus === 'MANUAL_REVIEW_REQUIRED'
                    ? 'Размер требует проверки'
                    : money(item.quantityTotalKopecks)}
              </p>
            </article>
          ))}
          <strong className="request-known-total">
            {request.pricingStatus === 'PRICE_ON_REQUEST'
              ? 'Стоимость уточняется'
              : money(request.knownSubtotalKopecks)}
          </strong>
          {request.pricingStatus === 'PARTIALLY_PRICED' ? (
            <p>Часть стоимости уточнит менеджер.</p>
          ) : null}
        </section>

        <section className="request-admin-panel">
          <h2>Внутренние заметки</h2>
          <form action={addRequestNote} className="request-admin-form">
            <input name="requestNumber" type="hidden" value={request.requestNumber} />
            <label htmlFor="request-note">Новая заметка</label>
            <textarea id="request-note" maxLength={1000} name="body" required rows={4} />
            <button className="primary-button" type="submit">
              Добавить заметку
            </button>
          </form>
          <div className="request-admin-timeline">
            {request.notes.map((note) => (
              <article key={`${note.createdAt}-${note.body}`}>
                <time>{new Date(note.createdAt).toLocaleString('ru-RU')}</time>
                <p>{note.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="request-admin-panel">
          <h2>События связи</h2>
          <div className="request-admin-timeline">
            {request.communicationEvents.map((event) => (
              <article key={`${event.createdAt}-${event.type}`}>
                <time>{new Date(event.createdAt).toLocaleString('ru-RU')}</time>
                <p>{eventLabels[event.type] ?? event.type}</p>
              </article>
            ))}
          </div>
          <p>Открытие wa.me не означает отправку или доставку сообщения.</p>
        </section>
      </div>
    </main>
  );
}
