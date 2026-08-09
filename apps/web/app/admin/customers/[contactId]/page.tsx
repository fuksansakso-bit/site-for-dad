import { randomUUID } from 'node:crypto';

import { CustomerContactStoreError } from '@project-name/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getWebCustomerContacts } from '../../../../lib/catalog-runtime';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../lib/request-admin-session';
import { addCustomerContactNote } from '../actions';

export const dynamic = 'force-dynamic';

const notices: Readonly<Record<string, string>> = {
  CUSTOMER_CONTACT_NOTE_ADDED: 'Внутренняя заметка добавлена.',
  CUSTOMER_CONTACT_INVALID_INPUT: 'Проверьте текст заметки.',
};

function moment(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

function money(value: number, status: string): string {
  if (status === 'PRICE_ON_REQUEST') return 'Уточняется';
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value / 100);
}

export default async function CustomerContactDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ readonly contactId: string }>;
  readonly searchParams: Promise<{ readonly notice?: string }>;
}): Promise<React.JSX.Element> {
  const contactId = (await params).contactId;
  const principal = await requireRequestAdminPrincipal();
  let contact;
  try {
    contact = await getWebCustomerContacts().getContact({
      actorId: principal.actorId,
      contactId,
      correlationId: `customer-contact-detail-${randomUUID()}`,
      role: requestAdminRole(principal),
    });
  } catch (error) {
    if (
      error instanceof CustomerContactStoreError &&
      ['CUSTOMER_CONTACT_NOT_FOUND', 'CUSTOMER_CONTACT_INVALID_INPUT'].includes(error.code)
    ) {
      notFound();
    }
    throw error;
  }
  const notice = (await searchParams).notice;

  return (
    <main className="customer-detail-page">
      <header className="customer-detail-heading">
        <div>
          <Link href="/admin/customers">← Все клиенты</Link>
          <p>Контакт из заявок</p>
          <h1>{contact.displayName}</h1>
        </div>
        <a href={`tel:${contact.phone}`}>{contact.phone}</a>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{notices[notice] ?? notice}</p>
      )}
      <div className="customer-detail-grid">
        <section>
          <h2>Контакт</h2>
          <dl>
            <div>
              <dt>Телефон</dt>
              <dd>{contact.phone}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{contact.email ?? 'Не предоставлен'}</dd>
            </div>
            <div>
              <dt>Населённый пункт</dt>
              <dd>{contact.locality ?? 'Не указан'}</dd>
            </div>
            <div>
              <dt>Заявок</dt>
              <dd>{contact.requestCount}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h2>Внутренние заметки</h2>
          <form action={addCustomerContactNote} className="request-admin-form">
            <input name="contactId" type="hidden" value={contact.id} />
            <label htmlFor="contact-note">Новая заметка</label>
            <textarea id="contact-note" maxLength={1000} name="body" required rows={4} />
            <button className="primary-button" type="submit">
              Добавить
            </button>
          </form>
          <div className="customer-note-list">
            {contact.notes.length === 0 ? <p>Заметок пока нет.</p> : null}
            {contact.notes.map((note) => (
              <article key={note.id}>
                <time>{moment(note.createdAt)}</time>
                <p>{note.body}</p>
                <small>Сотрудник {note.authorActorId.slice(0, 8)}</small>
              </article>
            ))}
          </div>
        </section>
        <section className="customer-request-history">
          <h2>История заявок</h2>
          {contact.requests.length === 0 ? <p>Связанных заявок нет.</p> : null}
          {contact.requests.map((request) => (
            <Link href={`/admin/requests/${request.requestNumber}`} key={request.requestNumber}>
              <strong>{request.requestNumber}</strong>
              <span>{request.status}</span>
              <span>{money(request.knownSubtotalKopecks, request.pricingStatus)}</span>
              <time>{moment(request.createdAt)}</time>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
