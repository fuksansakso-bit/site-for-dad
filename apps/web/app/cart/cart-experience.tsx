'use client';

import Link from 'next/link';

import { usePricedCart } from '../../components/cart/use-priced-cart';
import { EmptyState, Notice, Skeleton, StatusBadge } from '../../components/ui/primitives';
import { writeCart } from '../../lib/phase2a/cart-storage';
import { formatMoney } from '../../lib/phase2a/pricing';

export function CartExperience() {
  const { browserReady, cart, message, quote, retry, status } = usePricedCart();

  function remove(index: number) {
    writeCart(cart.filter((_, itemIndex) => itemIndex !== index));
  }

  function changeQuantity(index: number, delta: number) {
    const current = cart[index];
    if (!current) return;
    const quantity = Math.max(1, Math.min(100, current.quantity + delta));
    writeCart(cart.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity } : item)));
  }

  if (!browserReady || status === 'loading') {
    return (
      <div className="cart-layout" aria-busy="true" aria-label="Проверяем корзину">
        <div className="cart-items">
          <div className="cart-item cart-item-loading">
            <Skeleton className="cart-skeleton-number" />
            <div>
              <Skeleton className="cart-skeleton-title" />
              <Skeleton className="cart-skeleton-line" />
            </div>
          </div>
        </div>
        <aside className="cart-summary-card">
          <Skeleton className="cart-skeleton-title" />
          <Skeleton className="cart-skeleton-line" />
          <Skeleton className="cart-skeleton-button" />
        </aside>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <EmptyState
        action={
          <Link className="button" href="/catalog">
            Выбрать материалы
          </Link>
        }
        description="Добавьте материал с нужными размерами — он сохранится в этом браузере без регистрации."
        title="В корзине пока пусто"
      />
    );
  }

  if (status === 'error' || !quote) {
    return (
      <Notice tone="error" title="Не удалось проверить корзину">
        <p>{message}</p>
        <div className="actions">
          <button onClick={retry} type="button">
            Повторить
          </button>
          <Link className="button button-secondary" href="/catalog">
            Вернуться в каталог
          </Link>
        </div>
      </Notice>
    );
  }

  const manualItems = quote.items.filter((item) => item.totalPriceKopecks === null).length;

  return (
    <div className="cart-layout">
      <div className="cart-items">
        <div className="cart-list-heading">
          <p>
            {quote.items.length} {quote.items.length === 1 ? 'позиция' : 'позиций'}
          </p>
          <Link href="/catalog">Продолжить выбор</Link>
        </div>
        {quote.items.map((item, index) => (
          <article className="cart-item" key={`${item.materialSlug}-${index}`}>
            <span className="cart-item-number" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <div className="cart-item-main">
              <div className="cart-item-title">
                <div>
                  <p>{item.article}</p>
                  <h2>{item.name}</h2>
                </div>
                <StatusBadge tone={item.pricingStatus === 'KNOWN' ? 'success' : 'warning'}>
                  {item.pricingStatus === 'KNOWN' ? 'Цена рассчитана' : 'Цена по запросу'}
                </StatusBadge>
              </div>
              <dl className="cart-item-facts">
                <div>
                  <dt>Размер</dt>
                  <dd>
                    {item.widthMm} × {item.heightMm} мм
                  </dd>
                </div>
                <div>
                  <dt>Количество</dt>
                  <dd className="quantity-control">
                    <button
                      aria-label={`Уменьшить количество ${item.name}`}
                      disabled={item.quantity <= 1}
                      onClick={() => changeQuantity(index, -1)}
                      type="button"
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label={`Увеличить количество ${item.name}`}
                      disabled={item.quantity >= 100}
                      onClick={() => changeQuantity(index, 1)}
                      type="button"
                    >
                      +
                    </button>
                  </dd>
                </div>
                <div>
                  <dt>Стоимость</dt>
                  <dd>
                    {item.totalPriceKopecks === null
                      ? 'Цена недоступна — пересчитайте позицию'
                      : formatMoney(item.totalPriceKopecks)}
                  </dd>
                </div>
              </dl>
              <div className="cart-item-actions">
                <Link
                  href={`/calculator?material=${encodeURIComponent(item.materialSlug)}&width=${item.widthMm}&height=${item.heightMm}`}
                >
                  Изменить в калькуляторе
                </Link>
                {cart[index]?.aiVisualizationPublicReference && (
                  <Link href={`/visualizer/${cart[index].aiVisualizationPublicReference}`}>
                    Открыть AI-визуализацию
                  </Link>
                )}
                <button onClick={() => remove(index)} type="button">
                  Удалить
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <aside className="cart-summary-card">
        <p className="eyebrow">Итого</p>
        <h2>Ваша заявка</h2>
        <dl>
          <div>
            <dt>Изделий</dt>
            <dd>{quote.items.reduce((sum, item) => sum + item.quantity, 0)}</dd>
          </div>
          <div>
            <dt>Известная сумма</dt>
            <dd>{formatMoney(quote.knownTotalKopecks)}</dd>
          </div>
          {manualItems > 0 && (
            <div>
              <dt>По запросу</dt>
              <dd>{manualItems} поз.</dd>
            </div>
          )}
        </dl>
        {manualItems > 0 && (
          <Notice tone="warning">
            <p>Некоторые сохранённые позиции устарели. Пересчитайте их перед оформлением.</p>
          </Notice>
        )}
        <Link className="button" href="/checkout">
          Перейти к заявке
        </Link>
        <p className="cart-summary-note">
          Это не оплата и не подтверждённый заказ. Цена ещё раз пересчитывается при отправке.
        </p>
      </aside>
    </div>
  );
}
