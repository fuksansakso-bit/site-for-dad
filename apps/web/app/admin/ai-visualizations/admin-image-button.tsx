'use client';

import { useState } from 'react';

export function AdminImageButton({ jobId, kind }: { jobId: string; kind: 'input' | 'result' }) {
  const [message, setMessage] = useState('');
  async function openImage() {
    setMessage('Открываем…');
    const popup = window.open('', '_blank');
    if (popup) popup.opener = null;
    try {
      const response = await fetch(
        `/api/admin/ai-visualizations/${jobId}/image?kind=${kind}`,
        { cache: 'no-store', credentials: 'same-origin' },
      );
      const body = (await response.json()) as { signedUrl?: string; message?: string };
      if (!response.ok || !body.signedUrl) throw new Error(body.message ?? 'Просмотр недоступен.');
      if (popup) popup.location.replace(body.signedUrl);
      else throw new Error('Разрешите всплывающие окна для просмотра.');
      setMessage('Доступ выдан на 60 секунд. Просмотр записан в аудит.');
    } catch (error) {
      popup?.close();
      setMessage(error instanceof Error ? error.message : 'Просмотр недоступен.');
    }
  }
  return (
    <span className="admin-image-action">
      <button className="secondary" type="button" onClick={() => void openImage()}>
        {kind === 'input' ? 'Исходное фото' : 'Результат'}
      </button>
      <small aria-live="polite">{message}</small>
    </span>
  );
}
