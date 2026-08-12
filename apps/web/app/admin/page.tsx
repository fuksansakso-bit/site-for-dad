import Link from 'next/link';

import { requireStaff } from '../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../lib/phase2a/supabase';
import { AdminMetric, AdminPageHeader, AdminSectionHeader } from './admin-components';
import { AdminFrame } from './admin-frame';

export default async function AdminPage() {
  const staff = await requireStaff();
  const client = await createSupabaseServerClient();
  const [newOrders, review, materialTotal, exactReady, published, hidden, publicGroups] = client
    ? await Promise.all([
        client.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'NEW'),
        client.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'IN_REVIEW'),
        client.from('materials').select('*', { count: 'exact', head: true }),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('pricing_mode', 'AMIGO_EXACT'),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('pricing_mode', 'AMIGO_EXACT')
          .eq('is_published', true),
        client
          .from('materials')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', false),
        client.from('public_categories').select('*', { count: 'exact', head: true }),
      ])
    : [];
  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        description="Заявки, ассортимент и важные рабочие действия в одном спокойном пространстве."
        eyebrow="Сегодня"
        title="Рабочий обзор"
      />
      <div className="admin-metric-grid">
        <AdminMetric label="Новые заявки" tone="warning" value={newOrders?.count ?? '—'} />
        <AdminMetric label="В обработке" value={review?.count ?? '—'} />
        <AdminMetric label="Материалов" note="в Supabase" value={materialTotal?.count ?? '—'} />
        <AdminMetric label="Связано с AMIGO" tone="success" value={exactReady?.count ?? '—'} />
        <AdminMetric label="Опубликовано" tone="success" value={published?.count ?? '—'} />
        <AdminMetric label="Скрыто / не готово" value={hidden?.count ?? '—'} />
      </div>

      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <AdminSectionHeader
            description="Переходите сразу к задаче — без лишних экранов."
            title="Быстрые действия"
          />
          <nav className="admin-quick-links" aria-label="Быстрые действия">
            <Link href="/admin/orders">
              <span>Заявки клиентов</span>
              <small>Проверить новые и обновить статус</small>
              <b aria-hidden="true">→</b>
            </Link>
            {(staff.role === 'OWNER' || staff.role === 'ADMIN') && (
              <Link href="/admin/materials">
                <span>Каталог и цены</span>
                <small>Управлять публикацией и наличием</small>
                <b aria-hidden="true">→</b>
              </Link>
            )}
            <Link href="/admin/ai-visualizations">
              <span>AI-визуализации</span>
              <small>Проверить состояние и приватное хранение</small>
              <b aria-hidden="true">→</b>
            </Link>
          </nav>
        </section>

        <section className="admin-panel admin-catalog-summary">
          <AdminSectionHeader title="Состояние ассортимента" />
          <dl>
            <div>
              <dt>Материалы с точной ценой AMIGO</dt>
              <dd>{exactReady?.count ?? '—'}</dd>
            </div>
            <div>
              <dt>Опубликовано в каталоге</dt>
              <dd>{published?.count ?? '—'}</dd>
            </div>
            <div>
              <dt>Публичные категории</dt>
              <dd>{publicGroups?.count ?? '—'}</dd>
            </div>
          </dl>
          <p>Публичный каталог показывает только опубликованные данные из Supabase.</p>
        </section>
      </div>
    </AdminFrame>
  );
}
