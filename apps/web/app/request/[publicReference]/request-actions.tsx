'use client';

import { useState } from 'react';

export function RequestActions({ whatsAppHref }: { whatsAppHref: string }) {
  const [message, setMessage] = useState('');

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage('Ссылка на заявку скопирована.');
    } catch {
      setMessage('Не удалось скопировать автоматически. Выделите адрес страницы вручную.');
    }
  }

  return (
    <div className="request-actions">
      <a className="button" href={whatsAppHref} rel="noreferrer" target="_blank">
        Подготовить сообщение в WhatsApp
      </a>
      <button
        className="button button-secondary"
        onClick={() => void copyReference()}
        type="button"
      >
        Скопировать ссылку
      </button>
      {message && <p aria-live="polite">{message}</p>}
    </div>
  );
}
