import {
  amigoPilotCatalogSourceId,
  catalogAdminDifferenceResolutions,
  catalogAdminDifferenceTypes,
  type CatalogAdminDifference,
  type CatalogAdminRelease,
  type CatalogAdminVariant,
} from '@project-name/catalog';
import Link from 'next/link';

import { readCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebCatalogRead } from '../../../lib/catalog-runtime';
import {
  activateCatalogRelease,
  approveCatalogRelease,
  cancelCatalogSync,
  composeCatalogPublication,
  prepareCatalogPublication,
  removeCatalogLocalPriceOverride,
  retryCatalogSync,
  reviewCatalogDifferences,
  rollbackCatalogRelease,
  setCatalogLocalPriceOverride,
  signInCatalogAdmin,
  signOutCatalogAdmin,
  startManualCatalogSync,
  updateCatalogVariantOverlay,
} from './actions';
import { BulkCommandPanel } from './bulk-command-panel';
import { DifferenceReviewPanel } from './difference-review-panel';

export const dynamic = 'force-dynamic';

interface AdminCatalogSearchParams {
  readonly availability?: string;
  readonly category?: string;
  readonly diffPage?: string;
  readonly diffResolution?: string;
  readonly diffScope?: string;
  readonly diffType?: string;
  readonly media?: string;
  readonly notice?: string;
  readonly page?: string;
  readonly price?: string;
  readonly publication?: string;
  readonly q?: string;
  readonly review?: string;
  readonly run?: string;
  readonly source?: string;
  readonly state?: string;
  readonly system?: string;
  readonly visibility?: string;
}

interface AdminCatalogPageProps {
  readonly searchParams: Promise<AdminCatalogSearchParams>;
}

const noticeMessages: Readonly<Record<string, string>> = {
  CATALOG_ACTIVATION_ACCEPTED: 'Активация принята в очередь. Публичный указатель пока не менялся.',
  CATALOG_ADMIN_SESSION_CLOSED: 'Локальная административная сессия закрыта.',
  CATALOG_ADMIN_SESSION_OPENED: 'Локальная административная сессия открыта.',
  CATALOG_APPROVAL_ACCEPTED: 'Одобрение точной версии принято в очередь.',
  CATALOG_COMPOSITION_FIXED: 'Публикационный состав зафиксирован. Массовые правки теперь закрыты.',
  CATALOG_OVERLAY_UPDATED: 'Локальное решение для материала сохранено.',
  CATALOG_PRICE_OVERRIDE_REMOVED: 'Локальная цена снята; исходная цена AMIGO сохранена.',
  CATALOG_PRICE_OVERRIDE_SET: 'Локальная цена сохранена отдельно от исходной цены AMIGO.',
  CATALOG_PUBLICATION_PREPARED:
    'Локальные записи подготовлены. До фиксации состава доступны массовые решения.',
  CATALOG_REVIEW_ACCEPTED: 'Решение по точному diff принято в очередь.',
  CATALOG_ROLLBACK_ACCEPTED: 'Безопасный откат принят в очередь.',
  CATALOG_SYNC_ACCEPTED: 'Ручная синхронизация принята в очередь.',
  CATALOG_SYNC_CANCELLATION_ACCEPTED: 'Запрос на безопасную остановку записан.',
  CATALOG_SYNC_RETRY_ACCEPTED:
    'Повтор синхронизации принят в очередь с привязкой к исходному запуску.',
  IDENTITY_AUTHENTICATION_REQUIRED: 'Ключ сессии не принят или истёк.',
  IDENTITY_PERMISSION_DENIED: 'Для этой операции недостаточно роли.',
};

const differenceLabels: Readonly<Record<string, string>> = {
  ARTICLE_CHANGED: 'Изменён артикул',
  COLOR_CHANGED: 'Изменён цвет',
  NEW_CATEGORY: 'Новая категория',
  NEW_MATERIAL: 'Новый материал',
  NEW_MEDIA: 'Новые медиа',
  NEW_MODEL: 'Новая модель',
  NEW_SYSTEM: 'Новая система',
  PARSE_ERROR: 'Ошибка разбора',
  PRICE_CHANGED: 'Изменена цена',
  PROPERTY_CHANGED: 'Изменено свойство',
  SOURCE_REMOVED: 'Удалено в источнике',
};

function oneOf<T extends string>(value: string | undefined, values: readonly T[], fallback: T): T {
  return value !== undefined && values.includes(value as T) ? (value as T) : fallback;
}

