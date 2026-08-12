'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';

import { EmptyState, StatusBadge } from '../../components/ui/primitives';
import { formatMoney } from '../../lib/phase2a/pricing';
import type { Category, PublicMaterial } from '../../lib/phase2a/types';

type CatalogSort = 'default' | 'name' | 'price-asc' | 'price-desc';

function publicImageUrl(path: string | null): string | null {
  const base = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  return base && path ? `${base}/storage/v1/object/public/catalog/${path}` : null;
}

function availabilityTone(label: string): 'neutral' | 'success' | 'warning' | 'error' {
  const normalized = label.toLocaleLowerCase('ru-RU');
  if (normalized.includes('нет') || normalized.includes('недоступ')) return 'error';
  if (normalized.includes('уточ')) return 'warning';
  if (normalized.includes('налич') || normalized.includes('доступ')) return 'success';
  return 'neutral';
}

export function CatalogClient({
  aiEnabled,
  categories,
  initialCategory,
  materials,
}: {
  aiEnabled: boolean;
  categories: Category[];
  initialCategory?: string;
  materials: PublicMaterial[];
}) {
  const validInitialCategory = categories.some((category) => category.slug === initialCategory)
    ? (initialCategory ?? '')
    : '';
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('ru-RU'));
  const [category, setCategory] = useState(validInitialCategory);
  const [availability, setAvailability] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [sort, setSort] = useState<CatalogSort>('default');
  const [visibleCount, setVisibleCount] = useState(24);

  const availabilityOptions = useMemo(
    () => Array.from(new Set(materials.map((material) => material.availability_label))).sort(),
    [materials],
  );
  const materialTypes = useMemo(
    () =>
      Array.from(
        new Set(materials.map((material) => material.material_type).filter(Boolean) as string[]),
      ).sort(),
    [materials],
  );
  const filtered = useMemo(() => {
    const indexed = materials
      .map((material, index) => ({ index, material }))
      .filter(({ material }) => {
        const haystack = `${material.name} ${material.article} ${material.color_name ?? ''}`
          .toLocaleLowerCase('ru-RU')
          .trim();
        return (
          (!deferredQuery || haystack.includes(deferredQuery)) &&
          (!category || material.category_slug === category) &&
          (!availability || material.availability_label === availability) &&
          (!materialType || material.material_type === materialType)
        );
      });

    indexed.sort((left, right) => {
      if (sort === 'name') return left.material.name.localeCompare(right.material.name, 'ru');
      if (sort === 'price-asc' || sort === 'price-desc') {
        const leftPrice = left.material.display_price_kopecks;
        const rightPrice = right.material.display_price_kopecks;
        if (leftPrice == null && rightPrice == null) return left.index - right.index;
        if (leftPrice == null) return 1;
        if (rightPrice == null) return -1;
        return sort === 'price-asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
      }
      return left.index - right.index;
    });
    return indexed.map(({ material }) => material);
  }, [availability, category, deferredQuery, materialType, materials, sort]);

  const hasFilters = Boolean(
    query || category || availability || materialType || sort !== 'default',
  );
  const visibleMaterials = filtered.slice(0, visibleCount);

  function resetFilters() {
    setQuery('');
    setCategory('');
    setAvailability('');
    setMaterialType('');
    setSort('default');
    setVisibleCount(24);
  }

  return (
    <>
      <div className="catalog-category-tabs" role="group" aria-label="Категории материалов">
        <button
          aria-pressed={!category}
          className="catalog-category-tab"
          onClick={() => {
            setCategory('');
            setVisibleCount(24);
          }}
          type="button"
        >
          Все
        </button>
        {categories.map((item) => (
          <button
            aria-pressed={category === item.slug}
            className="catalog-category-tab"
            key={item.slug}
            onClick={() => {
              setCategory(item.slug);
              setVisibleCount(24);
            }}
            type="button"
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="catalog-toolbar">
        <label className="catalog-search">
          <span>Поиск</span>
          <input
            placeholder="Название, артикул или цвет"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(24);
            }}
          />
        </label>
        <label>
          <span>Наличие</span>
          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value);
              setVisibleCount(24);
            }}
          >
            <option value="">Любое</option>
            {availabilityOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {materialTypes.length > 1 && (
          <label>
            <span>Тип материала</span>
            <select
              value={materialType}
              onChange={(event) => {
                setMaterialType(event.target.value);
                setVisibleCount(24);
              }}
            >
              <option value="">Все типы</option>
              {materialTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <span>Сортировка</span>
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as CatalogSort);
              setVisibleCount(24);
            }}
          >
            <option value="default">По умолчанию</option>
            <option value="name">По названию</option>
            <option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option>
          </select>
        </label>
      </div>

      <div className="catalog-results-line" aria-live="polite">
        <p>
          Найдено <strong>{filtered.length}</strong>
        </p>
        {hasFilters && (
          <button
            className="button button-quiet button-compact"
            onClick={resetFilters}
            type="button"
          >
            Сбросить фильтры
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="catalog-grid">
          {visibleMaterials.map((material) => {
            const imageUrl = publicImageUrl(material.primary_image_path);
            return (
              <article className="catalog-card" key={material.slug}>
                <Link className="catalog-card-main" href={`/catalog/${material.slug}`}>
                  <span className="catalog-card-media">
                    {imageUrl ? (
                      <Image
                        alt={`${material.name}${material.color_name ? `, ${material.color_name}` : ''}`}
                        fill
                        sizes="(max-width: 520px) 100vw, (max-width: 900px) 50vw, (max-width: 1280px) 33vw, 25vw"
                        src={imageUrl}
                      />
                    ) : (
                      <span className="catalog-card-placeholder" aria-hidden="true" />
                    )}
                    <StatusBadge tone={availabilityTone(material.availability_label)}>
                      {material.availability_label}
                    </StatusBadge>
                  </span>
                  <span className="catalog-card-copy">
                    <small>{material.category_name}</small>
                    <strong>{material.name}</strong>
                    <span>
                      Артикул {material.article}
                      {material.color_name ? ` · ${material.color_name}` : ''}
                    </span>
                    <b>
                      {material.display_price_kopecks === null
                        ? 'Стоимость уточнит менеджер'
                        : `${formatMoney(material.display_price_kopecks)} ${material.display_price_suffix ?? ''}`}
                    </b>
                  </span>
                </Link>
                <div className="catalog-card-actions">
                  <Link className="text-link" href={`/catalog/${material.slug}`}>
                    Подробнее <span aria-hidden="true">→</span>
                  </Link>
                  {aiEnabled && imageUrl && (
                    <Link
                      className="text-link"
                      href={`/visualizer?material=${encodeURIComponent(material.slug)}`}
                    >
                      AI-примерка
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          action={
            <button className="button" onClick={resetFilters} type="button">
              Сбросить фильтры
            </button>
          }
          description="Попробуйте изменить запрос, категорию или параметры наличия."
          title="По этим условиям ничего не найдено"
        />
      )}
      {visibleCount < filtered.length && (
        <div className="catalog-load-more">
          <button
            className="button button-secondary"
            onClick={() => setVisibleCount((current) => current + 24)}
            type="button"
          >
            Показать ещё
          </button>
          <span>
            Показано {visibleMaterials.length} из {filtered.length}
          </span>
        </div>
      )}
    </>
  );
}
