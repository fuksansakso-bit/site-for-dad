'use client';
import { createSupabaseBrowserClient } from '../../lib/phase2a/browser';
export function SignOut() {
  return (
    <button
      className="secondary"
      onClick={async () => {
        await createSupabaseBrowserClient()?.auth.signOut();
        location.href = '/admin/login';
      }}
    >
      Выйти
    </button>
  );
}
