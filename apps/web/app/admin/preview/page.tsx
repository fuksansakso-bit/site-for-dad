import Link from 'next/link';

import { readCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebStandardPreview } from '../../../lib/catalog-runtime';
import { signInCatalogAdmin, signOutCatalogAdmin } from '../catalog/actions';

export const dynamic = 'force-dynamic';

export default async function AdminPreviewPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ notice?: string }>;
}): Promise<React.JSX.Element> {
  const [principal, query] = await Promise.all([readCatalogAdminPrincipal(), searchParams]);
  if (principal === null) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <p className="overline">PHASE 1D · STANDARD PREVIEW</p>
          <h1>Диагностика примерки</h1>
          <p>Доступ разрешён только существующим локальным ролям OWNER и ADMIN.</p>
          {query.notice === undefined ? null : <p className="notice">{query.notice}</p>}
          <form action={signInCatalogAdmin} className="login-form">
            <label>
              Токен сессии
              <input autoComplete="off" name="token" required type="password" />
            </label>
            <button className="button button-ink" type="submit">
              Открыть
            </button>
          </form>
        </section>
      </main>
    );
  }
  const diagnostics = await getWebStandardPreview().getDiagnostics(principal.actorId);
  const qualityLabels = {
    EXACT_SWATCH: 'Точный образец',
    NORMALIZED_COLOR_ONLY: 'Только нормализованный цвет',
    PREVIEW_UNAVAILABLE: 'Недоступно',
    PRODUCT_IMAGE_CROP: 'Фрагмент изображения изделия',
  } as const;
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="overline">PHASE 1D · STANDARD PREVIEW</p>
          <h1>Диагностика примерки</h1>
        </div>
        <nav>
          <Link className="button" href="/admin/catalog">
            Каталог
          </Link>
          <Link className="button" href="/admin/pricing">
            Цены
          </Link>
          <Link className="button" href="/configure">
            Конфигуратор
          </Link>
          <form action={signOutCatalogAdmin}>
            <button className="button" type="submit">
              Выйти
            </button>
          </form>
        </nav>
      </header>
      <section className="admin-hero preview-admin-hero">
        <div>
          <p className="section-number">01 / ELIGIBILITY</p>
          <h2>{diagnostics.activePreviewableVariants} вариантов активной конфигурации</h2>
          <p>
            Диагностика читает только локальные PostgreSQL и object storage metadata; AMIGO не
            вызывается.
          </p>
        </div>
        <dl>
          <dt>Временных state</dt>
          <dd>{diagnostics.storedStates}</dd>
          <dt>Без CompatibilityRule</dt>
          <dd>{diagnostics.missingCompatibility}</dd>
          <dt>Без точного SWATCH</dt>
          <dd>{diagnostics.missingSwatch}</dd>
        </dl>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading">
          <p className="section-number">02 / ASSET QUALITY</p>
          <h2>Качество визуального источника</h2>
        </div>
        <div className="preview-diagnostics-grid">
          {Object.entries(qualityLabels).map(([quality, label]) => (
            <article key={quality}>
              <span>{quality}</span>
              <strong>{diagnostics.counts[quality as keyof typeof diagnostics.counts]}</strong>
              <p>{label}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading">
          <p className="section-number">03 / FAMILIES</p>
          <h2>Варианты по семействам</h2>
        </div>
        <div className="preview-diagnostics-grid">
          {Object.entries(diagnostics.familyCounts).map(([family, count]) => (
            <article key={family}>
              <span>{family}</span>
              <strong>{count}</strong>
              <p>Подтверждённых вариантов</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
