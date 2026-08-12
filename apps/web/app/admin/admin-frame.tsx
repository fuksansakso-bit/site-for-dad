import Link from 'next/link';

import type { Staff } from '../../lib/phase2a/staff';
import { staffRoleLabel } from '../../lib/presentation';
import { AdminNavigation } from './admin-navigation';
import { SignOut } from './sign-out';

export function AdminFrame({ children, staff }: { children: React.ReactNode; staff: Staff }) {
  const canManageBusiness = staff.role === 'OWNER' || staff.role === 'ADMIN';
  const environment =
    process.env['VERCEL_ENV'] === 'production'
      ? { className: 'production', label: 'Production' }
      : process.env['VERCEL_ENV'] === 'preview'
        ? { className: 'preview', label: 'Preview' }
        : { className: 'local', label: 'Локальная среда' };
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" href="/admin" aria-label="Центр управления — обзор">
          <span aria-hidden="true">Ж</span>
          <span>
            <strong>Центр управления</strong>
            <small>Жалюзи на заказ</small>
          </span>
        </Link>
        <div className={`admin-environment admin-environment-${environment.className}`}>
          <span aria-hidden="true" />
          {environment.label}
        </div>
        <AdminNavigation canManageBusiness={canManageBusiness} isOwner={staff.role === 'OWNER'} />
        <footer className="admin-profile">
          <span className="admin-profile-avatar" aria-hidden="true">
            {staff.display_name.trim().slice(0, 1).toLocaleUpperCase('ru-RU')}
          </span>
          <span>
            <strong>{staff.display_name}</strong>
            <small>{staffRoleLabel[staff.role]}</small>
          </span>
          <SignOut />
        </footer>
      </aside>
      <section className="admin-main">
        <header className="admin-toolbar">
          <span>Бизнес-администрирование</span>
          <Link href="/" target="_blank" rel="noreferrer">
            Открыть сайт <span aria-hidden="true">↗</span>
          </Link>
        </header>
        <div className="admin-content">{children}</div>
      </section>
    </div>
  );
}
