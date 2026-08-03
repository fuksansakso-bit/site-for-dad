import type { CatalogAdminRelease, CatalogAdminVariant } from '@project-name/catalog';
import Link from 'next/link';

import { readCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebCatalogRead } from '../../../lib/catalog-runtime';
import {
  activateCatalogRelease,
  approveCatalogRelease,
  prepareCatalogPublication,
  removeCatalogLocalPriceOverride,
  setCatalogLocalPriceOverride,
  signInCatalogAdmin,
  signOutCatalogAdmin,
  startManualCatalogSync,
  updateCatalogVariantOverlay,
} from './actions';

export const dynamic = 'force-dynamic';

interface AdminCatalogPageProps {
  readonly searchParams: Promise<{
    readonly notice?: string;
    readonly q?: string;
    readonly state?: string;
  }>;
}

const noticeMessages: Readonly<Record<string, string>> = {
  CATALOG_ACTIVATION_ACCEPTED: 'Активация принята в очередь. Статус обновится после проверки.',
  CATALOG_ADMIN_SESSION_CLOSED: 'Локальная административная сессия закрыта.',
  CATALOG_ADMIN_SESSION_OPENED: 'Локальная административная сессия открыта.',
  CATALOG_APPROVAL_ACCEPTED: 'Одобрение точной версии принято в очередь.',
  CATALOG_OVERLAY_UPDATED: 'Локальное решение для материала сохранено.',
  CATALOG_PRICE_OVERRIDE_REMOVED: 'Локальная цена снята; исходная цена AMIGO сохранена.',
  CATALOG_PRICE_OVERRIDE_SET: 'Локальная цена сохранена отдельно от исходной цены AMIGO.',
  CATALOG_PUBLICATION_PREPARED: 'Публикационный состав зафиксирован и готов к одобрению.',
  CATALOG_SYNC_ACCEPTED: 'Ручная синхронизация принята в очередь.',
  IDENTITY_AUTHENTICATION_REQUIRED: 'Ключ сессии не принят или истёк.',
  IDENTITY_PERMISSION_DENIED: 'Для этой операции недостаточно роли.',
};

