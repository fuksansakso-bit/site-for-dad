'use client';
/* eslint-disable @next/next/no-img-element -- paths are runtime Supabase Storage objects configured by migration. */
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PublicMaterial } from '../../lib/phase2a/types';
import { formatMoney } from '../../lib/phase2a/pricing';
function publicImageUrl(path: string | null) {
  const base = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  return base && path ? `${base}/storage/v1/object/public/catalog/${path}` : null;
}
export function CatalogClient({ materials }: { materials: PublicMaterial[] }) {
  const [query, setQuery] = useState('');
  const [availability, setAvailability] = useState('');
  const filtered = useMemo(
    () =>
      materials.filter(
        (m) =>
          (!query ||
            `${m.name} ${m.article} ${m.color_name ?? ''}`
              .toLowerCase()
              .includes(query.toLowerCase())) &&
          (!availability || m.availability_label === availability),
      ),
    [materials, query, availability],
  );
  return (
    <>
      <div className="actions">
        <input
          aria-label="Поиск"
          placeholder="Название, артикул или цвет"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Наличие"
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="">Любое наличие</option>
          <option value="В наличии">В наличии</option>
          <option value="Нет в наличии">Нет в наличии</option>
          <option value="Уточнить наличие">Уточнить наличие</option>
        </select>
      </div>
      <p className="muted">Найдено: {filtered.length}</p>
      <div className="grid">
        {filtered.map((m) => (
          <article className="card" key={m.slug}>
            <Link href={`/catalog/${m.slug}`}>
            {publicImageUrl(m.primary_image_path) && (
              <img loading="lazy" src={publicImageUrl(m.primary_image_path)!} alt="" />
            )}
            <span className="badge">{m.availability_label}</span>
            <h3>{m.name}</h3>
            <p className="muted">
              Артикул {m.article}
              {m.color_name ? ` • ${m.color_name}` : ''}
            </p>
            <p className="price">
              {m.display_price_kopecks === null
                ? 'Стоимость уточнит менеджер'
                : `${formatMoney(m.display_price_kopecks)} ${m.display_price_suffix ?? ''}`}
            </p>
            </Link>
            {m.primary_image_path && (
              <Link
                className="button secondary catalog-visualizer-button"
                href={`/visualizer?material=${encodeURIComponent(m.slug)}`}
              >
                Примерить на своём окне
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
