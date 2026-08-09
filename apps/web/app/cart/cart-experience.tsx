'use client';

import type { CartItemResponse, GuestCartResponse } from '@project-name/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';

function requestId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function money(minor: number): string {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(minor / 100);
}

function itemStatus(status: CartItemResponse['pricingStatus']): string {
  switch (status) {
    case 'CALCULATED':
    case 'SOURCE_DATA_STALE':
      return 'Стоимость рассчитана';
    case 'PRICE_ON_REQUEST':
      return 'Стоимость уточнит менеджер';
    case 'MANUAL_REVIEW_REQUIRED':
      return 'Размер требует проверки';
    default:
      return 'Конфигурацию нужно проверить';
  }
}

function cartStatus(status: GuestCartResponse['summary']['pricingStatus']): string {
  switch (status) {
    case 'FULLY_PRICED':
      return 'Предварительная стоимость рассчитана';
    case 'PARTIALLY_PRICED':
      return 'Часть суммы требует уточнения';
    case 'PRICE_ON_REQUEST':
      return 'Стоимость уточнит менеджер';
  }
}

async function cartRequest(url: string, init?: RequestInit): Promise<GuestCartResponse> {
  const response = await fetch(url, init);
  const value: unknown = await response.json();
  if (!response.ok) throw new Error('CART_REQUEST_FAILED');
  return value as GuestCartResponse;
}

