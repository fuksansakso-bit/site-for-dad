'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cartSchema } from '../../lib/phase2a/schemas';
export function CheckoutExperience() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('Сохраняем заявку…');
    const form = new FormData(event.currentTarget);
    const parsed = cartSchema.safeParse(JSON.parse(localStorage.getItem('phase2a-cart') ?? '[]'));
    if (!parsed.success) {
      setMessage('Корзина пуста или повреждена.');
      return;
    }
    const payload = {
      items: parsed.data,
      customerName: form.get('name'),
      customerPhone: form.get('phone'),
      locality: form.get('locality'),
      address: form.get('address') || undefined,
      comment: form.get('comment') || undefined,
      measurementRequested: form.get('measurement') === 'on',
      installmentInterest: form.get('installment') === 'on',
    };
    const response = await fetch('/api/phase2a/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.message ?? 'Не удалось сохранить заявку.');
      return;
    }
    localStorage.removeItem('phase2a-cart');
    router.push(`/request/${body.publicReference}`);
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Имя
        <input name="name" required minLength={2} maxLength={160} />
      </label>
      <label>
        Телефон
        <input name="phone" required inputMode="tel" placeholder="+7 999 000-00-00" />
      </label>
      <label>
        Населённый пункт
        <input name="locality" required minLength={2} />
      </label>
      <label>
        Адрес
        <input name="address" maxLength={500} />
      </label>
      <label>
        Комментарий
        <textarea name="comment" maxLength={2000} />
      </label>
      <label>
        <span>
          <input type="checkbox" name="measurement" /> Нужен бесплатный замер
        </span>
      </label>
      <label>
        <span>
          <input type="checkbox" name="installment" /> Интересует рассрочка
        </span>
      </label>
      <button type="submit">Сохранить заявку</button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
