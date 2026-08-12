'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Notice } from '../../components/ui/primitives';
import { readCart, writeCart } from '../../lib/phase2a/cart-storage';
import { formatMoney } from '../../lib/phase2a/pricing';
import { cartItemSchema } from '../../lib/phase2a/schemas';
import type { PricedItem, PublicMaterial } from '../../lib/phase2a/types';

type Calculation = {
  items: PricedItem[];
  knownTotalKopecks: number;
  pricingStatus: 'KNOWN' | 'MANUAL' | 'PARTIAL';
};

function initialDimension(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= 100 && parsed <= 10_000 ? parsed : fallback;
}

function publicImageUrl(path: string | null): string | null {
  const base = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  return base && path ? `${base}/storage/v1/object/public/catalog/${path}` : null;
}

export function CalculatorClient({
  aiEnabled,
  freeServices,
  initialHeight,
  initialMaterialSlug,
  initialWidth,
  materials,
}: {
  aiEnabled: boolean;
  freeServices: string[];
  initialHeight?: string;
  initialMaterialSlug?: string;
  initialWidth?: string;
  materials: PublicMaterial[];
}) {
  const initialMaterial = materials.find((material) => material.slug === initialMaterialSlug);
  const categories = useMemo(
    () =>
      Array.from(
        new Map(
          materials.map((material) => [material.category_slug, material.category_name]),
        ).entries(),
      ),
    [materials],
  );
  const [categorySlug, setCategorySlug] = useState(
    initialMaterial?.category_slug ?? categories[0]?.[0] ?? '',
  );
  const [materialSlug, setMaterialSlug] = useState(
    initialMaterial?.slug ??
      materials.find((material) => material.category_slug === (categories[0]?.[0] ?? ''))?.slug ??
      '',
  );
  const [width, setWidth] = useState(initialDimension(initialWidth, 1000));
  const [height, setHeight] = useState(initialDimension(initialHeight, 1500));
  const [quantity, setQuantity] = useState(1);
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'ready'>('idle');
  const [message, setMessage] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const options = materials.filter((material) => material.category_slug === categorySlug);
  const selectedMaterial = materials.find((material) => material.slug === materialSlug);
  const selectedImage = publicImageUrl(selectedMaterial?.primary_image_path ?? null);
  const result = calculation?.items[0];

  function resetResult() {
    setCalculation(null);
    setStatus('idle');
    setMessage('');
    setCartMessage('');
  }

  async function calculate() {
    const item = cartItemSchema.safeParse({
      heightMm: height,
      materialSlug,
      quantity,
      widthMm: width,
    });
    if (!item.success) {
      setStatus('error');
      setMessage('Проверьте размеры и количество. Допустимы размеры от 100 до 10 000 мм.');
      return;
    }
    setStatus('loading');
    setMessage('Проверяем материал и актуальную цену…');
    setCalculation(null);
    setCartMessage('');
    try {
      const response = await fetch('/api/phase2a/price', {
        body: JSON.stringify([item.data]),
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as Calculation & { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Расчёт временно недоступен.');
      setCalculation(body);
      setStatus('ready');
      setMessage('');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Расчёт временно недоступен.');
    }
  }

  function addToCart() {
    const item = cartItemSchema.safeParse({
      heightMm: height,
      materialSlug,
      quantity,
      widthMm: width,
    });
    if (!item.success || !calculation) {
      setCartMessage('Сначала выполните расчёт с корректными размерами.');
      return;
    }
    const stored = writeCart([...readCart(), item.data]);
    setCartMessage(
      stored ? 'Конфигурация добавлена в корзину.' : 'В корзине может быть не больше 50 позиций.',
    );
  }

  return (
    <div className="calculator-layout">
      <div className="calculator-form-panel">
        <div className="calculator-step">
          <span>01</span>
          <div>
            <h2>Выберите материал</h2>
            <p>Цена и наличие ещё раз проверяются на сервере при каждом расчёте.</p>
          </div>
        </div>
        <div className="calculator-controls calculator-material-controls">
          <label>
            Категория
            <select
              value={categorySlug}
              onChange={(event) => {
                const nextCategory = event.target.value;
                setCategorySlug(nextCategory);
                setMaterialSlug(
                  materials.find((material) => material.category_slug === nextCategory)?.slug ?? '',
                );
                resetResult();
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
            <select
              value={materialSlug}
              onChange={(event) => {
                setMaterialSlug(event.target.value);
                resetResult();
              }}
            >
              {options.map((material) => (
                <option key={material.slug} value={material.slug}>
                  {material.name} — {material.article}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="calculator-step">
          <span>02</span>
          <div>
            <h2>Укажите размеры</h2>
            <p>Введите размеры одного изделия в миллиметрах и количество одинаковых изделий.</p>
          </div>
        </div>
        <div className="calculator-controls calculator-dimension-controls">
          <label>
            Ширина, мм
            <input
              inputMode="numeric"
              max="10000"
              min="100"
              type="number"
              value={width}
              onChange={(event) => {
                setWidth(Number(event.target.value));
                resetResult();
              }}
            />
          </label>
          <span aria-hidden="true">×</span>
          <label>
            Высота, мм
            <input
              inputMode="numeric"
              max="10000"
              min="100"
              type="number"
              value={height}
              onChange={(event) => {
                setHeight(Number(event.target.value));
                resetResult();
              }}
            />
          </label>
          <label>
            Количество
            <input
              inputMode="numeric"
              max="100"
              min="1"
              type="number"
              value={quantity}
              onChange={(event) => {
                setQuantity(Number(event.target.value));
                resetResult();
              }}
            />
          </label>
        </div>
        <button disabled={!materialSlug || status === 'loading'} onClick={() => void calculate()}>
          {status === 'loading' ? 'Рассчитываем…' : 'Рассчитать стоимость'}
        </button>
        {status === 'error' && (
          <Notice tone="error" title="Не удалось рассчитать">
            <p>{message}</p>
          </Notice>
        )}
      </div>

      <aside className="calculator-summary" aria-live="polite" aria-busy={status === 'loading'}>
        <div className="calculator-material-preview">
          {selectedImage ? (
            <Image
              alt={selectedMaterial?.name ?? 'Выбранный материал'}
              fill
              sizes="(max-width: 900px) 100vw, 36vw"
              src={selectedImage}
            />
          ) : (
            <span aria-hidden="true" />
          )}
        </div>
        <p className="eyebrow">Ваш выбор</p>
        <h2>{selectedMaterial?.name ?? 'Выберите материал'}</h2>
        {selectedMaterial && (
          <p className="calculator-material-meta">
            Артикул {selectedMaterial.article}
            {selectedMaterial.color_name ? ` · ${selectedMaterial.color_name}` : ''}
          </p>
        )}
        <dl>
          <div>
            <dt>Размер</dt>
            <dd>
              {width} × {height} мм
            </dd>
          </div>
          <div>
            <dt>Количество</dt>
            <dd>{quantity} шт.</dd>
          </div>
        </dl>

        {status === 'loading' && (
          <div className="calculator-status-line">
            <span className="visualizer-spinner" aria-hidden="true" />
            <p>{message}</p>
          </div>
        )}
        {status === 'ready' && result && (
          <div className="calculator-result">
            <span>Предварительная стоимость</span>
            <strong>
              {result.totalPriceKopecks === null
                ? 'Уточнит менеджер'
                : formatMoney(result.totalPriceKopecks)}
            </strong>
            <small>
              {result.totalPriceKopecks === null
                ? 'Материал или конфигурация требуют ручной проверки.'
                : 'Итог проверяется мастером после замера и уточнения комплектации.'}
            </small>
            <button onClick={addToCart}>Добавить в корзину</button>
            {aiEnabled && selectedImage && (
              <Link
                className="button button-secondary"
                href={`/visualizer?material=${encodeURIComponent(materialSlug)}&width=${width}&height=${height}`}
              >
                Примерить на своём окне
              </Link>
            )}
            {cartMessage && <p className="calculator-cart-message">{cartMessage}</p>}
          </div>
        )}
        {status === 'idle' && (
          <p className="calculator-idle">Заполните параметры и нажмите «Рассчитать стоимость».</p>
        )}
        {freeServices.length > 0 && (
          <p className="calculator-services">{freeServices.join(', ')}.</p>
        )}
      </aside>
    </div>
  );
}
