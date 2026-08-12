'use client';
import { createSupabaseBrowserClient } from '../../lib/phase2a/browser';
export function SignOut() {
  return (
    <button
      aria-label="Выйти из центра управления"
      className="admin-signout"
      type="button"
      title="Выйти"
      onClick={async () => {
        await createSupabaseBrowserClient()?.auth.signOut();
        location.href = '/admin/login';
      }}
    >
      <span aria-hidden="true">↪</span>
    </button>
  );
}
