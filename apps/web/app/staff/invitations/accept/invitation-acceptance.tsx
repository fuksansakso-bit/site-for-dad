'use client';

import { useEffect, useRef, useState } from 'react';

export function InvitationAcceptance() {
  const token = useRef('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const candidate = window.location.hash.slice(1);
    token.current = /^inv1_[A-Za-z0-9_-]{43}$/.test(candidate) ? candidate : '';
    window.history.replaceState(null, '', window.location.pathname);
  }, []);

  async function accept() {
    if (token.current === '') {
      setMessage('В ссылке нет действующего ключа. Откройте исходное письмо.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/v1/staff/invitations/accept', {
        body: JSON.stringify({ token: token.current }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Приглашение недействительно.');
      setAccepted(true);
      token.current = '';
      setMessage('Приглашение принято. Теперь можно войти.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось принять приглашение.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <div>
        <p className="commerce-kicker">Безопасная ссылка</p>
        <h2>{accepted ? 'Доступ подтверждён' : 'Готовы присоединиться?'}</h2>
        <p>Ключ не попадает в адрес страницы, историю и логи.</p>
      </div>
      {accepted ? (
        <a className="cart-primary-action" href="/login">
          Перейти ко входу
        </a>
      ) : (
        <button className="cart-primary-action" disabled={busy} onClick={accept} type="button">
          {busy ? 'Проверяем…' : 'Принять приглашение'}
        </button>
      )}
      {message === null ? null : (
        <p aria-live="polite" className="commerce-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
