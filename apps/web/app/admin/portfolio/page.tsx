import { randomUUID } from 'node:crypto';

import Link from 'next/link';

import { getWebPortfolio } from '../../../lib/catalog-runtime';
import { requestAdminRole, requireRequestAdminPrincipal } from '../../../lib/request-admin-session';
import { createPortfolioItem, hidePortfolioItem, publishPortfolioItem } from './actions';

export const dynamic = 'force-dynamic';

const notices: Readonly<Record<string, string>> = {
  PORTFOLIO_CONFLICT: 'Дождитесь обработки фото и проверьте подтверждение прав.',
  PORTFOLIO_IMAGE_ACCEPTED: 'Фото принято и обрабатывается в фоне.',
  PORTFOLIO_IMAGE_REJECTED: 'Фото отклонено. Используйте JPEG, PNG или WebP допустимого размера.',
  PORTFOLIO_INVALID_INPUT: 'Проверьте поля проекта.',
  PORTFOLIO_ITEM_CREATED: 'Проект создан.',
  PORTFOLIO_ITEM_HIDDEN: 'Проект скрыт с публичной страницы.',
  PORTFOLIO_ITEM_PUBLISHED: 'Проект опубликован.',
};

export default async function PortfolioAdministrationPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly notice?: string }>;
}): Promise<React.JSX.Element> {
  const principal = await requireRequestAdminPrincipal();
  const role = requestAdminRole(principal);
  const items = await getWebPortfolio().listAdminItems({
    actorId: principal.actorId,
    correlationId: `portfolio-admin-${randomUUID()}`,
    role,
  });
  const notice = (await searchParams).notice;

  return (
    <main className="portfolio-admin-page">
      <header className="business-page-heading">
        <div>
          <p>Локальные работы</p>
          <h1>Портфолио</h1>
        </div>
        <Link href="/portfolio" target="_blank">
          Открыть публичную страницу ↗
        </Link>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{notices[notice] ?? notice}</p>
      )}
      <details className="portfolio-create-panel">
        <summary>Добавить выполненную работу</summary>
        <form action={createPortfolioItem} className="portfolio-create-form">
          <label>
            Название
            <input maxLength={180} name="title" required />
          </label>
          <label>
            Адрес страницы латиницей
            <input maxLength={180} name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" required />
          </label>
          <label>
            Категория
            <input maxLength={120} name="category" required />
          </label>
          <label>
            Населённый пункт
            <input maxLength={160} name="locality" />
          </label>
          <label>
            Дата завершения
            <input name="completedOn" type="date" />
          </label>
          <label className="portfolio-wide-field">
            Описание
            <textarea maxLength={2000} minLength={10} name="description" required rows={4} />
          </label>
          <label className="portfolio-wide-field">
            Подтверждение прав на публикацию
            <textarea
              maxLength={1000}
              name="rightsEvidence"
              placeholder="Например: собственная съёмка выполненной работы, публикация разрешена владельцем объекта"
              required
              rows={3}
            />
          </label>
          <button className="primary-button" type="submit">
            Создать проект
          </button>
        </form>
      </details>
      <section className="portfolio-admin-list">
        {items.length === 0 ? <p>Проектов пока нет.</p> : null}
        {items.map((item) => (
          <article key={item.id}>
            <header>
              <div>
                <span>{item.status}</span>
                <h2>{item.title}</h2>
                <p>
                  {item.category} · {item.locality ?? 'Населённый пункт не указан'}
                </p>
              </div>
              <strong>{item.media.length} фото</strong>
            </header>
            <p>{item.description}</p>
            <div className="portfolio-media-statuses">
              {item.media.map((media) => (
                <span key={media.id}>
                  {media.safeName} · {media.width}×{media.height} · {media.status}
                </span>
              ))}
            </div>
            {['DRAFT', 'RIGHTS_REVIEW', 'READY_FOR_REVIEW'].includes(item.status) ? (
              <form
                action={`/api/v1/admin/portfolio/${item.id}/media`}
                className="portfolio-upload-form"
                encType="multipart/form-data"
                method="post"
              >
                <label>
                  Добавить JPEG, PNG или WebP
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    name="image"
                    required
                    type="file"
                  />
                </label>
                <button type="submit">Загрузить безопасно</button>
              </form>
            ) : null}
            <footer>
              <form action="/admin/portfolio" method="get">
                <button type="submit">Обновить статусы</button>
              </form>
              {role === 'MANAGER' || item.status !== 'READY_FOR_REVIEW' ? null : (
                <form action={publishPortfolioItem}>
                  <input name="itemId" type="hidden" value={item.id} />
                  <button className="primary-button" type="submit">
                    Опубликовать
                  </button>
                </form>
              )}
              {role === 'MANAGER' || item.status !== 'PUBLISHED' ? null : (
                <form action={hidePortfolioItem}>
                  <input name="itemId" type="hidden" value={item.id} />
                  <button type="submit">Скрыть</button>
                </form>
              )}
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
