'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { createSupabaseBrowserClient } from '../../../lib/phase2a/browser';
export function LoginForm() {
  const [message, setMessage] = useState('');
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const client = createSupabaseBrowserClient();
    if (!client) {
      setMessage('Supabase не подключён.');
      return;
    }
    const { error } = await client.auth.signInWithPassword({
      email: String(form.get('email')),
      password: String(form.get('password')),
    });
    if (error) {
      setMessage('Неверный email или пароль.');
      return;
    }
    location.href = '/admin';
  }
  return (
    <form className="form" onSubmit={submit}>
      <label>
        Email
        <input type="email" name="email" required autoComplete="username" />
      </label>
      <label>
        Пароль
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      <button>Войти</button>
      <p aria-live="polite">{message}</p>
    </form>
  );
}
