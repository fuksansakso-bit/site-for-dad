import { CatalogReadError } from '@project-name/catalog';
import type {
  PublicCatalogFacetOption,
  PublicCatalogMaterial,
  PublicCatalogQuery,
} from '@project-name/contracts/catalog';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import {
  CatalogPublicQueryError,
  catalogPublicSearchParameters,
  parseCatalogPublicQuery,
  selectCatalogPublicPage,
  type CatalogPublicPage,
} from '../../lib/catalog-public';
import { getWebCatalogRead, getWebCatalogSigningKey } from '../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Пилотный каталог материалов жалюзи из активной проверенной локальной версии.',
  robots: { follow: false, index: false },
  title: 'Каталог материалов · PROJECT_NAME',
};

interface CatalogPageProps {
  readonly searchParams: Promise<Readonly<Record<string, string | readonly string[] | undefined>>>;
}

const rubleFormatter = new Intl.NumberFormat('ru-RU', {
  currency: 'RUB',
  maximumFractionDigits: 0,
  style: 'currency',
});

function availabilityLabel(value: PublicCatalogMaterial['availability']): string {
  switch (value) {
    case 'IN_STOCK':
      return 'Материал доступен';
    case 'OUT_OF_STOCK':
      return 'Временно нет в наличии';
    case 'INQUIRY_ONLY':
      return 'Наличие по запросу';
  }
}

function priceLabel(item: PublicCatalogMaterial): string {
  if (item.price.status === 'PRICE_ON_REQUEST' || item.price.amountMinor === null) {
    return 'Цена по запросу';
  }
  const value = rubleFormatter.format(item.price.amountMinor / 100);
  return item.price.kind === 'FROM' ? `от ${value}` : value;
}

function facetOptions(
  options: readonly PublicCatalogFacetOption[],
  selected: string | undefined,
  emptyLabel: string,
): React.JSX.Element {
  return (
    <>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} · {option.count}
          {selected === option.value ? ' ✓' : ''}
        </option>
      ))}
    </>
  );
}

function materialCard(item: PublicCatalogMaterial): React.JSX.Element {
  return (
    <article className="catalog-card" key={item.id}>
      <div className="catalog-card-image">
        <Image
          alt={`${item.materialName}, ${item.color?.name ?? item.name}`}
          height={item.media.height}
          sizes="(max-width: 720px) 100vw, (max-width: 1120px) 50vw, 33vw"
          src={item.media.url}
          unoptimized
          width={item.media.width}
        />
        <div className="catalog-card-index" aria-hidden="true">
          {item.article.slice(-4)}
        </div>
      </div>
      <div className="catalog-card-copy">
        <div className="catalog-card-kicker">
          <span>{item.category.name}</span>
          <span>{item.system?.name ?? 'Система уточняется'}</span>
        </div>
        <h2>{item.materialName}</h2>
        <p className="catalog-card-variant">
          {item.color?.name ?? item.name} · арт. {item.article}
        </p>
        {item.description === null ? null : (
          <p className="catalog-card-description">{item.description}</p>
        )}
        <div className="catalog-card-tags" aria-label="Свойства материала">
          {item.isBlackout ? <span>Blackout</span> : null}
          {item.isZebra ? <span>Зебра</span> : null}
          {item.widthMm === null ? null : <span>ширина {item.widthMm / 10} см</span>}
        </div>
        <div className="catalog-card-footer">
          <div>
            <strong>{priceLabel(item)}</strong>
            <small>Базовая цена материала, не расчёт изделия</small>
          </div>
          <span
            className={`catalog-availability catalog-availability-${item.availability.toLowerCase()}`}
          >
            {availabilityLabel(item.availability)}
          </span>
        </div>
      </div>
    </article>
  );
}

function resetHref(): string {
  return '/catalog';
}

function nextHref(query: PublicCatalogQuery, cursor: string): string {
  return `/catalog?${catalogPublicSearchParameters(query, { cursor }).toString()}`;
}

function hasFilters(query: PublicCatalogQuery): boolean {
  return (
    query.q.length > 0 ||
    query.category !== undefined ||
    query.system !== undefined ||
    query.color !== undefined ||
    query.availability !== undefined ||
    query.blackout ||
    query.zebra
  );
}

function CatalogUnavailable(): React.JSX.Element {
  return (
    <section className="catalog-state" aria-labelledby="catalog-unavailable-title">
      <span>Временная пауза</span>
      <h2 id="catalog-unavailable-title">Каталог сейчас недоступен</h2>
      <p>
        Мы не показываем устаревшие или непроверенные данные. Попробуйте открыть страницу позже.
      </p>
    </section>
  );
}

function CatalogEmpty({ filtered }: { readonly filtered: boolean }): React.JSX.Element {
  return (
    <section className="catalog-state" aria-labelledby="catalog-empty-title">
      <span>{filtered ? '0 совпадений' : 'Публикация готовится'}</span>
      <h2 id="catalog-empty-title">
        {filtered ? 'Материалы не найдены' : 'Каталог ещё не активирован'}
      </h2>
      <p>
        {filtered
          ? 'Измените запрос или сбросьте один из фильтров.'
          : 'Здесь появятся только материалы из одобренной и активированной локальной версии.'}
      </p>
      {filtered ? (
        <Link className="catalog-text-link" href={resetHref()}>
          Сбросить фильтры
        </Link>
      ) : null}
    </section>
  );
}

