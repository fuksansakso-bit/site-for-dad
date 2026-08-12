import Link from 'next/link';

import type { Staff } from '../../lib/phase2a/staff';
import { SignOut } from './sign-out';

export function AdminFrame({ children, staff }: { children: React.ReactNode; staff: Staff }) {
  const canManageBusiness = staff.role === 'OWNER' || staff.role === 'ADMIN';
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <strong>{staff.display_name}</strong>
        <span className="badge">{staff.role}</span>
        <Link href="/admin">Обзор</Link>
        {canManageBusiness && <Link href="/admin/materials">Материалы</Link>}
        <Link href="/admin/orders">Заявки</Link>
        <Link href="/admin/ai-visualizations">AI-визуализации</Link>
        {canManageBusiness && <Link href="/admin/portfolio">Портфолио</Link>}
        {canManageBusiness && <Link href="/admin/settings">Настройки</Link>}
        {staff.role === 'OWNER' && <Link href="/admin/staff">Сотрудники</Link>}
        <SignOut />
      </aside>
      <section className="admin-main">{children}</section>
    </div>
  );
}
