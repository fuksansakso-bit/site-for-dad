'use client';

import { useState } from 'react';

export function ShareLinkButton(): React.JSX.Element {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copyCurrentAddress(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="catalog-share-control">
      <button onClick={copyCurrentAddress} type="button">
        {state === 'copied' ? 'Ссылка скопирована' : 'Скопировать ссылку'}
      </button>
      <span aria-live="polite" className="catalog-share-status">
        {state === 'failed' ? 'Не удалось скопировать. Используйте адресную строку.' : ''}
      </span>
    </div>
  );
}