export default async function CatalogPage({
  searchParams,
}: CatalogPageProps): Promise<React.JSX.Element> {
  const rawParameters = await searchParams;
  let query: PublicCatalogQuery;
  try {
    query = parseCatalogPublicQuery(rawParameters);
  } catch (error) {
    if (!(error instanceof CatalogPublicQueryError)) throw error;
    return (
      <main className="catalog-shell">
        <CatalogHeader />
        <section className="catalog-state catalog-state-error">
          <span>Некорректный запрос</span>
          <h1>Фильтры не удалось применить</h1>
          <p>Ссылка повреждена или устарела. Вернитесь к началу каталога.</p>
          <Link className="catalog-text-link" href={resetHref()}>
            Открыть каталог
          </Link>
        </section>
      </main>
    );
  }

  let page: CatalogPublicPage | null = null;
  let unavailable = false;
  try {
    const snapshot = await getWebCatalogRead().getPublicCatalog();
    page = selectCatalogPublicPage(snapshot, query, getWebCatalogSigningKey());
  } catch (error) {
    if (error instanceof CatalogPublicQueryError) {
      return (
        <main className="catalog-shell">
          <CatalogHeader />
          <section className="catalog-state catalog-state-error">
            <span>Ссылка устарела</span>
            <h1>Страница каталога изменилась</h1>
            <p>Активная версия или набор фильтров обновились. Откройте каталог заново.</p>
            <Link className="catalog-text-link" href={resetHref()}>
              Обновить каталог
            </Link>
          </section>
        </main>
      );
    }
    if (error instanceof CatalogReadError) unavailable = true;
    else throw error;
  }

  return (
    <main className="catalog-shell">
      <CatalogHeader />
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div>
          <p className="catalog-eyebrow">Пилотная коллекция · AMIGO</p>
          <h1 id="catalog-title">Материалы, которые управляют светом</h1>
        </div>
        <div className="catalog-hero-note">
          <span>
            {page?.version === null || page === null ? '—' : `v${page.version.versionNumber}`}
          </span>
          <p>
            Только локально сохранённые изображения и проверенная активная версия — без hotlink и
            live-запросов к поставщику.
          </p>
        </div>
      </section>

      <section className="catalog-filter-panel" aria-label="Поиск и фильтры каталога">
        <form action="/catalog" className="catalog-filter-form" method="get">
          <label className="catalog-search-field">
            <span>Поиск</span>
            <input
              defaultValue={query.q}
              maxLength={80}
              name="q"
              placeholder="Название, цвет или артикул"
              type="search"
            />
          </label>
          <label>
            <span>Категория</span>
            <select defaultValue={query.category ?? ''} name="category">
              {facetOptions(page?.facets.categories ?? [], query.category, 'Все категории')}
            </select>
          </label>
          <label>
            <span>Система</span>
            <select defaultValue={query.system ?? ''} name="system">
              {facetOptions(page?.facets.systems ?? [], query.system, 'Все системы')}
            </select>
          </label>
          <label>
            <span>Цвет</span>
            <select defaultValue={query.color ?? ''} name="color">
              {facetOptions(page?.facets.colors ?? [], query.color, 'Все цвета')}
            </select>
          </label>
          <label>
            <span>Наличие</span>
            <select defaultValue={query.availability ?? ''} name="availability">
              {facetOptions(page?.facets.availability ?? [], query.availability, 'Любое наличие')}
            </select>
          </label>
          <fieldset className="catalog-feature-field">
            <legend>Особенности</legend>
            <label>
              <input defaultChecked={query.blackout} name="blackout" type="checkbox" value="true" />
              Blackout
            </label>
            <label>
              <input defaultChecked={query.zebra} name="zebra" type="checkbox" value="true" />
              Зебра
            </label>
          </fieldset>
          <button type="submit">Показать</button>
          {hasFilters(query) ? (
            <Link className="catalog-reset-link" href={resetHref()}>
              Сбросить
            </Link>
          ) : null}
        </form>
      </section>

      <div className="catalog-results-heading" aria-live="polite">
        <p>
          <strong>{page?.total ?? 0}</strong> {page?.total === 1 ? 'материал' : 'материалов'}
        </p>
        <span>Цена отображается только при наличии активной PriceVersion</span>
      </div>

      {unavailable ? <CatalogUnavailable /> : null}
      {!unavailable && page !== null && page.items.length === 0 ? (
        <CatalogEmpty filtered={page.version !== null && hasFilters(query)} />
      ) : null}
      {!unavailable && page !== null && page.items.length > 0 ? (
        <section className="catalog-grid" aria-label="Материалы">
          {page.items.map(materialCard)}
        </section>
      ) : null}

      {page?.nextCursor === null || page?.nextCursor === undefined ? null : (
        <nav className="catalog-pagination" aria-label="Пагинация каталога">
          <Link href={nextHref(query, page.nextCursor)}>Следующие материалы</Link>
        </nav>
      )}

      <footer className="catalog-footer">
        <p>PROJECT_NAME · Phase 1B.1 catalog pilot</p>
        <p>Публичная витрина не запускает расчёт, конфигуратор или оформление заказа.</p>
      </footer>
    </main>
  );
}

function CatalogHeader(): React.JSX.Element {
  return (
    <header className="catalog-topbar">
      <Link aria-label="PROJECT_NAME — каталог" href="/catalog">
        <span className="catalog-brand-mark" aria-hidden="true">
          P
        </span>
        <strong>PROJECT_NAME</strong>
      </Link>
      <span>Каталог материалов</span>
    </header>
  );
}