function pageNumber(value: string | undefined): number {
  const parsed = Number(value ?? '1');
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 2_001 ? parsed : 1;
}

function adminHref(
  current: AdminCatalogSearchParams,
  changes: Readonly<Record<string, string | null>>,
  hash?: string,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (key !== 'notice' && value !== undefined && value.length > 0) query.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value.length === 0) query.delete(key);
    else query.set(key, value);
  }
  const suffix = query.size === 0 ? '' : `?${query.toString()}`;
  return `/admin/catalog${suffix}${hash === undefined ? '' : `#${hash}`}`;
}

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

function shortChecksum(value: string | null): string {
  return value === null ? '—' : `${value.slice(0, 12)}…`;
}

function statusTone(status: string | null): 'bad' | 'good' | 'quiet' | 'warn' {
  if (status === null || ['UNREVIEWED', 'DRAFT', 'QUEUED'].includes(status)) return 'quiet';
  if (
    ['ACTIVE', 'APPROVED', 'COMPLETE', 'COMPLETED', 'PUBLISHED', 'READY', 'VISIBLE'].includes(
      status,
    )
  ) {
    return 'good';
  }
  if (
    ['CANCELLED', 'FAILED', 'PARTIAL_FAILED', 'REJECTED', 'HIDDEN', 'OUT_OF_STOCK'].includes(status)
  ) {
    return 'bad';
  }
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

function ReviewAllForm({
  count,
  release,
  scope,
}: {
  readonly count: number;
  readonly release: CatalogAdminRelease;
  readonly scope: 'CATALOG' | 'PRICE';
}): React.JSX.Element | null {
  if (count < 1) return null;
  return (
    <form action={reviewCatalogDifferences} className="command-form">
      <ReleaseFields release={release} />
      <input name="expectedCount" type="hidden" value={count} />
      <input name="resolution" type="hidden" value="APPROVED" />
      <input name="scope" type="hidden" value={scope} />
      <input name="selectionMode" type="hidden" value="ALL" />
      <label>
        Причина
        <input
          name="reason"
          required
          defaultValue={`Проверен весь ${scope === 'CATALOG' ? 'каталожный' : 'ценовой'} diff.`}
        />
      </label>
      <label>
        Точная фраза
        <input autoComplete="off" name="confirmation" placeholder={`ПРОВЕРИТЬ ${count}`} required />
      </label>
      <button className="button button-brass" type="submit">
        Принять весь {scope === 'CATALOG' ? 'каталожный' : 'ценовой'} diff
      </button>
    </form>
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
  const mutable = release.catalogStatus === 'AWAITING_APPROVAL';
  return (
    <div className="release-actions">
      {isOwner && mutable && !release.publicationPrepared ? (
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
            Подготовить локальные записи
          </button>
        </form>
      ) : null}
      {isOwner && mutable && release.publicationPrepared && release.compositionCount === 0 ? (
        <form action={composeCatalogPublication} className="command-form command-form-danger">
          <ReleaseFields release={release} />
          <p className="inline-note">
            После фиксации состава массовые изменения кандидата закрываются.
          </p>
          <label>
            Точная фраза
            <input
              autoComplete="off"
              name="confirmation"
              placeholder={`ЗАФИКСИРОВАТЬ ${release.variantCount}`}
              required
            />
          </label>
          <button className="button button-red" type="submit">
            Зафиксировать immutable composition
          </button>
        </form>
      ) : null}
      {isOwner &&
      mutable &&
      release.compositionCount > 0 &&
      release.catalogUnapprovedDifferenceCount > 0 ? (
        <ReviewAllForm count={release.catalogDifferenceCount} release={release} scope="CATALOG" />
      ) : null}
      {isOwner &&
      mutable &&
      release.compositionCount > 0 &&
      release.priceUnapprovedDifferenceCount > 0 ? (
        <ReviewAllForm count={release.priceDifferenceCount} release={release} scope="PRICE" />
      ) : null}
      {isOwner &&
      mutable &&
      release.compositionCount > 0 &&
      release.catalogUnapprovedDifferenceCount === 0 &&
      release.priceUnapprovedDifferenceCount === 0 ? (
        <form action={approveCatalogRelease} className="command-form">
          <ReleaseFields release={release} />
          <label>
            Причина решения
            <input
              name="reason"
              required
              defaultValue="Проверены состав, манифест и оба точных diff."
            />
          </label>
          <label>
            Подтверждение
            <input autoComplete="off" name="confirmation" placeholder="ОДОБРИТЬ" required />
          </label>
          <button className="button button-brass" type="submit">
            Одобрить точные версии
          </button>
        </form>
      ) : null}
      {isAdmin && release.catalogStatus === 'APPROVED' ? (
        <form action={activateCatalogRelease} className="command-form command-form-danger">
          <ReleaseFields release={release} />
          <label>
            Причина активации
            <input name="reason" required defaultValue="Активировать проверенный полный каталог." />
          </label>
          <label>
            Подтверждение
            <input autoComplete="off" name="confirmation" placeholder="АКТИВИРОВАТЬ" required />
          </label>
          <button className="button button-red" type="submit">
            Активировать публичные версии
          </button>
        </form>
      ) : null}
    </div>
  );
}

function ManifestSummary({
  release,
}: {
  readonly release: CatalogAdminRelease;
}): React.JSX.Element {
  const manifest = release.manifest;
  if (manifest === null) return <p className="inline-note">Манифест ещё не запечатан.</p>;
  const counts = manifest.counts;
  return (
    <details className="manifest-summary">
      <summary>
        Манифест <Status>{manifest.status}</Status> · запечатан {formatInstant(manifest.sealedAt)}
      </summary>
      <dl>
        <div>
          <dt>Страницы</dt>
          <dd>{counts.pages}</dd>
        </div>
        <div>
          <dt>Категории</dt>
          <dd>{counts.categories}</dd>
        </div>
        <div>
          <dt>Системы / модели</dt>
          <dd>
            {counts.systems} / {counts.models}
          </dd>
        </div>
        <div>
          <dt>Варианты</dt>
          <dd>{counts.materialVariants}</dd>
        </div>
        <div>
          <dt>Медиа</dt>
          <dd>
            {counts.mediaImported} / {counts.mediaReferences}
          </dd>
        </div>
        <div>
          <dt>Цены</dt>
          <dd>{counts.priceRecords}</dd>
        </div>
        <div>
          <dt>Повторы / пропуски</dt>
          <dd>
            {counts.duplicates} / {counts.skips}
          </dd>
        </div>
        <div>
          <dt>Удалено в источнике</dt>
          <dd>{counts.sourceRemoved}</dd>
        </div>
        <div>
          <dt>Возобновления</dt>
          <dd>{counts.resumedSnapshots}</dd>
        </div>
        <div>
          <dt>Предупреждения / ошибки</dt>
          <dd>
            {counts.warnings} / {counts.failures}
          </dd>
        </div>
      </dl>
    </details>
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
        <p className="variant-kicker">{variant.categoryPath}</p>
        <h3>{variant.name}</h3>
        <p className="variant-meta">
          {variant.materialName} · артикул {variant.article} · AMIGO ID {variant.sourceId} ·{' '}
          <a href={variant.sourceUrl} rel="noreferrer" target="_blank">
            источник
          </a>
        </p>
        <p className="variant-meta">
          {variant.primarySystemName ?? 'система не указана'} · ширина{' '}
          {variant.widthMm === null
            ? 'не указана'
            : `${variant.widthMm.toLocaleString('ru-RU')} мм`}{' '}
          · {variant.isBlackout ? 'blackout' : 'обычная светопроницаемость'} ·{' '}
          {variant.isZebra ? 'зебра' : 'не зебра'}
        </p>
        <div className="status-line">
          <Status>{variant.sourceStatus}</Status>
          <Status>{variant.visibility}</Status>
          <Status>{variant.manualReviewState}</Status>
          <Status>{variant.publicationStatus}</Status>
          <Status>{variant.availabilityStatus}</Status>
          <span className="media-state">
            {variant.mediaCount} медиа ·{' '}
            {variant.rightsReady && variant.mediaApproved ? 'готово' : 'заблокировано'}
          </span>
        </div>
      </div>
      <div className="variant-price">
        <span>Источник</span>
        <strong>{formatMinor(variant.sourcePriceAmountMinor, variant.currency)}</strong>
        <small>{variant.sourcePriceStatus}</small>
        <span>Локально</span>
        <strong>{formatMinor(variant.localPriceAmountMinor, variant.currency)}</strong>
      </div>
      {isOwner ? (
        <details className="variant-editor">
          <summary>Локальное решение для одной записи</summary>
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
              <p className="inline-note">Сначала подготовьте публикационные записи кандидата.</p>
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

function DifferenceReadOnlyList({
  differences,
}: {
  readonly differences: readonly CatalogAdminDifference[];
}): React.JSX.Element {
  return (
    <div className="difference-list">
      {differences.map((difference) => (
        <article className="difference-row difference-row-readonly" key={difference.id}>
          <div className="difference-main">
            <div className="difference-title">
              <strong>{difference.entityName}</strong>
              <Status>{difference.type}</Status>
              <Status>{difference.resolution}</Status>
            </div>
            <p>
              {differenceLabels[difference.type]} · source {difference.sourceId ?? 'без ID'}
            </p>
            <p className="difference-values">
              {difference.type === 'PRICE_CHANGED'
                ? `${formatMinor(difference.oldPriceMinor, difference.currency)} → ${formatMinor(difference.newPriceMinor, difference.currency)}`
                : `${difference.beforeSummary ?? 'новая запись'} → ${difference.afterSummary ?? 'удалено в источнике'}`}
            </p>
          </div>
        </article>
      ))}
    </div>
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
        <p className="overline">ЛОКАЛЬНЫЙ КОНТУР · PHASE 1B.2</p>
        <h1 id="admin-login-title">Редакция полного каталога</h1>
        <p>
          Введите краткоживущий локальный ключ OWNER или ADMIN. Он остаётся в защищённой
          HttpOnly-сессии.
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

  const limit = 50;
  const page = pageNumber(parameters.page);
  const state = oneOf(parameters.state, ['ALL', 'BLOCKED', 'PUBLISHED'] as const, 'ALL');
  const availability = oneOf(
    parameters.availability,
    ['ALL', 'AVAILABLE', 'HIDDEN', 'INQUIRY_ONLY', 'OUT_OF_STOCK', 'UNREVIEWED'] as const,
    'ALL',
  );
  const media = oneOf(parameters.media, ['ALL', 'BLOCKED', 'MISSING', 'READY'] as const, 'ALL');
  const price = oneOf(
    parameters.price,
    ['ALL', 'AVAILABLE', 'LOCAL_OVERRIDE', 'MISSING', 'PRICE_ON_REQUEST'] as const,
    'ALL',
  );
  const publication = oneOf(
    parameters.publication,
    ['ALL', 'ARCHIVED', 'DRAFT', 'HIDDEN', 'PUBLISHED', 'UNREVIEWED'] as const,
    'ALL',
  );
  const review = oneOf(
    parameters.review,
    ['ALL', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'UNREVIEWED'] as const,
    'ALL',
  );
  const sourceStatus = oneOf(
    parameters.source,
    ['ACTIVE', 'ALL', 'SOURCE_REMOVED'] as const,
    'ALL',
  );
  const visibility = oneOf(parameters.visibility, ['ALL', 'HIDDEN', 'VISIBLE'] as const, 'ALL');
  const read = getWebCatalogRead();
  const [overview, variants] = await Promise.all([
    read.getAdminOverview(),
    read.listAdminVariants({
      availability,
      ...(parameters.category === undefined ? {} : { categoryId: parameters.category }),
      limit,
      media,
      offset: (page - 1) * limit,
      price,
      publication,
      ...(parameters.q === undefined ? {} : { query: parameters.q }),
      review,
      sourceStatus,
      state,
      ...(parameters.system === undefined ? {} : { systemId: parameters.system }),
      visibility,
    }),
  ]);
  const selectedRelease =
    overview.releases.find((release) => release.syncRunId === parameters.run) ??
    overview.releases[0] ??
    null;
  const diffScope = oneOf(parameters.diffScope, ['ALL', 'CATALOG', 'PRICE'] as const, 'ALL');
  const diffType = oneOf(
    parameters.diffType,
    ['ALL', ...catalogAdminDifferenceTypes] as const,
    'ALL',
  );
  const diffResolution = oneOf(
    parameters.diffResolution,
    ['ALL', ...catalogAdminDifferenceResolutions] as const,
    'ALL',
  );
  const diffPage = pageNumber(parameters.diffPage);
  const differences = await read.listAdminDifferences({
    limit: 50,
    offset: (diffPage - 1) * 50,
    resolution: diffResolution,
    scope: diffScope,
    ...(selectedRelease === null ? {} : { syncRunId: selectedRelease.syncRunId }),
    type: diffType,
  });
  const isOwner = principal.roles.includes('OWNER');
  const isAdmin = principal.roles.includes('ADMIN');
  const mutableRelease = overview.releases.find(
    (release) =>
      release.catalogStatus === 'AWAITING_APPROVAL' &&
      release.publicationPrepared &&
      release.compositionCount === 0 &&
      release.catalogVersionId !== null &&
      release.catalogDifferenceChecksum !== null,
  );
  const variantLastPage = Math.max(1, Math.ceil(variants.total / limit));
  const diffLastPage = Math.max(1, Math.ceil(differences.total / 50));

  return (
    <main className="admin-shell" id="main-content">
      <header className="admin-topbar">
        <div>
          <p className="overline">PROJECT_NAME · CATALOG CONTROL ROOM</p>
          <h1>Полный AMIGO‑каталог</h1>
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
          <p className="section-number">01 / КОНТРОЛЬНЫЙ ПУЛЬТ</p>
          <h2 id="catalog-state-title">Источник виден. Публикация остаётся ручной.</h2>
        </div>
        <p>
          Полный локальный каталог отделяет immutable source‑факты, нормализацию, решения владельца
          и активную публичную версию. Ни один sync не публикует изменения автоматически.
        </p>
      </section>

      <section className="metric-grid metric-grid-six" aria-label="Сводка полного каталога">
        <article>
          <span>Категории</span>
          <strong>{overview.summary.categoryCount}</strong>
          <small>иерархия из данных</small>
        </article>
        <article>
          <span>Системы / модели</span>
          <strong>
            {overview.summary.systemCount}
            <i> / {overview.summary.modelCount}</i>
          </strong>
          <small>нормализованы</small>
        </article>
        <article>
          <span>Варианты</span>
          <strong>{overview.summary.materialVariantCount}</strong>
          <small>без pilot allowlist</small>
        </article>
        <article>
          <span>Исходные цены</span>
          <strong>{overview.summary.sourcePriceCount}</strong>
          <small>версии не заменены override</small>
        </article>
        <article>
          <span>Media approved</span>
          <strong>{overview.summary.approvedMediaCount}</strong>
          <small>локальные объекты</small>
        </article>
        <article>
          <span>Source removed</span>
          <strong>{overview.summary.sourceRemovedCount}</strong>
          <small>сохранены, не удалены</small>
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

      {isOwner &&
      ((overview.activeCatalogVersion?.rollbackTargetId ?? null) !== null ||
        (overview.activePriceVersion?.rollbackTargetId ?? null) !== null) ? (
        <details className="rollback-panel">
          <summary>Безопасный откат активных версий</summary>
          <form action={rollbackCatalogRelease} className="command-form command-form-danger">
            <input
              name="expectedActiveCatalogVersionId"
              type="hidden"
              value={
                overview.activeCatalogVersion?.rollbackTargetId === null
                  ? ''
                  : (overview.activeCatalogVersion?.id ?? '')
              }
            />
            <input
              name="catalogRollbackTargetId"
              type="hidden"
              value={overview.activeCatalogVersion?.rollbackTargetId ?? ''}
            />
            <input
              name="expectedActivePriceVersionId"
              type="hidden"
              value={
                overview.activePriceVersion?.rollbackTargetId === null
                  ? ''
                  : (overview.activePriceVersion?.id ?? '')
              }
            />
            <input
              name="priceRollbackTargetId"
              type="hidden"
              value={overview.activePriceVersion?.rollbackTargetId ?? ''}
            />
            <label>
              Причина
              <input
                name="reason"
                required
                defaultValue="Вернуть предыдущую совместимую публикацию."
              />
            </label>
            <label>
              Подтверждение
              <input autoComplete="off" name="confirmation" placeholder="ОТКАТИТЬ" required />
            </label>
            <button className="button button-red" type="submit">
              Запросить атомарный откат
            </button>
          </form>
        </details>
      ) : null}

      <section className="admin-section" id="releases">
        <div className="section-heading">
          <div>
            <p className="section-number">02 / RELEASE DESK</p>
            <h2>Манифест, версии и ручные переходы</h2>
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
                className={`release-card ${selectedRelease?.syncRunId === release.syncRunId ? 'release-card-current' : ''}`}
                key={`${release.syncRunId}:${release.catalogVersionId}`}
              >
                <div className="release-index">v{release.catalogVersionNumber ?? '—'}</div>
                <div className="release-body">
                  <div className="release-title">
                    <h3>{release.sourceVersion ?? 'source version pending'}</h3>
                    <Status>{release.syncStatus}</Status>
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
                      <dt>Diff catalog / price</dt>
                      <dd>
                        {release.catalogDifferenceCount} / {release.priceDifferenceCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Не одобрено</dt>
                      <dd>
                        {release.catalogUnapprovedDifferenceCount} /{' '}
                        {release.priceUnapprovedDifferenceCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Review / bulk</dt>
                      <dd>
                        {release.reviewBatchCount} / {release.bulkCommandCount}
                      </dd>
                    </div>
                    <div>
                      <dt>Ошибки items</dt>
                      <dd>{release.failedItemCount}</dd>
                    </div>
                  </dl>
                  <ManifestSummary release={release} />
                  <div className="release-evidence">
                    <span>checksum команды</span>
                    <code>{shortChecksum(release.catalogDifferenceChecksum)}</code>
                    <Link
                      href={adminHref(
                        parameters,
                        { diffPage: null, run: release.syncRunId },
                        'differences',
                      )}
                    >
                      Открыть diff →
                    </Link>
                  </div>
                  <ReleaseActions isAdmin={isAdmin} isOwner={isOwner} release={release} />
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {isOwner &&
      mutableRelease !== undefined &&
      mutableRelease.catalogVersionId !== null &&
      mutableRelease.catalogDifferenceChecksum !== null ? (
        <section className="admin-section" id="bulk-controls">
          <BulkCommandPanel
            categories={variants.categories}
            release={{
              catalogDifferenceChecksum: mutableRelease.catalogDifferenceChecksum,
              catalogSourceId: mutableRelease.catalogSourceId,
              catalogVersionId: mutableRelease.catalogVersionId,
              syncRunId: mutableRelease.syncRunId,
            }}
            systems={variants.systems}
            variants={variants.items.map((variant) => ({
              article: variant.article,
              businessCatalogEntryId: variant.businessCatalogEntryId,
              id: variant.id,
              name: variant.name,
            }))}
          />
        </section>
      ) : null}

      <section className="admin-section" id="differences">
        <div className="section-heading">
          <div>
            <p className="section-number">03 / EXACT DIFF</p>
            <h2>Сравнение и решение</h2>
          </div>
        </div>
        <form className="filter-form difference-filter-form" method="get">
          <input name="run" type="hidden" value={selectedRelease?.syncRunId ?? ''} />
          <label>
            Область
            <select defaultValue={diffScope} name="diffScope">
              <option value="ALL">Каталог + цены</option>
              <option value="CATALOG">Только каталог</option>
              <option value="PRICE">Только цены</option>
            </select>
          </label>
          <label>
            Тип
            <select defaultValue={diffType} name="diffType">
              <option value="ALL">Все типы</option>
              {catalogAdminDifferenceTypes.map((type) => (
                <option key={type} value={type}>
                  {differenceLabels[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Решение
            <select defaultValue={diffResolution} name="diffResolution">
              <option value="ALL">Все решения</option>
              {catalogAdminDifferenceResolutions.map((resolution) => (
                <option key={resolution} value={resolution}>
                  {resolution}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-paper" type="submit">
            Показать diff
          </button>
        </form>
        <p className="bounded-note">
          Запуск {shortId(selectedRelease?.syncRunId ?? null)} · показано {differences.items.length}{' '}
          из {differences.total}
        </p>
        {differences.items.length === 0 ? (
          <p className="empty-state">Для выбранных фильтров различий нет.</p>
        ) : isOwner &&
          selectedRelease !== null &&
          selectedRelease.catalogStatus === 'AWAITING_APPROVAL' &&
          selectedRelease.compositionCount > 0 &&
          diffScope !== 'ALL' ? (
          <DifferenceReviewPanel
            differences={differences.items}
            release={selectedRelease}
            scope={diffScope}
          />
        ) : (
          <>
            {isOwner && diffScope === 'ALL' ? (
              <p className="inline-note">
                Для группового решения выберите отдельно «Только каталог» или «Только цены».
              </p>
            ) : null}
            <DifferenceReadOnlyList differences={differences.items} />
          </>
        )}
        <nav className="pagination" aria-label="Страницы diff">
          {diffPage > 1 ? (
            <Link href={adminHref(parameters, { diffPage: String(diffPage - 1) }, 'differences')}>
              ← Предыдущая
            </Link>
          ) : (
            <span />
          )}
          <span>
            Страница {diffPage} из {diffLastPage}
          </span>
          {diffPage < diffLastPage ? (
            <Link href={adminHref(parameters, { diffPage: String(diffPage + 1) }, 'differences')}>
              Следующая →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>

      <section className="admin-section" id="materials">
        <div className="section-heading">
          <div>
            <p className="section-number">04 / FULL INVENTORY</p>
            <h2>Source‑факты и локальные решения</h2>
          </div>
        </div>
        <form className="catalog-filter-grid" method="get">
          <label className="filter-search">
            Поиск
            <input
              defaultValue={parameters.q}
              name="q"
              placeholder="Название, артикул, цвет, категория"
            />
          </label>
          <label>
            Категория
            <select defaultValue={parameters.category ?? ''} name="category">
              <option value="">Все категории</option>
              {variants.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(category.depth)}
                  {category.label} · {category.count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Система
            <select defaultValue={parameters.system ?? ''} name="system">
              <option value="">Все системы</option>
              {variants.systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.label} · {system.count}
                </option>
              ))}
            </select>
          </label>
          <label>
            Готовность
            <select defaultValue={state} name="state">
              <option value="ALL">Все</option>
              <option value="PUBLISHED">Опубликованы</option>
              <option value="BLOCKED">Заблокированы</option>
            </select>
          </label>
          <label>
            Видимость
            <select defaultValue={visibility} name="visibility">
              <option value="ALL">Любая</option>
              <option value="VISIBLE">VISIBLE</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>
          </label>
          <label>
            Проверка
            <select defaultValue={review} name="review">
              <option value="ALL">Любая</option>
              <option value="APPROVED">APPROVED</option>
              <option value="UNREVIEWED">UNREVIEWED</option>
              <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </label>
          <label>
            Наличие
            <select defaultValue={availability} name="availability">
              <option value="ALL">Любое</option>
              <option value="INQUIRY_ONLY">INQUIRY_ONLY</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
              <option value="HIDDEN">HIDDEN</option>
              <option value="UNREVIEWED">UNREVIEWED</option>
            </select>
          </label>
          <label>
            Публикация
            <select defaultValue={publication} name="publication">
              <option value="ALL">Любая</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="DRAFT">DRAFT</option>
              <option value="HIDDEN">HIDDEN</option>
              <option value="ARCHIVED">ARCHIVED</option>
              <option value="UNREVIEWED">UNREVIEWED</option>
            </select>
          </label>
          <label>
            Цена
            <select defaultValue={price} name="price">
              <option value="ALL">Любая</option>
              <option value="AVAILABLE">Есть сумма</option>
              <option value="PRICE_ON_REQUEST">По запросу</option>
              <option value="LOCAL_OVERRIDE">Есть override</option>
              <option value="MISSING">Нет записи</option>
            </select>
          </label>
          <label>
            Медиа
            <select defaultValue={media} name="media">
              <option value="ALL">Любое</option>
              <option value="READY">Готово</option>
              <option value="MISSING">Нет файла</option>
              <option value="BLOCKED">Заблокировано</option>
            </select>
          </label>
          <label>
            Источник
            <select defaultValue={sourceStatus} name="source">
              <option value="ALL">Любой</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SOURCE_REMOVED">SOURCE_REMOVED</option>
            </select>
          </label>
          <div className="filter-actions">
            <button className="button button-dark" type="submit">
              Применить фильтры
            </button>
            <Link className="text-button" href="/admin/catalog#materials">
              Сбросить
            </Link>
          </div>
        </form>
        <p className="bounded-note">
          Показано {variants.items.length} из {variants.total}; страница {page} из {variantLastPage}
          .
        </p>
        <div className="variant-list">
          {variants.items.length === 0 ? (
            <p className="empty-state">Ничего не найдено. Снимите часть фильтров.</p>
          ) : (
            variants.items.map((variant) => (
              <VariantRow isOwner={isOwner} key={variant.id} variant={variant} />
            ))
          )}
        </div>
        <nav className="pagination" aria-label="Страницы материалов">
          {page > 1 ? (
            <Link href={adminHref(parameters, { page: String(page - 1) }, 'materials')}>
              ← Предыдущая
            </Link>
          ) : (
            <span />
          )}
          <span>
            Страница {page} из {variantLastPage}
          </span>
          {page < variantLastPage ? (
            <Link href={adminHref(parameters, { page: String(page + 1) }, 'materials')}>
              Следующая →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </section>

      <section className="admin-section" id="runs">
        <div className="section-heading">
          <div>
            <p className="section-number">05 / RUN HISTORY</p>
            <h2>Прогресс и безопасное возобновление</h2>
          </div>
        </div>
        <div className="run-card-list">
          {overview.runs.map((run) => {
            const active = [
              'DISCOVERING',
              'CAPTURING',
              'NORMALIZING',
              'IMPORTING_MEDIA',
              'BUILDING_DIFF',
            ].includes(run.status);
            const retryable = ['CANCELLED', 'FAILED', 'PARTIAL_FAILED'].includes(run.status);
            const maximum = Math.max(run.discoveredCount, run.processedCount, 1);
            return (
              <article className="run-card" key={run.id}>
                <div className="run-card-head">
                  <code>{shortId(run.id)}</code>
                  <Status>{run.status}</Status>
                  <span>{run.trigger}</span>
                  <time>{formatInstant(run.completedAt ?? run.createdAt)}</time>
                </div>
                <label className="run-progress">
                  Обработано {run.processedCount} из {run.discoveredCount}
                  <progress max={maximum} value={Math.min(run.processedCount, maximum)} />
                </label>
                <p className="variant-meta">
                  Версия {run.sourceVersion ?? 'ещё не определена'} · ошибок {run.errorCount} ·{' '}
                  {run.errorCode ?? 'без общей ошибки'}
                  {run.retryOfSyncRunId === null
                    ? ''
                    : ` · повтор ${shortId(run.retryOfSyncRunId)}`}
                </p>
                {run.cancelRequestedAt === null ? null : (
                  <p className="inline-note">
                    Остановка запрошена {formatInstant(run.cancelRequestedAt)}.
                  </p>
                )}
                <details className="run-stages">
                  <summary>Этапы и checkpoints ({run.stages.length})</summary>
                  <div>
                    {run.stages.map((stage) => (
                      <p key={`${stage.stage}:${stage.partitionKey}`}>
                        <Status>{stage.status}</Status>
                        <strong>{stage.stage}</strong>
                        <span>
                          {stage.processedCount}/{stage.expectedCount} · ошибок {stage.errorCount} ·
                          resume {stage.resumeCount}
                        </span>
                      </p>
                    ))}
                  </div>
                </details>
                {isOwner && active && run.cancelRequestedAt === null ? (
                  <form action={cancelCatalogSync} className="run-command-form">
                    <input name="catalogSourceId" type="hidden" value={amigoPilotCatalogSourceId} />
                    <input name="syncRunId" type="hidden" value={run.id} />
                    <input
                      name="reason"
                      type="hidden"
                      value="Оператор запросил безопасную остановку после текущего checkpoint."
                    />
                    <label>
                      Введите ОСТАНОВИТЬ
                      <input autoComplete="off" name="confirmation" required />
                    </label>
                    <button className="button button-red" type="submit">
                      Остановить после checkpoint
                    </button>
                  </form>
                ) : null}
                {isOwner && retryable ? (
                  <form action={retryCatalogSync} className="run-command-form">
                    <input name="catalogSourceId" type="hidden" value={amigoPilotCatalogSourceId} />
                    <input name="syncRunId" type="hidden" value={run.id} />
                    <input
                      name="reason"
                      type="hidden"
                      value="Оператор подтвердил повтор с сохранёнными снимками и checkpoints."
                    />
                    <label>
                      Введите ПОВТОРИТЬ
                      <input autoComplete="off" name="confirmation" required />
                    </label>
                    <button className="button button-paper" type="submit">
                      Повторить безопасно
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="admin-section history-section" id="history">
        <div className="section-heading">
          <div>
            <p className="section-number">06 / IMMUTABLE LEDGER</p>
            <h2>История решений не переписывается</h2>
          </div>
        </div>
        <div className="history-grid">
          <div>
            <h3>Review batches</h3>
            {overview.reviewHistory.length === 0 ? (
              <p className="empty-state">Решений пока нет.</p>
            ) : (
              overview.reviewHistory.map((item) => (
                <article key={item.id}>
                  <Status>{item.resolution}</Status>
                  <strong>
                    {item.scope} · {item.selectionMode} · {item.affectedCount}
                  </strong>
                  <p>{item.safeReason}</p>
                  <small>
                    {formatInstant(item.createdAt)} · {shortId(item.id)}
                  </small>
                </article>
              ))
            )}
          </div>
          <div>
            <h3>Bulk commands</h3>
            {overview.bulkHistory.length === 0 ? (
              <p className="empty-state">Массовых команд пока нет.</p>
            ) : (
              overview.bulkHistory.map((item) => (
                <article key={item.id}>
                  <Status>{item.selectorMode}</Status>
                  <strong>
                    совпало {item.matchedCount} · изменено {item.affectedCount}
                  </strong>
                  <p>{item.safeReason}</p>
                  <small>
                    {formatInstant(item.createdAt)} · {shortId(item.id)}
                  </small>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
