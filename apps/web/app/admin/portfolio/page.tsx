import Link from 'next/link';

import { StatusBadge } from '../../../components/ui/primitives';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { addPortfolio, updatePortfolio } from '../actions';
import { AdminEmptyState, AdminPageHeader, AdminSectionHeader } from '../admin-components';
import { AdminFrame } from '../admin-frame';

export default async function PortfolioAdmin() {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  const { data } = client
    ? await client
        .from('portfolio_items')
        .select('id,title,cover_image_path,is_published,sort_order')
        .order('sort_order')
    : { data: [] };
  const items = await Promise.all(
    (data ?? []).map(async (item) => {
      if (!item.cover_image_path || !client) return { ...item, imageUrl: null };
      const { data: signed } = await client.storage
        .from('portfolio')
        .createSignedUrl(item.cover_image_path, 900);
      return { ...item, imageUrl: signed?.signedUrl ?? null };
    }),
  );

  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        actions={
          <Link className="button secondary" href="/portfolio" target="_blank" rel="noreferrer">
            Открыть страницу ↗
          </Link>
        }
        description="Только реальные работы бизнеса с подтверждённым правом на публикацию — отдельно от каталожных изображений поставщика."
        eyebrow="Контент"
        title="Портфолио"
      />

      <div className="admin-editor-layout">
        <form action={addPortfolio} className="form admin-panel admin-upload-form">
          <AdminSectionHeader
            description="Новая работа останется скрытой, если не включить публикацию."
            title="Добавить работу"
          />
          <label>
            Название
            <input name="title" required maxLength={255} placeholder="Краткое название проекта" />
          </label>
          <label>
            Описание
            <textarea
              name="description"
              maxLength={2000}
              placeholder="Что было установлено — без личных данных клиента"
            />
          </label>
          <label className="admin-file-field">
            <span>Фотография</span>
            <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
            <small>JPEG, PNG или WebP до 3 МБ</small>
          </label>
          <label>
            Порядок показа
            <input name="sortOrder" type="number" min="0" defaultValue="0" />
          </label>
          <label className="admin-check">
            <input name="published" type="checkbox" />
            <span>Опубликовать после загрузки</span>
          </label>
          <button>Добавить работу</button>
        </form>

        <aside className="admin-panel admin-policy-card">
          <span aria-hidden="true">i</span>
          <h2>Перед публикацией</h2>
          <ul>
            <li>Используйте только собственные или отдельно разрешённые фотографии.</li>
            <li>Не оставляйте лица, адреса и другие личные данные клиента.</li>
            <li>Сервер удалит метаданные и сохранит оптимизированную WebP-копию.</li>
          </ul>
        </aside>
      </div>

      <AdminSectionHeader
        description={`${items.length} ${items.length === 1 ? 'работа' : 'работ в списке'}`}
        title="Опубликованные и черновики"
      />
      {items.length === 0 ? (
        <AdminEmptyState
          description="Добавьте первую подтверждённую работу. Каталожные изображения AMIGO сюда не копируются."
          title="Портфолио пока пусто"
        />
      ) : (
        <div className="admin-portfolio-grid">
          {items.map((item) => (
            <article className="admin-portfolio-card" key={item.id}>
              <div className="admin-portfolio-media">
                {/* eslint-disable-next-line @next/next/no-img-element -- approved Supabase object */}
                {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
                <StatusBadge tone={item.is_published ? 'success' : 'neutral'}>
                  {item.is_published ? 'Опубликовано' : 'Черновик'}
                </StatusBadge>
              </div>
              <div className="admin-portfolio-copy">
                <h3>{item.title}</h3>
                <form action={updatePortfolio} className="admin-portfolio-editor">
                  <input type="hidden" name="id" value={item.id} />
                  <label>
                    Порядок
                    <input name="sortOrder" type="number" min="0" defaultValue={item.sort_order} />
                  </label>
                  <label className="admin-check admin-check-compact">
                    <input name="published" type="checkbox" defaultChecked={item.is_published} />
                    <span>Показывать на сайте</span>
                  </label>
                  <button className="secondary button-compact">Сохранить</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