export function CartExperience(): React.JSX.Element {
  const [cart, setCart] = useState<GuestCartResponse | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void cartRequest('/api/v1/cart')
      .then(setCart)
      .catch(() => setError('Корзина временно недоступна. Обновите страницу.'));
  }, []);

  const mutate = async (
    action: string,
    url: string,
    method: 'DELETE' | 'POST',
    expectedCartRevision: number,
  ) => {
    if (cart === null) return;
    setPending(action);
    setError(null);
    try {
      setCart(
        await cartRequest(url, {
          body: JSON.stringify({ expectedCartRevision }),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId(action),
            'X-CSRF-Token': cart.csrfToken,
          },
          method,
        }),
      );
    } catch {
      setError('Корзина изменилась или действие не выполнилось. Обновите страницу и повторите.');
    } finally {
      setPending(null);
    }
  };

  if (cart === null) {
    return (
      <section className="commerce-loading" aria-live="polite">
        {error ?? 'Загружаем корзину…'}
      </section>
    );
  }

  const empty = cart.items.length === 0;
  return (
    <div className="cart-layout" aria-busy={pending !== null}>
      <section className="cart-items-section" aria-labelledby="cart-title">
        <div className="commerce-title-row">
          <div>
            <p className="commerce-kicker">Ваш расчёт</p>
            <h1 id="cart-title">Корзина</h1>
          </div>
          {empty ? null : (
            <button
              className="commerce-text-button commerce-danger-button"
              disabled={pending !== null}
              onClick={() => {
                if (globalThis.confirm('Очистить корзину?')) {
                  void mutate('cart-clear', '/api/v1/cart', 'DELETE', cart.cartRevision);
                }
              }}
              type="button"
            >
              Очистить корзину
            </button>
          )}
        </div>

        {error === null ? null : (
          <p className="commerce-error" role="alert">
            {error}
          </p>
        )}

        {empty ? (
          <div className="cart-empty-state">
            <strong>Здесь пока нет изделий</strong>
            <p>Выберите материал, настройте размеры и сохраните серверный расчёт.</p>
            <Link className="cart-primary-action" href="/catalog">
              Выбрать жалюзи
            </Link>
          </div>
        ) : (
          <div className="cart-item-list">
            {cart.items.map((item, index) => (
              <article className="cart-item-card" key={item.itemReference}>
                <div className="cart-item-heading">
                  <div>
                    <span>Изделие {index + 1}</span>
                    <h2>{item.product.family}</h2>
                    <p>{itemStatus(item.pricingStatus)}</p>
                  </div>
                  <strong className="cart-line-total">
                    {item.quantityTotalKopecks === null
                      ? 'Сумму уточним'
                      : money(item.quantityTotalKopecks)}
                  </strong>
                </div>

                <dl className="cart-product-details">
                  <dt>Система и модель</dt>
                  <dd>
                    {item.product.system} · {item.product.model}
                  </dd>
                  <dt>Материал</dt>
                  <dd>
                    {item.product.material} · арт. {item.product.materialArticle}
                  </dd>
                  <dt>Цвет</dt>
                  <dd>{item.product.color}</dd>
                  <dt>Размер</dt>
                  <dd>
                    {item.product.widthMm === null || item.product.heightMm === null
                      ? 'Уточнит замерщик'
                      : `${item.product.widthMm} × ${item.product.heightMm} мм`}
                  </dd>
                  <dt>Количество</dt>
                  <dd>{item.product.quantity}</dd>
                  <dt>Монтаж · управление</dt>
                  <dd>
                    {item.product.mounting} · {item.product.control}
                  </dd>
                  <dt>Фурнитура</dt>
                  <dd>{item.product.hardware}</dd>
                  <dt>Опции</dt>
                  <dd>
                    {item.product.additionalOptions.length === 0
                      ? 'Без дополнительных опций'
                      : item.product.additionalOptions.join(', ')}
                  </dd>
                  <dt>За одно изделие</dt>
                  <dd>
                    {item.unitPriceKopecks === null
                      ? 'Уточнит менеджер'
                      : money(item.unitPriceKopecks)}
                  </dd>
                </dl>

                {item.minimumPriceApplied ? (
                  <p className="commerce-note">Применена минимальная стоимость одного изделия.</p>
                ) : null}
                {item.wasCalculatedWithPreviousPrice ? (
                  <div className="commerce-warning">
                    <p>Расчёт создан по предыдущей версии цены. Менеджер подтвердит сумму.</p>
                    <Link href={item.editHref}>Пересчитать добровольно</Link>
                  </div>
                ) : null}
                {item.warnings.length === 0 ? null : (
                  <ul className="cart-warning-list">
                    {item.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                )}

                <div className="cart-item-actions">
                  <Link href={item.editHref}>Изменить</Link>
                  {item.previewHref === null ? null : (
                    <Link href={item.previewHref}>Открыть примерку</Link>
                  )}
                  <button
                    disabled={pending !== null}
                    onClick={() =>
                      void mutate(
                        `cart-duplicate-${item.itemReference}`,
                        `/api/v1/cart/items/${item.itemReference}/duplicate`,
                        'POST',
                        cart.cartRevision,
                      )
                    }
                    type="button"
                  >
                    Дублировать
                  </button>
                  <button
                    className="commerce-danger-button"
                    disabled={pending !== null}
                    onClick={() =>
                      void mutate(
                        `cart-remove-${item.itemReference}`,
                        `/api/v1/cart/items/${item.itemReference}`,
                        'DELETE',
                        cart.cartRevision,
                      )
                    }
                    type="button"
                  >
                    Удалить
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <Link className="commerce-back-link" href="/catalog">
          + Добавить ещё изделие
        </Link>
      </section>

      <aside className="cart-totals" aria-label="Итог корзины">
        <p className="commerce-kicker">Итого</p>
        <h2>{empty ? 'Корзина пуста' : cartStatus(cart.summary.pricingStatus)}</h2>
        <dl>
          <dt>Изделия</dt>
          <dd>{money(cart.summary.knownProductsKopecks)}</dd>
          <dt>Дополнительные опции</dt>
          <dd>{money(cart.summary.knownOptionsKopecks)}</dd>
          <dt>Замер</dt>
          <dd>Бесплатно</dd>
          <dt>Доставка</dt>
          <dd>Бесплатно</dd>
          <dt>Установка</dt>
          <dd>Бесплатно</dd>
          <dt>Известная предварительная сумма</dt>
          <dd>{money(cart.summary.knownSubtotalKopecks)}</dd>
          <dt>Позиции, требующие уточнения</dt>
          <dd>{cart.summary.unknownItemCount}</dd>
        </dl>
        {cart.summary.pricingStatus === 'PARTIALLY_PRICED' ? (
          <p className="commerce-warning">Часть стоимости уточнит менеджер.</p>
        ) : null}
        {cart.summary.pricingStatus === 'PRICE_ON_REQUEST' && !empty ? (
          <p className="commerce-warning">
            Неизвестная стоимость не считается нулевой: сумму сообщит менеджер.
          </p>
        ) : null}
        <p className="cart-disclaimer">
          Расчёт предварительный. Окончательную стоимость менеджер подтвердит после проверки и, при
          необходимости, бесплатного замера.
        </p>
        {empty ? null : (
          <Link className="cart-primary-action" href="/checkout">
            Оформить заявку
          </Link>
        )}
      </aside>
    </div>
  );
}
