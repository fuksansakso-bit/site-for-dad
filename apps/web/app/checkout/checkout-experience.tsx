'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { usePricedCart } from '../../components/cart/use-priced-cart';
import { EmptyState, Notice, Skeleton } from '../../components/ui/primitives';
import { clearCart } from '../../lib/phase2a/cart-storage';
import { formatMoney } from '../../lib/phase2a/pricing';
import { checkoutSchema } from '../../lib/phase2a/schemas';

export function CheckoutExperience({ installmentText }: { installmentText: string | null }) {
  const router = useRouter();
  const { browserReady, cart, message: quoteMessage, quote, retry, status } = usePricedCart();
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || cart.length === 0 || submitStatus === 'submitting') return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = checkoutSchema.safeParse({
      address: form.get('address') || undefined,
      comment: form.get('comment') || undefined,
      customerName: form.get('name'),
      customerPhone: form.get('phone'),
      installmentInterest: form.get('installment') === 'on',
      items: cart,
      locality: form.get('locality'),
      measurementRequested: form.get('measurement') === 'on',
    });
    if (!payload.success) {
      setSubmitStatus('error');
      setSubmitMessage('Проверьте обязательные поля, телефон и длину комментария.');
      formElement.querySelector<HTMLElement>(':invalid')?.focus();
      return;
    }
    setSubmitStatus('submitting');
    setSubmitMessage('Безопасно сохраняем заявку и повторно проверяем цену…');
    try {
      const response = await fetch('/api/phase2a/orders', {
        body: JSON.stringify(payload.data),
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as { message?: string; publicReference?: string };
      if (!response.ok || !body.publicReference) {
        throw new Error(body.message ?? 'Не удалось сохранить заявку.');
      }
      clearCart();
      router.push(`/request/${body.publicReference}`);
    } catch (error) {
      setSubmitStatus('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Не удалось сохранить заявку.');
    }
  }

  if (!browserReady || status === 'loading') {
    return (
      <div className="checkout-layout" aria-busy="true">
        <div className="checkout-form-card">
          <Skeleton className="cart-skeleton-title" />
          <Skeleton className="checkout-skeleton-field" />
          <Skeleton className="checkout-skeleton-field" />
          <Skeleton className="checkout-skeleton-field" />
        </div>
        <aside className="checkout-summary-card">
          <Skeleton className="cart-skeleton-title" />
          <Skeleton className="cart-skeleton-line" />
        </aside>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <EmptyState
        action={
          <Link className="button" href="/catalog">
            Перейти в каталог
          </Link>
        }
        description="Сначала выберите материал и добавьте конфигурацию с размерами."
        title="Для заявки нужна хотя бы одна позиция"
      />
    );
  }

  if (status === 'error' || !quote) {
    return (
      <Notice tone="error" title="Не удалось проверить стоимость">
        <p>{quoteMessage}</p>
        <button onClick={retry} type="button">
          Повторить проверку
        </button>
      </Notice>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="checkout-form-card" noValidate={false} onSubmit={submit}>
        <fieldset disabled={submitStatus === 'submitting'}>
          <legend>Как с вами связаться</legend>
          <p>Поля со звёздочкой обязательны. Аккаунт создавать не нужно.</p>
          <div className="checkout-field-grid">
            <label>
              Имя <span aria-hidden="true">*</span>
              <input autoComplete="name" maxLength={160} minLength={2} name="name" required />
            </label>
            <label>
              Телефон <span aria-hidden="true">*</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                name="phone"
                placeholder="+7 999 000-00-00"
                required
                type="tel"
              />
            </label>
            <label>
              Населённый пункт <span aria-hidden="true">*</span>
              <input
                autoComplete="address-level2"
                maxLength={160}
                minLength={2}
                name="locality"
                required
              />
            </label>
            <label>
              Адрес для замера
              <input autoComplete="street-address" maxLength={500} name="address" />
            </label>
          </div>
          <label>
            Комментарий
            <textarea
              maxLength={2000}
              name="comment"
              placeholder="Например: удобное время для звонка или особенности окна"
            />
          </label>
        </fieldset>

        <fieldset className="checkout-options" disabled={submitStatus === 'submitting'}>
          <legend>Что вам понадобится</legend>
          <label className="choice-card">
            <input name="measurement" type="checkbox" />
            <span>
              <strong>Нужен бесплатный замер</strong>
              <small>Мастер уточнит адрес и удобное время.</small>
            </span>
          </label>
          <label className="choice-card">
            <input name="installment" type="checkbox" />
            <span>
              <strong>Интересует рассрочка</strong>
              <small>{installmentText ?? 'Уточните доступные условия у менеджера.'}</small>
            </span>
          </label>
        </fieldset>

        <div className="checkout-submit">
          <button disabled={submitStatus === 'submitting'} type="submit">
            {submitStatus === 'submitting' ? 'Сохраняем заявку…' : 'Отправить заявку мастеру'}
          </button>
          <p>
            Отправляя форму, вы передаёте указанные данные мастеру только для ответа по этой заявке.
            Это не оплата и не подтверждение заказа.
          </p>
        </div>
        {submitMessage && (
          <Notice tone={submitStatus === 'error' ? 'error' : 'info'}>
            <p aria-live={submitStatus === 'error' ? 'assertive' : 'polite'}>{submitMessage}</p>
          </Notice>
        )}
      </form>

      <aside className="checkout-summary-card">
        <p className="eyebrow">Проверка заявки</p>
        <h2>Вы выбрали</h2>
        <ol>
          {quote.items.map((item, index) => (
            <li key={`${item.materialSlug}-${index}`}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.widthMm} × {item.heightMm} мм · {item.quantity} шт.
                </span>
              </div>
              <b>
                {item.totalPriceKopecks === null
                  ? 'По запросу'
                  : formatMoney(item.totalPriceKopecks)}
              </b>
            </li>
          ))}
        </ol>
        <div className="checkout-total">
          <span>Известная сумма</span>
          <strong>{formatMoney(quote.knownTotalKopecks)}</strong>
        </div>
        {quote.pricingStatus !== 'KNOWN' && (
          <p className="checkout-manual-note">
            Есть позиции без числовой цены — менеджер рассчитает их вручную.
          </p>
        )}
        <Link href="/cart">Вернуться и изменить</Link>
      </aside>
    </div>
  );
}
