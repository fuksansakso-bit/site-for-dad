'use client';

import { useState } from 'react';

export function AdminSignOut(): React.JSX.Element {
  const [busy, setBusy] = useState(false);

  async function signOut(): Promise<void> {
    setBusy(true);
    try {
      await fetch('/api/v1/auth/logout', {
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
    } finally {
      window.location.assign('/login');
    }
  }

  return (
    <button className="business-admin-sign-out" disabled={busy} onClick={signOut} type="button">
      {busy ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
