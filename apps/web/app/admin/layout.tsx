import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { readStaffPrincipal } from '../../lib/account-session';
import { readRequestAdminPrincipal, requestAdminRole } from '../../lib/request-admin-session';
import { AdminSignOut } from './admin-sign-out';

export const dynamic = 'force-dynamic';

type BusinessRole = 'MANAGER' | 'ADMIN' | 'OWNER';

interface NavigationItem {
  readonly href: string;
  readonly label: string;
  readonly roles: readonly BusinessRole[];
}

const primaryNavigation: readonly NavigationItem[] = [
  { href: '/admin', label: 'Обзор', roles: ['MANAGER', 'ADMIN', 'OWNER'] },
  { href: '/admin/requests', label: 'Заявки', roles: ['MANAGER', 'ADMIN', 'OWNER'] },
  { href: '/admin/customers', label: 'Клиенты', roles: ['MANAGER', 'ADMIN', 'OWNER'] },
  { href: '/admin/portfolio', label: 'Портфолио', roles: ['MANAGER', 'ADMIN', 'OWNER'] },
  { href: '/admin/catalog', label: 'Каталог', roles: ['ADMIN', 'OWNER'] },
  { href: '/admin/pricing', label: 'Цены', roles: ['ADMIN', 'OWNER'] },
  { href: '/admin/sync', label: 'AMIGO sync', roles: ['ADMIN', 'OWNER'] },
  { href: '/admin/settings', label: 'Настройки', roles: ['ADMIN', 'OWNER'] },
  { href: '/admin/staff', label: 'Сотрудники', roles: ['ADMIN', 'OWNER'] },
  { href: '/admin/audit', label: 'Журнал', roles: ['ADMIN', 'OWNER'] },
];

export default async function AdminLayout({ children }: { readonly children: ReactNode }) {
  const staff = await readStaffPrincipal();
  const fallback = staff === null ? await readRequestAdminPrincipal() : null;
  const principal = staff ?? fallback;
  if (principal === null) redirect('/login');

  const role: BusinessRole =
    staff === null && fallback !== null ? requestAdminRole(fallback) : requestAdminRole(principal);
  const environment = process.env['NEXT_PUBLIC_APP_ENV'] ?? 'local';

  return (
    <div className="business-admin-frame">
      <aside className="business-admin-sidebar">
        <Link className="business-admin-brand" href="/admin">
          <span aria-hidden="true">P</span>
          <strong>PROJECT_NAME</strong>
          <small>Управление бизнесом</small>
        </Link>
        <nav aria-label="Разделы админки" className="business-admin-navigation">
          {primaryNavigation
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="business-admin-session">
          <span>{role}</span>
          <small>{environment === 'production' ? 'Рабочая среда' : 'Локальная среда'}</small>
          {staff === null ? <small>Совместимый локальный сеанс</small> : <AdminSignOut />}
        </div>
      </aside>
      <section className="business-admin-workspace">
        <header className="business-admin-mobile-header">
          <Link href="/admin">PROJECT_NAME</Link>
          <span>{role}</span>
        </header>
        <div className="business-admin-mobile-nav" role="navigation" aria-label="Разделы">
          {primaryNavigation
            .filter((item) => item.roles.includes(role))
            .map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
        </div>
        {children}
      </section>
    </div>
  );
}
