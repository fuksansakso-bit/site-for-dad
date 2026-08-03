import { CatalogReadError } from '@project-name/catalog';
import type {
  PublicCatalogCategoryFacet,
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
  description: 'Активный локальный каталог материалов и систем для оконного декора.',
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

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function availabilityLabel(value: PublicCatalogMaterial['availability']): string {
  switch (value) {
    case 'IN_STOCK':
      return 'Есть в наличии';
    case 'OUT_OF_STOCK':
      return 'Нет в наличии';
    case 'INQUIRY_ONLY':
      return 'Уточнить наличие';
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
  emptyLabel: string,
): React.JSX.Element {
  return (
    <>
      <option value="">{emptyLabel}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label} · {option.count}
        </option>
      ))}
    </>
  );
}

function categoryOptions(options: readonly PublicCatalogCategoryFacet[]): React.JSX.Element {
  return (
    <>
      <option value="">Все категории</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {`${'— '.repeat(option.depth)}${option.label} · ${option.count}`}
        </option>
      ))}
    </>
  );
}

function catalogHref(
  query: PublicCatalogQuery,
  overrides: Readonly<Record<string, string | undefined>>,
): string {
  const parameters = catalogPublicSearchParameters(query, overrides);
  const value = parameters.toString();
  return value.length === 0 ? '/catalog' : `/catalog?${value}`;
}

function materialCard(item: PublicCatalogMaterial, sequence: number): React.JSX.Element {
  return (
    <article className="catalog-card" key={item.id}>
      <Link aria-label={`Открыть ${item.name}`} href={`/catalog/${item.slug}`}>
        <div className="catalog-card-image">
          <Image
            alt={`${item.materialName}, ${item.color?.name ?? item.name}`}
            height={item.media.height}
            sizes="(max-width: 720px) 100vw, (max-width: 1120px) 50vw, 33vw"
            src={item.media.url}
            unoptimized
            width={item.media.width}
          />
          <span className="catalog-card-index" aria-hidden="true">
            {String(sequence).padStart(2, '0')}
          </span>
          <span
            className={`catalog-availability catalog-availability-${item.availability.toLowerCase()}`}
          >
            {availabilityLabel(item.availability)}
          </span>
        </div>
        <div className="catalog-card-copy">
          <div className="catalog-card-kicker">
            <span>{item.category.name}</span>
            <span>{item.system?.name ?? 'Система уточняется'}</span>
          </div>
          <div className="catalog-card-title-row">
            <div>
              <h2>{item.materialName}</h2>
              <p>
                {item.color?.name ?? item.name} · арт. {item.article}
              </p>
            </div>
            <span aria-hidden="true">↗</span>
          </div>
          <div className="catalog-card-tags" aria-label="Свойства материала">
            {item.isBlackout ? <span>Blackout</span> : null}
            {item.isZebra ? <span>День–ночь</span> : null}
            {item.widthMm === null ? null : <span>ширина {item.widthMm / 10} см</span>}
          </div>
          <div className="catalog-card-footer">
            <strong>{priceLabel(item)}</strong>
            <small>Базовая цена материала, не расчёт изделия</small>
          </div>
        </div>
      </Link>
    </article>
  );
}

function hasFilters(query: PublicCatalogQuery): boolean {
  return (
    query.q.length > 0 ||
    query.category !== undefined ||
    query.system !== undefined ||
    query.color !== undefined ||
    query.availability !== undefined ||
    query.blackout ||
    query.zebra ||
    query.sort !== 'featured'
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
        <Link className="catalog-text-link" href="/catalog">
          Сбросить фильтры
        </Link>
      ) : null}
    </section>
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

function CatalogCategoryRail({
  categories,
  query,
}: {
  readonly categories: readonly PublicCatalogCategoryFacet[];
  readonly query: PublicCatalogQuery;
}): React.JSX.Element {
  return (
    <nav className="catalog-category-rail" aria-label="Иерархия категорий">
      <div>
        <span>Коллекции</span>
        <strong>{categories.length}</strong>
      </div>
      <Link
        aria-current={query.category === undefined ? 'page' : undefined}
        href={catalogHref(query, { category: undefined, cursor: undefined })}
      >
        <span>Все материалы</span>
      </Link>
      {categories.map((category) => (
        <Link
          aria-current={query.category === category.value ? 'page' : undefined}
          data-depth={Math.min(category.depth, 4)}
          href={catalogHref(query, { category: category.value, cursor: undefined })}
          key={category.value}
        >
          <span>{category.label}</span>
          <small>{category.count}</small>
        </Link>
      ))}
    </nav>
  );
}

function CatalogBreadcrumb({
  category,
  query,
}: {
  readonly category: PublicCatalogCategoryFacet | undefined;
  readonly query: PublicCatalogQuery;
}): React.JSX.Element | null {
  if (category === undefined) return null;
  return (
    <nav className="catalog-breadcrumb" aria-label="Выбранная категория">
      <Link href={catalogHref(query, { category: undefined, cursor: undefined })}>Каталог</Link>
      {category.path.map((segment) => (
        <span key={segment.id}>
          <span aria-hidden="true">/</span>
          <Link href={catalogHref(query, { category: segment.slug, cursor: undefined })}>
            {segment.name}
          </Link>
        </span>
      ))}
    </nav>
  );
}

