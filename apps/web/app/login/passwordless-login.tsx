'use client';

import { useState, type FormEvent } from 'react';

interface LoginExperienceProps {
  readonly localInboxUrl: string | null;
}

interface ApiError {
  readonly message?: string;
}

export function LoginExperience({ localInboxUrl }: LoginExperienceProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'CODE'>('EMAIL');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/auth/code', {
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as ApiError;
      if (!response.ok) throw new Error(body.message ?? 'Не удалось запросить код.');
      setStep('CODE');
      setMessage('Если адрес доступен для входа, код уже отправлен.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось запросить код.');
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/auth/verify', {
        body: JSON.stringify({ code, email }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as ApiError & { next?: string };
      if (!response.ok || body.next === undefined) {
        throw new Error(body.message ?? 'Код неверен или истёк.');
      }
      window.location.assign(body.next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось проверить код.');
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <div className="login-step" aria-label="Этап входа">
        <span className={step === 'EMAIL' ? 'is-current' : 'is-complete'}>1</span>
        <i />
        <span className={step === 'CODE' ? 'is-current' : ''}>2</span>
      </div>
      {step === 'EMAIL' ? (
        <form onSubmit={requestCode}>
          <div>
            <p className="commerce-kicker">Шаг 1 из 2</p>
            <h2>Получить код</h2>
            <p>Мы не сообщаем, зарегистрирован ли адрес.</p>
          </div>
          <label>
            Электронная почта
            <input
              autoComplete="email"
              autoFocus
              maxLength={254}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.ru"
              required
              type="email"
              value={email}
            />
          </label>
          <button className="cart-primary-action" disabled={busy} type="submit">
            {busy ? 'Запрашиваем…' : 'Получить одноразовый код'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <div>
            <p className="commerce-kicker">Шаг 2 из 2</p>
            <h2>Введите 6 цифр</h2>
            <p>Код действует 10 минут и сработает только один раз.</p>
          </div>
          <label>
            Код из письма
            <input
              autoComplete="one-time-code"
              autoFocus
              inputMode="numeric"
              maxLength={6}
              name="code"
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              pattern="[0-9]{6}"
              placeholder="000000"
              required
              value={code}
            />
          </label>
          <button
            className="cart-primary-action"
            disabled={busy || code.length !== 6}
            type="submit"
          >
            {busy ? 'Проверяем…' : 'Войти'}
          </button>
          <button
            className="commerce-text-button"
            onClick={() => {
              setCode('');
              setMessage(null);
              setStep('EMAIL');
            }}
            type="button"
          >
            Изменить адрес
          </button>
        </form>
      )}
      {message === null ? null : (
        <p aria-live="polite" className="commerce-note" role="status">
          {message}
        </p>
      )}
      {localInboxUrl === null ? null : (
        <p className="login-local-note">
          Локальная разработка: письмо появится в{' '}
          <a href={localInboxUrl} rel="noreferrer" target="_blank">
            Mailpit
          </a>
          .
        </p>
      )}
    </div>
  );
}
