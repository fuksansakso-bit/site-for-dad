import { CatalogReadError } from '@project-name/catalog';
import type { PublicCatalogMaterial } from '@project-name/contracts/catalog';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import {
  selectCatalogPublicMaterial,
  type CatalogPublicMaterialPage,
} from '../../../lib/catalog-public';
import { getWebCatalogRead } from '../../../lib/catalog-runtime';
import { ShareLinkButton } from '../share-link-button';

export const dynamic = 'force-dynamic';

interface CatalogMaterialPageProps {
  readonly params: Promise<{ readonly slug: string }>;
}

const rubleFormatter = new Intl.NumberFormat('ru-RU', {
  currency: 'RUB',
  maximumFractionDigits: 0,
  style: 'currency',
});

const materialSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const loadMaterial = cache(async (slug: string): Promise<CatalogPublicMaterialPage | null> => {
  if (slug.length > 128 || !materialSlugPattern.test(slug)) return null;
  return selectCatalogPublicMaterial(await getWebCatalogRead().getPublicCatalog(), slug);
});

function priceLabel(item: PublicCatalogMaterial): string {
  if (item.price.status === 'PRICE_ON_REQUEST' || item.price.amountMinor === null) {
    return 'Цена по запросу';
  }
  const value = rubleFormatter.format(item.price.amountMinor / 100);
  return item.price.kind === 'FROM' ? `от ${value}` : value;
}

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

export async function generateMetadata({ params }: CatalogMaterialPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const selected = await loadMaterial(slug);
    if (selected === null) return { title: 'Материал не найден · PROJECT_NAME' };
    const item = selected.item;
    return {
      alternates: { canonical: `/catalog/${item.slug}` },
      description:
        item.description ??
        `${item.materialName}, ${item.color?.name ?? item.name}. Артикул ${item.article}.`,
      robots: { follow: false, index: false },
      title: `${item.materialName} · ${item.color?.name ?? item.name} · PROJECT_NAME`,
    };
  } catch (error) {
    if (error instanceof CatalogReadError) {
      return { title: 'Каталог временно недоступен · PROJECT_NAME' };
    }
    throw error;
  }
}

function CatalogDetailHeader(): React.JSX.Element {
  return (
    <header className="catalog-topbar">
      <Link aria-label="PROJECT_NAME — каталог" href="/catalog">
        <span className="catalog-brand-mark" aria-hidden="true">
          P
        </span>
        <strong>PROJECT_NAME</strong>
      </Link>
      <span>Карточка материала</span>
    </header>
  );
}

export default async function CatalogMaterialPage({
  params,
}: CatalogMaterialPageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const selected = await loadMaterial(slug);
  if (selected === null) notFound();
  const item = selected.item;

  return (
    <main className="catalog-shell catalog-detail-shell">
      <CatalogDetailHeader />
      <nav className="catalog-detail-breadcrumb" aria-label="Хлебные крошки">
        <Link href="/catalog">Каталог</Link>
        {item.category.path.map((segment) => (
          <span key={segment.id}>
            <span aria-hidden="true">/</span>
            <Link href={`/catalog?category=${encodeURIComponent(segment.slug)}`}>
              {segment.name}
            </Link>
          </span>
        ))}
        <span>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{item.color?.name ?? item.name}</span>
        </span>
      </nav>

      <article className="catalog-detail">
        <div className="catalog-detail-media">
          <Image
            alt={`${item.materialName}, ${item.color?.name ?? item.name}`}
            height={item.media.height}
            priority
            sizes="(max-width: 900px) 100vw, 58vw"
            src={item.media.url}
            unoptimized
            width={item.media.width}
          />
          <div>
            <span>Локальное изображение</span>
            <span>CatalogVersion v{selected.version.versionNumber}</span>
          </div>
        </div>

        <div className="catalog-detail-copy">
          <p className="catalog-eyebrow">{item.category.name}</p>
          <h1>{item.materialName}</h1>
          <p className="catalog-detail-variant">{item.color?.name ?? item.name}</p>
          <p className="catalog-detail-article">Артикул {item.article}</p>

          <div className="catalog-detail-price">
            <strong>{priceLabel(item)}</strong>
            <span
              className={`catalog-availability catalog-availability-${item.availability.toLowerCase()}`}
            >
              {availabilityLabel(item.availability)}
            </span>
            <small>
              Базовая цена материала. Стоимость готового изделия зависит от размера и системы.
            </small>
          </div>

          {item.description === null ? null : (
            <p className="catalog-detail-description">{item.description}</p>
          )}

          <dl className="catalog-detail-facts">
            <div>
              <dt>Система</dt>
              <dd>{item.system?.name ?? 'Уточняется при подборе'}</dd>
            </div>
            <div>
              <dt>Ширина материала</dt>
              <dd>{item.widthMm === null ? 'Не указана' : `${item.widthMm / 10} см`}</dd>
            </div>
            <div>
              <dt>Светозащита</dt>
              <dd>{item.isBlackout ? 'Blackout' : 'Рассеивающий материал'}</dd>
            </div>
            <div>
              <dt>Тип</dt>
              <dd>{item.isZebra ? 'День–ночь' : item.category.name}</dd>
            </div>
          </dl>

          <div className="catalog-detail-actions">
            <Link href={`/catalog?category=${encodeURIComponent(item.category.slug)}`}>
              Все материалы категории
            </Link>
            <ShareLinkButton />
          </div>
        </div>
      </article>

      <section className="catalog-detail-note" aria-label="О данных каталога">
        <span>Проверенная версия</span>
        <p>
          Эта карточка собрана из активных локальных CatalogVersion v
          {selected.version.versionNumber} и PriceVersion v{selected.priceVersion.versionNumber}.
          Страница не обращается к AMIGO во время просмотра.
        </p>
      </section>
    </main>
  );
}
