'use client';
import type { FormEvent } from 'react';
import { useState } from 'react';

import { createSupabaseBrowserClient } from '../../../lib/phase2a/browser';

export function LoginForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    const form = new FormData(e.currentTarget);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage('Сервис входа временно недоступен. Попробуйте позже.');
      setBusy(false);
      return;
    }
    const { error } = await client.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (error) {
      setMessage('Неверный email или пароль.');
      setBusy(false);
      return;
    }
    location.href = '/admin';
  }

  return (
    <form className="admin-login-form" onSubmit={submit}>
      <label>
        <span>Рабочая почта</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="username"
          placeholder="name@example.ru"
          disabled={busy}
        />
      </label>
      <label>
        <span>Пароль</span>
        <span className="admin-password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            required
            autoComplete="current-password"
            placeholder="Введите пароль"
            disabled={busy}
          />
          <button
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            className="admin-password-toggle"
            type="button"
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? 'Скрыть' : 'Показать'}
          </button>
        </span>
      </label>
      <button disabled={busy}>{busy ? 'Проверяем…' : 'Войти в управление'}</button>
      {message && (
        <p className="admin-login-error" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
