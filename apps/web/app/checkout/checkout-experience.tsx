'use client';

import type {
  GuestCartResponse,
  GuestCheckoutResponse,
  RequestCommunicationEventRequest,
  WhatsAppHandoffResponse,
} from '@project-name/contracts';
import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';

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

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const value: unknown = await response.json();
  if (!response.ok) throw new Error('CHECKOUT_REQUEST_FAILED');
  return value as T;
}

export function CheckoutExperience(): React.JSX.Element {
  const [cart, setCart] = useState<GuestCartResponse | null>(null);
  const [receipt, setReceipt] = useState<GuestCheckoutResponse | null>(null);
  const [handoff, setHandoff] = useState<WhatsAppHandoffResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [comment, setComment] = useState('');
  const [measurementRequested, setMeasurementRequested] = useState(false);
  const [installmentInterest, setInstallmentInterest] = useState(false);
  const [personalDataConsent, setPersonalDataConsent] = useState(false);
  const checkoutIdempotency = useRef(requestId('checkout'));
  const handoffIdempotency = useRef(requestId('handoff'));

  useEffect(() => {
    void jsonRequest<GuestCartResponse>('/api/v1/cart')
      .then(setCart)
      .catch(() => setError('Не удалось загрузить корзину. Вернитесь к ней и повторите попытку.'));
  }, []);

  const generateHandoff = async (
    created: GuestCheckoutResponse,
    csrfToken: string,
  ): Promise<void> => {
    const publicReference = created.publicSummaryHref.slice('/request/'.length);
    setHandoff(
      await jsonRequest<WhatsAppHandoffResponse>(`/api/v1/requests/${publicReference}/handoff`, {
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': handoffIdempotency.current,
          'X-CSRF-Token': csrfToken,
        },
        method: 'POST',
      }),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cart === null || cart.items.length === 0 || !personalDataConsent) return;
    setPending(true);
    setError(null);
    try {
      const created = await jsonRequest<GuestCheckoutResponse>('/api/v1/requests', {
        body: JSON.stringify({
          ...(address.trim() === '' ? {} : { address }),
          ...(comment.trim() === '' ? {} : { comment }),
          contactName,
          contactPhone,
          expectedCartRevision: cart.cartRevision,
          installmentInterest,
          locality,
          measurementRequested,
          personalDataConsent: true,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': checkoutIdempotency.current,
          'X-CSRF-Token': cart.csrfToken,
        },
        method: 'POST',
      });
      setReceipt(created);
      try {
        await generateHandoff(created, cart.csrfToken);
      } catch {
        setError('Заявка сохранена, но ссылка WhatsApp пока не сформировалась. Повторите ниже.');
      }
    } catch {
      setError(
        'Не удалось сохранить заявку. Проверьте телефон, обязательные поля и повторите отправку.',
      );
    } finally {
      setPending(false);
    }
  };

  const recordEvent = (type: RequestCommunicationEventRequest['type']) => {
    if (receipt === null || cart === null) return;
    const publicReference = receipt.publicSummaryHref.slice('/request/'.length);
    void jsonRequest(`/api/v1/requests/${publicReference}/events`, {
      body: JSON.stringify({ type }),
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': requestId(`communication-${type.toLowerCase()}`),
        'X-CSRF-Token': cart.csrfToken,
      },
      method: 'POST',
    }).catch(() => undefined);
  };

  const copyMessage = async () => {
    if (handoff === null) return;
    try {
      await globalThis.navigator.clipboard.writeText(handoff.message);
      setCopyState('copied');
      recordEvent('MESSAGE_COPIED');
    } catch {
      setCopyState('failed');
    }
  };

  if (cart === null) {
    return (
      <section className="commerce-loading" aria-live="polite">
        {error ?? 'Готовим форму заявки…'}
      </section>
    );
  }

  if (receipt !== null) {
    return (
      <section className="request-receipt" aria-labelledby="request-receipt-title">
        <div className="request-receipt-main">
          <p className="commerce-kicker">Заявка сохранена</p>
          <h1 id="request-receipt-title">Спасибо, {contactName}</h1>
          <p className="request-number">Номер заявки: {receipt.requestNumber}</p>
          <p>
            Менеджер проверит состав и свяжется с вами. Это заявка, а не подтверждённый заказ;
            онлайн-оплата не выполнялась.
          </p>

          <div className="request-receipt-facts">
            <span>{receipt.snapshot.summary.totalQuantity} изделий</span>
            <span>
              {receipt.snapshot.summary.pricingStatus === 'FULLY_PRICED'
                ? money(receipt.snapshot.summary.knownSubtotalKopecks)
                : receipt.snapshot.summary.knownSubtotalKopecks > 0
                  ? `${money(receipt.snapshot.summary.knownSubtotalKopecks)} + уточнение`
                  : 'Стоимость уточнит менеджер'}
            </span>
            {receipt.measurementRequested ? <span>Бесплатный замер запрошен</span> : null}
            {receipt.installmentInterest ? <span>Узнать условия рассрочки</span> : null}
          </div>

          {error === null ? null : (
            <p className="commerce-error" role="alert">
              {error}
            </p>
          )}

          <div className="request-handoff-actions">
            {handoff === null ? (
              <button
                className="cart-primary-action"
                disabled={pending}
                onClick={() => {
                  setPending(true);
                  void generateHandoff(receipt, cart.csrfToken)
                    .then(() => setError(null))
                    .catch(() => setError('Ссылка WhatsApp пока недоступна. Повторите попытку.'))
                    .finally(() => setPending(false));
                }}
                type="button"
              >
                Сформировать WhatsApp
              </button>
            ) : (
              <>
                <a
                  className="whatsapp-action"
                  href={handoff.whatsappUrl}
                  onClick={() => recordEvent('WHATSAPP_LINK_OPENED')}
                  rel="noreferrer"
                  target="_blank"
                >
                  Отправить в WhatsApp
                </a>
                <button
                  className="commerce-secondary-action"
                  onClick={() => void copyMessage()}
                  type="button"
                >
                  Скопировать сообщение
                </button>
              </>
            )}
            {receipt.measurementRequested ? (
              <button className="commerce-secondary-action" disabled type="button">
                Бесплатный замер заказан
              </button>
            ) : null}
            <Link className="commerce-secondary-action" href={receipt.publicSummaryHref}>
              Открыть резюме заявки
            </Link>
          </div>

          {copyState === 'copied' ? <p role="status">Сообщение скопировано.</p> : null}
          {copyState === 'failed' ? (
            <p className="commerce-error" role="alert">
              Браузер не разрешил копирование. Выделите текст сообщения ниже вручную.
            </p>
          ) : null}
          {handoff === null ? null : (
            <details className="local-whatsapp-message">
              <summary>Текст сообщения для отправки</summary>
              <pre>{handoff.message}</pre>
              <small>
                В локальной разработке ссылка на localhost не откроется на другом телефоне. Файл или
                изображение через wa.me автоматически не прикрепляется.
              </small>
            </details>
          )}
        </div>
        <aside className="request-next-steps">
          <h2>Что дальше</h2>
          <ol>
            <li>Передайте резюме менеджеру в WhatsApp или дождитесь звонка.</li>
            <li>При необходимости согласуйте бесплатный замер по Чеченской Республике.</li>
            <li>Менеджер подтвердит итоговую цену и срок изготовления 2–7 дней.</li>
          </ol>
          <p>Гарантия — 12 месяцев. Доставка и установка — бесплатно.</p>
        </aside>
      </section>
    );
  }

  if (cart.items.length === 0) {
    return (
      <section className="cart-empty-state commerce-loading">
        <strong>Корзина пуста</strong>
        <p>Для заявки нужен хотя бы один неизменяемый расчёт.</p>
        <Link className="cart-primary-action" href="/catalog">
          Выбрать изделие
        </Link>
      </section>
    );
  }

  return (
    <div className="checkout-layout">
      <form className="checkout-form" onSubmit={(event) => void submit(event)}>
        <div>
          <p className="commerce-kicker">Без регистрации</p>
          <h1>Оформить заявку</h1>
          <p>Точный адрес можно сообщить менеджеру позже. Обслуживаем всю Чеченскую Республику.</p>
        </div>

        {error === null ? null : (
          <p className="commerce-error" role="alert">
            {error}
          </p>
        )}

        <div className="checkout-field-grid">
          <label>
            Имя
            <input
              autoComplete="name"
              maxLength={120}
              minLength={2}
              onChange={(event) => setContactName(event.currentTarget.value)}
              required
              value={contactName}
            />
          </label>
          <label>
            Телефон
            <input
              autoComplete="tel"
              inputMode="tel"
              maxLength={40}
              minLength={8}
              onChange={(event) => setContactPhone(event.currentTarget.value)}
              placeholder="+7 900 000-00-00"
              required
              type="tel"
              value={contactPhone}
            />
          </label>
          <label>
            Населённый пункт
            <input
              autoComplete="address-level2"
              maxLength={160}
              minLength={2}
              onChange={(event) => setLocality(event.currentTarget.value)}
              placeholder="Например, Грозный"
              required
              value={locality}
            />
          </label>
          <label>
            Адрес <span>необязательно</span>
            <input
              autoComplete="street-address"
              maxLength={500}
              onChange={(event) => setAddress(event.currentTarget.value)}
              value={address}
            />
          </label>
        </div>

        <label>
          Комментарий <span>необязательно</span>
          <textarea
            maxLength={1000}
            onChange={(event) => setComment(event.currentTarget.value)}
            rows={4}
            value={comment}
          />
        </label>

        <fieldset className="checkout-options">
          <legend>Дополнительно</legend>
          <label>
            <input
              checked={measurementRequested}
              onChange={(event) => setMeasurementRequested(event.currentTarget.checked)}
              type="checkbox"
            />
            Нужен бесплатный замер
          </label>
          <label>
            <input
              checked={installmentInterest}
              onChange={(event) => setInstallmentInterest(event.currentTarget.checked)}
              type="checkbox"
            />
            Интересует рассрочка — условия сообщит менеджер
          </label>
        </fieldset>

        <label className="checkout-consent">
          <input
            checked={personalDataConsent}
            onChange={(event) => setPersonalDataConsent(event.currentTarget.checked)}
            required
            type="checkbox"
          />
          Согласен на обработку персональных данных для связи по этой заявке
        </label>

        <button
          className="cart-primary-action"
          disabled={pending || !personalDataConsent}
          type="submit"
        >
          {pending ? 'Сохраняем заявку…' : 'Отправить заявку'}
        </button>
        <small>
          Отправка создаёт заявку менеджеру. Цена предварительная; оплата и автоматическое
          оформление рассрочки здесь не выполняются.
        </small>
      </form>

      <aside className="checkout-summary">
        <p className="commerce-kicker">Ваш расчёт</p>
        <h2>{cart.summary.totalQuantity} изделий</h2>
        <ul>
          {cart.items.map((item) => (
            <li key={item.itemReference}>
              <span>
                {item.product.family} · {item.product.quantity} шт.
              </span>
              <strong>
                {item.quantityTotalKopecks === null
                  ? 'Уточнит менеджер'
                  : money(item.quantityTotalKopecks)}
              </strong>
            </li>
          ))}
        </ul>
        <dl>
          <dt>Известная предварительная сумма</dt>
          <dd>{money(cart.summary.knownSubtotalKopecks)}</dd>
          <dt>Требуют уточнения</dt>
          <dd>{cart.summary.unknownItemCount}</dd>
          <dt>Замер · доставка · установка</dt>
          <dd>Бесплатно</dd>
        </dl>
        <Link href="/cart">← Вернуться в корзину</Link>
      </aside>
    </div>
  );
}