function invalidCatalogRequest(title: string, copy: string): React.JSX.Element {
  return (
    <main className="catalog-shell">
      <CatalogHeader />
      <section className="catalog-state catalog-state-error">
        <span>Ссылка не принята</span>
        <h1>{title}</h1>
        <p>{copy}</p>
        <Link className="catalog-text-link" href="/catalog">
          Открыть каталог
        </Link>
      </section>
    </main>
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
    return invalidCatalogRequest(
      'Фильтры не удалось применить',
      'Ссылка повреждена или содержит неподдерживаемый фильтр.',
    );
  }

  let page: CatalogPublicPage | null = null;
  let unavailable = false;
  try {
    const snapshot = await getWebCatalogRead().getPublicCatalog();
    page = selectCatalogPublicPage(snapshot, query, getWebCatalogSigningKey());
  } catch (error) {
    if (error instanceof CatalogPublicQueryError) {
      return invalidCatalogRequest(
        'Страница каталога изменилась',
        'Активная версия или набор фильтров обновились. Откройте каталог заново.',
      );
    }
    if (error instanceof CatalogReadError) unavailable = true;
    else throw error;
  }

  const selectedCategory = page?.facets.categories.find(
    (category) => category.value === query.category,
  );

  return (
    <main className="catalog-shell">
      <CatalogHeader />
      <section className="catalog-hero" aria-labelledby="catalog-title">
        <div className="catalog-hero-copy">
          <p className="catalog-eyebrow">Активная коллекция · AMIGO</p>
          <h1 id="catalog-title">
            Свет сначала —
            <br />
            материал потом
          </h1>
          <p>
            Изучайте ткани, цвета и системы по задаче: мягко рассеять день, создать приватность или
            затемнить комнату.
          </p>
        </div>
        <aside className="catalog-hero-note" aria-label="Статус каталога">
          <span>
            {page?.version === null || page === null ? '—' : `v${page.version.versionNumber}`}
          </span>
          <strong>{page?.total ?? 0}</strong>
          <small>материалов в текущей выборке</small>
          <p>
            {page?.version === null || page === null
              ? 'Ожидается активация проверенной локальной версии.'
              : `Версия от ${dateFormatter.format(new Date(page.version.activatedAt))}. Изображения хранятся локально.`}
          </p>
        </aside>
      </section>

      <section className="catalog-workbench" aria-label="Навигация и фильтры">
        <CatalogCategoryRail categories={page?.facets.categories ?? []} query={query} />
        <div className="catalog-filter-panel">
          <div className="catalog-filter-heading">
            <div>
              <span>Фильтр коллекции</span>
              <strong>Найдите свой материал</strong>
            </div>
            {hasFilters(query) ? (
              <Link className="catalog-reset-link" href="/catalog">
                Сбросить всё
              </Link>
            ) : null}
          </div>
          <form action="/catalog" className="catalog-filter-form" method="get">
            <label className="catalog-search-field">
              <span>Поиск</span>
              <input
                defaultValue={query.q}
                maxLength={80}
                name="q"
                placeholder="Ткань, цвет или артикул"
                type="search"
              />
            </label>
            <label>
              <span>Категория</span>
              <select defaultValue={query.category ?? ''} name="category">
                {categoryOptions(page?.facets.categories ?? [])}
              </select>
            </label>
            <label>
              <span>Система</span>
              <select defaultValue={query.system ?? ''} name="system">
                {facetOptions(page?.facets.systems ?? [], 'Все системы')}
              </select>
            </label>
            <label>
              <span>Цвет</span>
              <select defaultValue={query.color ?? ''} name="color">
                {facetOptions(page?.facets.colors ?? [], 'Все цвета')}
              </select>
            </label>
            <label>
              <span>Наличие</span>
              <select defaultValue={query.availability ?? ''} name="availability">
                {facetOptions(page?.facets.availability ?? [], 'Любое наличие')}
              </select>
            </label>
            <label>
              <span>Сортировка</span>
              <select defaultValue={query.sort} name="sort">
                <option value="featured">Сначала рекомендуемые</option>
                <option value="name-asc">По названию</option>
                <option value="price-asc">Цена: сначала ниже</option>
                <option value="price-desc">Цена: сначала выше</option>
              </select>
            </label>
            <fieldset className="catalog-feature-field">
              <legend>Свойства</legend>
              <label>
                <input
                  defaultChecked={query.blackout}
                  name="blackout"
                  type="checkbox"
                  value="true"
                />
                Blackout
              </label>
              <label>
                <input defaultChecked={query.zebra} name="zebra" type="checkbox" value="true" />
                День–ночь
              </label>
            </fieldset>
            <button type="submit">Показать</button>
          </form>
        </div>
      </section>

      <CatalogBreadcrumb category={selectedCategory} query={query} />

      <div className="catalog-results-heading" aria-live="polite">
        <div>
          <span>{selectedCategory?.label ?? 'Все материалы'}</span>
          <p>
            <strong>{page?.total ?? 0}</strong> в активной версии
          </p>
        </div>
        <p>Цена материала не является расчётом готового изделия.</p>
      </div>

      {unavailable ? <CatalogUnavailable /> : null}
      {!unavailable && page !== null && page.items.length === 0 ? (
        <CatalogEmpty filtered={page.version !== null && hasFilters(query)} />
      ) : null}
      {!unavailable && page !== null && page.items.length > 0 ? (
        <section className="catalog-grid" aria-label="Материалы">
          {page.items.map((item, index) => materialCard(item, index + 1))}
        </section>
      ) : null}

      {page?.nextCursor === null || page?.nextCursor === undefined ? null : (
        <nav className="catalog-pagination" aria-label="Пагинация каталога">
          <span>В этой выборке есть ещё материалы</span>
          <Link href={catalogHref(query, { cursor: page.nextCursor })}>
            Следующая страница <span aria-hidden="true">→</span>
          </Link>
        </nav>
      )}

      <footer className="catalog-footer">
        <p>PROJECT_NAME · Phase 1B.2 full catalog</p>
        <p>Витрина не запускает расчёт, конфигуратор или оформление заказа.</p>
      </footer>
    </main>
  );
}
