import Link from 'next/link';

import { requireCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebCatalogRead } from '../../../lib/catalog-runtime';
import { startManualCatalogSync } from '../catalog/actions';

export const dynamic = 'force-dynamic';

function moment(value: string | null): string {
  if (value === null) return 'Не завершён';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default async function CatalogSyncPage(): Promise<React.JSX.Element> {
  const principal = await requireCatalogAdminPrincipal();
  const overview = await getWebCatalogRead().getAdminOverview();
  const isOwner = principal.roles.includes('OWNER');

  return (
    <main className="sync-admin-page">
      <header className="business-page-heading">
        <div>
          <p>Источник, снимки и ручная публикация</p>
          <h1>Синхронизация AMIGO</h1>
        </div>
        <span>{overview.runs.length} запусков</span>
      </header>
      <div className="sync-admin-actions">
        <Link href="/admin/catalog#releases">Открыть diff и публикацию</Link>
        {isOwner ? (
          <form action={startManualCatalogSync}>
            <button type="submit">Запустить синхронизацию</button>
          </form>
        ) : null}
      </div>
      <section aria-label="История синхронизаций" className="sync-admin-grid">
        {overview.runs.length === 0 ? <p>Запусков синхронизации пока нет.</p> : null}
        {overview.runs.map((run) => (
          <article key={run.id}>
            <div>
              <strong>{run.sourceVersion ?? 'Версия источника не определена'}</strong>
              <small>
                {run.trigger} · {run.id.slice(0, 8)}
              </small>
            </div>
            <span>{run.status}</span>
            <span>
              {run.processedCount} / {run.discoveredCount}
            </span>
            <time>{moment(run.completedAt ?? run.createdAt)}</time>
          </article>
        ))}
      </section>
    </main>
  );
}
