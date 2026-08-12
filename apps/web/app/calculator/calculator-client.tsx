'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { PublicMaterial } from '../../lib/phase2a/types';
import { formatMoney } from '../../lib/phase2a/pricing';
function initialDimension(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= 100 && parsed <= 10_000 ? parsed : fallback;
}

export function CalculatorClient({
  initialHeight,
  initialMaterialSlug,
  initialWidth,
  materials,
}: {
  initialHeight?: string;
  initialMaterialSlug?: string;
  initialWidth?: string;
  materials: PublicMaterial[];
}) {
  const initialMaterial = materials.find((material) => material.slug === initialMaterialSlug);
  const categories = useMemo(
    () => Array.from(new Map(materials.map((m) => [m.category_slug, m.category_name])).entries()),
    [materials],
  );
  const [categorySlug, setCategorySlug] = useState(initialMaterial?.category_slug ?? categories[0]?.[0] ?? ''),
    [materialSlug, setMaterialSlug] = useState(
      initialMaterial?.slug ??
        materials.find((m) => m.category_slug === (categories[0]?.[0] ?? ''))?.slug ??
        '',
    ),
    [width, setWidth] = useState(initialDimension(initialWidth, 1000)),
    [height, setHeight] = useState(initialDimension(initialHeight, 1500)),
    [quantity, setQuantity] = useState(1),
    [result, setResult] = useState('');
  const options = materials.filter((m) => m.category_slug === categorySlug);
  async function calculate() {
    const r = await fetch('/api/phase2a/price', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([{ materialSlug, widthMm: width, heightMm: height, quantity }]),
    });
    const b = await r.json();
    setResult(
      r.ok
        ? b.items[0].totalPriceKopecks === null
          ? 'Стоимость уточнит менеджер'
          : formatMoney(b.items[0].totalPriceKopecks)
        : b.message,
    );
  }
  return (
    <div className="form">
      <label>
        Категория
        <select
          value={categorySlug}
          onChange={(e) => {
            setCategorySlug(e.target.value);
            setMaterialSlug(materials.find((m) => m.category_slug === e.target.value)?.slug ?? '');
          }}
        >
          {categories.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Материал
        <select value={materialSlug} onChange={(e) => setMaterialSlug(e.target.value)}>
          {options.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name} — {m.article}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ширина, мм
        <input
          type="number"
          min="100"
          max="10000"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
        />
      </label>
      <label>
        Высота, мм
        <input
          type="number"
          min="100"
          max="10000"
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
        />
      </label>
      <label>
        Количество
        <input
          type="number"
          min="1"
          max="100"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />
      </label>
      <button disabled={!materialSlug} onClick={calculate}>
        Рассчитать
      </button>
      <p className="price" aria-live="polite">
        {result}
      </p>
      {result && materialSlug && (
        <Link
          className="button secondary"
          href={`/visualizer?material=${encodeURIComponent(materialSlug)}&width=${width}&height=${height}`}
        >
          Примерить на своём окне
        </Link>
      )}
      <p>Замер, доставка и установка — бесплатно.</p>
    </div>
  );
}
