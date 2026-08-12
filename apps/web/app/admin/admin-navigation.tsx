'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BASE_ITEMS = [
  { href: '/admin', index: '01', label: 'Обзор' },
  { href: '/admin/orders', index: '02', label: 'Заявки' },
  { href: '/admin/ai-visualizations', index: '03', label: 'AI-визуализации' },
] as const;

const BUSINESS_ITEMS = [
  { href: '/admin/materials', index: '04', label: 'Материалы' },
  { href: '/admin/portfolio', index: '05', label: 'Портфолио' },
  { href: '/admin/settings', index: '06', label: 'Настройки сайта' },
] as const;

function isCurrent(pathname: string, href: string): boolean {
  return href === '/admin' ? pathname === href : pathname.startsWith(href);
}

export function AdminNavigation({
  canManageBusiness,
  isOwner,
}: {
  canManageBusiness: boolean;
  isOwner: boolean;
}) {
  const pathname = usePathname();
  const items = [
    ...BASE_ITEMS,
    ...(canManageBusiness ? BUSINESS_ITEMS : []),
    ...(isOwner ? [{ href: '/admin/staff', index: '07', label: 'Сотрудники' } as const] : []),
  ];

  return (
    <nav className="admin-navigation" aria-label="Разделы управления">
      <span className="admin-nav-caption">Рабочее пространство</span>
      {items.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <Link aria-current={current ? 'page' : undefined} href={item.href} key={item.href}>
            <span className="admin-nav-index" aria-hidden="true">
              {item.index}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
