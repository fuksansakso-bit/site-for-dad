import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { addPortfolio, updatePortfolio } from '../actions';
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
      <h1>Портфолио</h1>
      <p className="muted">
        Загружайте JPEG, PNG или WebP до 3 МБ. Сервер проверит изображение, удалит метаданные,
        уменьшит его до 1600 px и сохранит как WebP.
      </p>
      <form action={addPortfolio} className="form card">
        <label>
          Название
          <input name="title" required maxLength={255} />
        </label>
        <label>
          Описание
          <textarea name="description" maxLength={2000} />
        </label>
        <label>
          Фотография
          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
        </label>
        <label>
          Порядок
          <input name="sortOrder" type="number" min="0" defaultValue="0" />
        </label>
        <label>
          <span>
            <input name="published" type="checkbox" /> Опубликовать
          </span>
        </label>
        <button>Добавить</button>
      </form>
      <div className="grid">
        {items.map((item) => (
          <article className="card" key={item.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- approved Supabase object */}
            {item.imageUrl && <img src={item.imageUrl} alt={item.title} />}
            <h3>{item.title}</h3>
            <form action={updatePortfolio} className="form">
              <input type="hidden" name="id" value={item.id} />
              <label>
                Порядок
                <input name="sortOrder" type="number" min="0" defaultValue={item.sort_order} />
              </label>
              <label>
                <span>
                  <input name="published" type="checkbox" defaultChecked={item.is_published} />{' '}
                  Опубликовано
                </span>
              </label>
              <button>Сохранить</button>
            </form>
          </article>
        ))}
      </div>
    </AdminFrame>
  );
}
