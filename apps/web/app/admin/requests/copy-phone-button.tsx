'use client';

import { useState } from 'react';

export function CopyPhoneButton({ phone }: { readonly phone: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="secondary-button"
      onClick={() => {
        void navigator.clipboard.writeText(phone).then(() => setCopied(true));
      }}
      type="button"
    >
      {copied ? 'Телефон скопирован' : 'Скопировать телефон'}
    </button>
  );
}
