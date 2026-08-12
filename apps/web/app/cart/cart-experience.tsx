'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { readCart, writeCart } from '../../lib/phase2a/cart-storage';
import { formatMoney } from '../../lib/phase2a/pricing';
import type { CartItem, PricedItem } from '../../lib/phase2a/types';

type Quote = {
  items: PricedItem[];
  knownTotalKopecks: number;
  pricingStatus: 'KNOWN' | 'MANUAL' | 'PARTIAL';
};

export function CartExperience() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState('Загружаем корзину…');

  useEffect(() => {
    const items = readCart();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is hydrated after mount
    setCart(items);
    if (items.length === 0) {
      setMessage('Корзина пуста.');
      return;
    }
    const controller = new AbortController();
    void fetch('/api/phase2a/price', {
      body: JSON.stringify(items),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as Quote & { message?: string };
        if (!response.ok) throw new Error(body.message ?? 'Расчёт недоступен.');
        setQuote(body);
        setMessage('');
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMessage(error instanceof Error ? error.message : 'Расчёт недоступен.');
        }
      });
    return () => controller.abort();
  }, []);

  function remove(index: number) {
    const next = cart.filter((_, itemIndex) => itemIndex !== index);
    writeCart(next);
    location.reload();
  }

  return (
    <>
      {message && <p className="notice">{message}</p>}
      {quote && (
        <div className="form">
          {quote.items.map((item, index) => (
            <div className="card" key={`${item.materialSlug}-${index}`}>
              <h3>{item.name}</h3>
              <p>
                {item.widthMm} × {item.heightMm} мм • {item.quantity} шт.
              </p>
              <p className="price">
                {item.totalPriceKopecks === null
                  ? 'Стоимость уточнит менеджер'
                  : formatMoney(item.totalPriceKopecks)}
              </p>
              {cart[index]?.aiVisualizationPublicReference && (
                <Link
                  className="button secondary"
                  href={`/visualizer/${cart[index].aiVisualizationPublicReference}`}
                >
                  Открыть AI-визуализацию
                </Link>
              )}
              <button className="danger" onClick={() => remove(index)}>
                Удалить
              </button>
            </div>
          ))}
          {quote.knownTotalKopecks > 0 && (
            <p className="price">Известная сумма: {formatMoney(quote.knownTotalKopecks)}</p>
          )}
          {quote.pricingStatus !== 'KNOWN' && <p>Для части позиций стоимость уточнит менеджер.</p>}
          <Link className="button" href="/checkout">
            Оформить заявку
          </Link>
        </div>
      )}
    </>
  );
}