function formatInstant(value: string | null): string {
  if (value === null) return 'не завершён';
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

function formatMinor(amount: number | null, currency: string | null): string {
  if (amount === null || currency === null) return 'по запросу';
  const absolute = Math.abs(amount);
  const whole = Math.floor(absolute / 100).toLocaleString('ru-RU');
  const fraction = String(absolute % 100).padStart(2, '0');
  return `${amount < 0 ? '−' : ''}${whole},${fraction} ${currency}`;
}

function shortId(value: string | null): string {
  return value === null ? '—' : `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function statusTone(status: string | null): 'bad' | 'good' | 'quiet' | 'warn' {
  if (status === null || ['UNREVIEWED', 'DRAFT', 'QUEUED'].includes(status)) return 'quiet';
  if (['ACTIVE', 'APPROVED', 'COMPLETED', 'PUBLISHED', 'VISIBLE'].includes(status)) return 'good';
  if (['FAILED', 'REJECTED', 'HIDDEN', 'OUT_OF_STOCK'].includes(status)) return 'bad';
  return 'warn';
}

function Status({ children }: { readonly children: string | null }): React.JSX.Element {
  const label = children ?? 'UNKNOWN';
  return <span className={`status status-${statusTone(children)}`}>{label}</span>;
}

function ReleaseFields({ release }: { readonly release: CatalogAdminRelease }): React.JSX.Element {
  return (
    <>
      <input
        name="catalogDifferenceChecksum"
        type="hidden"
        value={release.catalogDifferenceChecksum ?? ''}
      />
      <input name="catalogSourceId" type="hidden" value={release.catalogSourceId} />
      <input name="catalogVersionId" type="hidden" value={release.catalogVersionId ?? ''} />
      <input name="expectedVariantCount" type="hidden" value={release.variantCount} />
      <input
        name="priceDifferenceChecksum"
        type="hidden"
        value={release.priceDifferenceChecksum ?? ''}
      />
      <input name="priceVersionId" type="hidden" value={release.priceVersionId ?? ''} />
      <input name="syncRunId" type="hidden" value={release.syncRunId} />
    </>
  );
}

function ReleaseActions({
  isAdmin,
  isOwner,
  release,
}: {
  readonly isAdmin: boolean;
  readonly isOwner: boolean;
  readonly release: CatalogAdminRelease;
}): React.JSX.Element | null {
  if (release.catalogVersionId === null || release.catalogDifferenceChecksum === null) return null;
  return (
    <div className="release-actions">
      {isOwner &&
      release.catalogStatus === 'AWAITING_APPROVAL' &&
      release.compositionCount === 0 ? (
        <form action={prepareCatalogPublication} className="command-form">
          <ReleaseFields release={release} />
          <label>
            Точная фраза
            <input
              autoComplete="off"
              name="confirmation"
              placeholder={`ПОДГОТОВИТЬ ${release.variantCount}`}
              required
            />
          </label>
          <button className="button button-dark" type="submit">
            Зафиксировать состав
          </button>
        </form>
      ) : null}
      {isOwner && release.catalogStatus === 'AWAITING_APPROVAL' && release.compositionCount > 0 ? (
        <form action={approveCatalogRelease} className="command-form">
          <ReleaseFields release={release} />
          <label>
            Причина решения
            <input name="reason" required defaultValue="Проверен состав пилота и точный diff." />
          </label>
          <label>
            Подтверждение
            <input autoComplete="off" name="confirmation" placeholder="ОДОБРИТЬ" required />
          </label>
          <button className="button button-brass" type="submit">
            Одобрить checksum
          </button>
        </form>
      ) : null}
      {isAdmin && release.catalogStatus === 'APPROVED' ? (
        <form action={activateCatalogRelease} className="command-form command-form-danger">
          <ReleaseFields release={release} />
          <label>
            Причина активации
            <input
              name="reason"
              required
              defaultValue="Активировать проверенный пилотный каталог."
            />
          </label>
          <label>
            Подтверждение
            <input autoComplete="off" name="confirmation" placeholder="АКТИВИРОВАТЬ" required />
          </label>
          <button className="button button-red" type="submit">
            Активировать публичную версию
          </button>
        </form>
      ) : null}
    </div>
  );
}

function VariantRow({
  isOwner,
  variant,
}: {
  readonly isOwner: boolean;
  readonly variant: CatalogAdminVariant;
}): React.JSX.Element {
  const publicationDefault = ['DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED'].includes(
    variant.publicationStatus,
  )
    ? variant.publicationStatus
    : 'DRAFT';
  const availabilityDefault = ['AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY', 'HIDDEN'].includes(
    variant.availabilityStatus,
  )
    ? variant.availabilityStatus
    : 'INQUIRY_ONLY';
  return (
    <article className="variant-row" id={`variant-${variant.id}`}>
      <div className="variant-swatch">
        <span>{variant.colorHex ?? '∅'}</span>
      </div>
      <div className="variant-main">
        <p className="variant-kicker">
          {variant.categoryName} · {variant.primarySystemName ?? 'система не указана'}
        </p>
        <h3>{variant.name}</h3>
        <p className="variant-meta">
          Артикул {variant.article} · AMIGO ID {variant.sourceId} ·{' '}
          <a href={variant.sourceUrl} rel="noreferrer" target="_blank">
            источник
          </a>
        </p>
        <div className="status-line">
          <Status>{variant.visibility}</Status>
          <Status>{variant.publicationStatus}</Status>
          <Status>{variant.availabilityStatus}</Status>
          <span className="media-state">
            {variant.mediaCount} медиа ·{' '}
            {variant.rightsReady && variant.mediaApproved
              ? 'права и публикация OK'
              : 'медиа заблокировано'}
          </span>
        </div>
      </div>
      <div className="variant-price">
        <span>Источник</span>
        <strong>{formatMinor(variant.sourcePriceAmountMinor, variant.currency)}</strong>
        <span>Локально</span>
        <strong>{formatMinor(variant.localPriceAmountMinor, variant.currency)}</strong>
      </div>
      {isOwner ? (
        <details className="variant-editor">
          <summary>Локальное решение</summary>
          <div className="variant-editor-grid">
            <form action={updateCatalogVariantOverlay} className="compact-form">
              <input name="entityId" type="hidden" value={variant.id} />
              <label>
                Видимость
                <select defaultValue={variant.visibility} name="visibility">
                  <option value="VISIBLE">VISIBLE</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
              <label>
                Публикация
                <select defaultValue={publicationDefault} name="publicationStatus">
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="HIDDEN">HIDDEN</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label>
                Наличие
                <select defaultValue={availabilityDefault} name="availabilityStatus">
                  <option value="INQUIRY_ONLY">INQUIRY_ONLY</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
              <label className="form-wide">
                Основание наличия
                <input
                  name="availabilityReason"
                  required
                  defaultValue="Требуется подтверждение менеджером."
                />
              </label>
              <label className="form-wide">
                Основание публикации
                <input
                  name="publicationReason"
                  required
                  defaultValue="Локальное решение владельца каталога."
                />
              </label>
              <button className="button button-dark form-wide" type="submit">
                Сохранить состояния
              </button>
            </form>
            {variant.businessCatalogEntryId === null ? (
              <p className="inline-note">Сначала подготовьте общий публикационный состав.</p>
            ) : (
              <div className="price-forms">
                <form action={setCatalogLocalPriceOverride} className="compact-form">
                  <input
                    name="businessCatalogEntryId"
                    type="hidden"
                    value={variant.businessCatalogEntryId}
                  />
                  <input name="currency" type="hidden" value="RUB" />
                  <label>
                    Локальная цена, ₽
                    <input inputMode="decimal" name="rubles" placeholder="1999,00" required />
                  </label>
                  <label className="form-wide">
                    Причина
                    <input
                      name="reason"
                      required
                      defaultValue="Решение владельца о локальной цене."
                    />
                  </label>
                  <button className="button button-brass form-wide" type="submit">
                    Установить override
                  </button>
                </form>
                {variant.localPriceAmountMinor === null ? null : (
                  <form action={removeCatalogLocalPriceOverride} className="remove-form">
                    <input
                      name="businessCatalogEntryId"
                      type="hidden"
                      value={variant.businessCatalogEntryId}
                    />
                    <input
                      name="reason"
                      type="hidden"
                      value="Локальная цена больше не применяется."
                    />
                    <button className="text-button" type="submit">
                      Снять локальную цену
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function Login({ notice }: { readonly notice: string | undefined }): React.JSX.Element {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <div className="catalog-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="overline">ЛОКАЛЬНЫЙ КОНТУР · PHASE 1B.1</p>
        <h1 id="admin-login-title">Редакция каталога</h1>
        <p>
          Введите краткоживущий локальный ключ OWNER или ADMIN. Ключ остаётся в защищённой
          HttpOnly-сессии и не отображается после входа.
        </p>
        {notice === undefined ? null : (
          <p className="notice" role="status">
            {noticeMessages[notice] ?? 'Команда не выполнена. Проверьте состояние и повторите.'}
          </p>
        )}
        <form action={signInCatalogAdmin} className="login-form">
          <label>
            Ключ локальной сессии
            <input autoComplete="off" name="token" type="password" required />
          </label>
          <button className="button button-dark" type="submit">
            Открыть рабочее место
          </button>
        </form>
        <Link className="back-link" href="/">
          ← Технический контур
        </Link>
      </section>
    </main>
  );
}

export default async function AdminCatalogPage({
  searchParams,
}: AdminCatalogPageProps): Promise<React.JSX.Element> {
  const parameters = await searchParams;
  const principal = await readCatalogAdminPrincipal();
  if (principal === null) return <Login notice={parameters.notice} />;

  const state = ['ALL', 'BLOCKED', 'PUBLISHED'].includes(parameters.state ?? '')
    ? (parameters.state as 'ALL' | 'BLOCKED' | 'PUBLISHED')
    : 'ALL';
  const [overview, variants] = await Promise.all([
    getWebCatalogRead().getAdminOverview(),
    getWebCatalogRead().listAdminVariants({
      limit: 50,
      ...(parameters.q === undefined ? {} : { query: parameters.q }),
      state,
    }),
  ]);
  const isOwner = principal.roles.includes('OWNER');
  const isAdmin = principal.roles.includes('ADMIN');

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="overline">PROJECT_NAME · CATALOG DESK</p>
          <h1>Пилот AMIGO</h1>
        </div>
        <div className="admin-session">
          <span className="environment-pill">LOCAL · WINDOWS 11</span>
          <span>{principal.roles.join(' + ')}</span>
          <form action={signOutCatalogAdmin}>
            <button className="text-button" type="submit">
              Выйти
            </button>
          </form>
        </div>
      </header>

      {parameters.notice === undefined ? null : (
        <p className="notice notice-wide" role="status">
          {noticeMessages[parameters.notice] ??
            `Команда завершилась со статусом ${parameters.notice}.`}
        </p>
      )}

      <section className="admin-hero" aria-labelledby="catalog-state-title">
        <div>
          <p className="section-number">01 / СОСТОЯНИЕ</p>
          <h2 id="catalog-state-title">От источника к публикации — без скрытых переходов.</h2>
        </div>
        <p>
          AMIGO остаётся владельцем source-фактов. Локальная видимость, наличие и цены живут
          отдельно. Публичный каталог читает только активную immutable composition.
        </p>
      </section>

      <section className="metric-grid" aria-label="Сводка каталога">
        <article>
          <span>Материалы</span>
          <strong>{overview.summary.materialVariantCount}</strong>
          <small>allowlist ≤ 50</small>
        </article>
        <article>
          <span>Исходные цены</span>
          <strong>{overview.summary.sourcePriceCount}</strong>
          <small>не заменены override</small>
        </article>
        <article>
          <span>Media approved</span>
          <strong>{overview.summary.approvedMediaCount}</strong>
          <small>локальные объекты</small>
        </article>
        <article>
          <span>Опубликованные записи</span>
          <strong>{overview.summary.publishedEntryCount}</strong>
          <small>из {overview.summary.businessEntryCount} overlays</small>
        </article>
      </section>

      <section className="active-strip" aria-label="Активные версии">
        <div>
          <span>CATALOG VERSION</span>
          <strong>
            {overview.activeCatalogVersion === null
              ? 'не активирована'
              : `v${overview.activeCatalogVersion.versionNumber}`}
          </strong>
          <code>{shortId(overview.activeCatalogVersion?.id ?? null)}</code>
        </div>
        <div>
          <span>PRICE VERSION</span>
          <strong>
            {overview.activePriceVersion === null
              ? 'не активирована'
              : `v${overview.activePriceVersion.versionNumber}`}
          </strong>
          <code>{shortId(overview.activePriceVersion?.id ?? null)}</code>
        </div>
        <Link className="button button-paper" href="/catalog">
          Открыть публичный каталог ↗
        </Link>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / RELEASE DESK</p>
            <h2>Версии и точный diff</h2>
          </div>
          {isOwner ? (
            <form action={startManualCatalogSync}>
              <button className="button button-dark" type="submit">
                Запустить ручную проверку AMIGO
              </button>
            </form>
          ) : null}
        </div>
        <div className="release-list">
          {overview.releases.length === 0 ? (
            <p className="empty-state">Кандидатов пока нет. Публичный указатель не менялся.</p>
          ) : (
            overview.releases.map((release) => (
              <article
                className="release-card"
                key={`${release.syncRunId}:${release.catalogVersionId}`}
              >
                <div className="release-index">v{release.catalogVersionNumber ?? '—'}</div>
                <div className="release-body">
                  <div className="release-title">
                    <h3>{release.sourceVersion ?? 'source version pending'}</h3>
                    <Status>{release.catalogStatus}</Status>
                    <Status>{release.priceStatus}</Status>
                  </div>
                  <dl className="release-facts">
                    <div>
                      <dt>Sync run</dt>
                      <dd>
                        <code>{shortId(release.syncRunId)}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>Создан</dt>
                      <dd>{formatInstant(release.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Варианты</dt>
                      <dd>{release.variantCount}</dd>
                    </div>
                    <div>
                      <dt>Composition</dt>
                      <dd>{release.compositionCount}</dd>
                    </div>
                    <div>
                      <dt>Diff</dt>
                      <dd>
                        {release.differenceCount} / pending {release.pendingDifferenceCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Ошибки items</dt>
                      <dd>{release.failedItemCount}</dd>
                    </div>
                  </dl>
                  <div className="checksum-line">
                    <span>catalog checksum</span>
                    <code>{release.catalogDifferenceChecksum ?? '—'}</code>
                  </div>
                  <ReleaseActions isAdmin={isAdmin} isOwner={isOwner} release={release} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <p className="section-number">03 / MATERIALS</p>
            <h2>Source-факты и локальные решения</h2>
          </div>
          <form className="filter-form" method="get">
            <label>
              <span className="sr-only">Поиск</span>
              <input defaultValue={parameters.q} name="q" placeholder="Название, артикул, цвет" />
            </label>
            <label>
              <span className="sr-only">Состояние</span>
              <select defaultValue={state} name="state">
                <option value="ALL">Все</option>
                <option value="PUBLISHED">Опубликованы</option>
                <option value="BLOCKED">Заблокированы</option>
              </select>
            </label>
            <button className="button button-paper" type="submit">
              Фильтровать
            </button>
          </form>
        </div>
        <p className="bounded-note">
          Показано {variants.items.length} из {variants.total}; пилотный предел — {variants.limit}.
        </p>
        <div className="variant-list">
          {variants.items.map((variant) => (
            <VariantRow isOwner={isOwner} key={variant.id} variant={variant} />
          ))}
        </div>
      </section>

      <section className="admin-section run-section">
        <div className="section-heading">
          <div>
            <p className="section-number">04 / RUN HISTORY</p>
            <h2>История не переписывается</h2>
          </div>
        </div>
        <div className="run-table" role="table" aria-label="Последние синхронизации">
          {overview.runs.map((run) => (
            <div className="run-row" role="row" key={run.id}>
              <code>{shortId(run.id)}</code>
              <Status>{run.status}</Status>
              <span>{run.trigger}</span>
              <span>
                {run.processedCount}/{run.discoveredCount}
              </span>
              <span>{formatInstant(run.completedAt ?? run.createdAt)}</span>
              <span>{run.errorCode ?? 'без ошибки'}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
