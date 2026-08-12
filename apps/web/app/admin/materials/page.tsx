import Link from 'next/link';

import { publicImageUrl } from '../../../lib/phase2a/data';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { createCategory, updateCategory, updateMaterial } from '../actions';
import { AdminFrame } from '../admin-frame';

const PAGE_SIZE = 100;

export default async function MaterialsAdmin({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  const parameters = await searchParams;
  const page = Math.max(1, Number.parseInt(parameters.page ?? '1', 10) || 1);
  const queryText = (parameters.q ?? '').trim().slice(0, 80);
  let materialQuery = client
    ?.from('materials')
    .select(
      'id,name,article,primary_image_path,pricing_mode,price_per_m2_kopecks,fixed_price_kopecks,availability,is_published,categories(name)',
      { count: 'exact' },
    )
    .order('name')
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (materialQuery && queryText) materialQuery = materialQuery.ilike('name', `%${queryText}%`);

  const [materialsResult, categoriesResult] = client
    ? await Promise.all([
        materialQuery!,
        client
          .from('categories')
          .select('id,name,slug,description,sort_order,is_published')
          .order('sort_order'),
      ])
    : [{ count: 0, data: [] }, { data: [] }];
  const materials = materialsResult.data ?? [];
  const categories = categoriesResult.data ?? [];
  const count = materialsResult.count ?? 0;
  const hasNext = page * PAGE_SIZE < count;

  return (
    <AdminFrame staff={staff}>
      <h1>Материалы и категории</h1>

      <details className="card">
        <summary>
          <strong>Категории ({categories.length})</strong>
        </summary>
        <form action={createCategory} className="form card">
          <h2>Новая категория</h2>
          <label>
            Название
            <input name="name" required maxLength={160} />
          </label>
          <label>
            Slug латиницей
            <input name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={160} />
          </label>
          <label>
            Описание
            <textarea name="description" maxLength={2000} />
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
          <button>Создать категорию</button>
        </form>
        <div className="grid">
          {categories.map((category) => (
            <form action={updateCategory} className="form card" key={category.id}>
              <input type="hidden" name="id" value={category.id} />
              <label>
                Название
                <input name="name" defaultValue={category.name} required maxLength={160} />
              </label>
              <p className="muted">/{category.slug}</p>
              <label>
                Описание
                <textarea
                  name="description"
                  defaultValue={category.description ?? ''}
                  maxLength={2000}
                />
              </label>
              <label>
                Порядок
                <input name="sortOrder" type="number" min="0" defaultValue={category.sort_order} />
              </label>
              <label>
                <span>
                  <input name="published" type="checkbox" defaultChecked={category.is_published} />{' '}
                  Опубликована
                </span>
              </label>
              <button>Сохранить категорию</button>
            </form>
          ))}
        </div>
      </details>

      <form className="actions" method="get">
        <input
          name="q"
          defaultValue={queryText}
          aria-label="Поиск материала"
          placeholder="Название"
        />
        <button>Найти</button>
      </form>
      <p className="muted">
        Найдено: {count}. Страница {page}.
      </p>
      <div style={{ overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Изображение</th>
              <th>Материал</th>
              <th>Категория</th>
              <th>Цена</th>
              <th>Управление</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => {
              const image = publicImageUrl('catalog', item.primary_image_path);
              return (
                <tr key={item.id}>
                  <td>
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element -- approved Supabase object
                      <img src={image} alt="" width="88" height="66" />
                    )}
                  </td>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    {item.article}
                  </td>
                  <td>{(item.categories as unknown as { name: string } | null)?.name}</td>
                  <td>
                    {item.pricing_mode === 'MANUAL'
                      ? 'Уточняет менеджер'
                      : formatMoney(item.price_per_m2_kopecks ?? item.fixed_price_kopecks ?? 0)}
                  </td>
                  <td>
                    <form action={updateMaterial} className="form">
                      <input type="hidden" name="id" value={item.id} />
                      <select name="pricingMode" defaultValue={item.pricing_mode}>
                        <option value="AREA">За м²</option>
                        <option value="FIXED">Фиксированная</option>
                        <option value="MANUAL">Уточнить</option>
                      </select>
                      <input
                        name="price"
                        type="number"
                        min="0.01"
                        max="20000000"
                        step="0.01"
                        defaultValue={
                          (item.price_per_m2_kopecks ?? item.fixed_price_kopecks ?? 150_000) / 100
                        }
                        aria-label="Цена в рублях"
                      />
                      <select name="availability" defaultValue={item.availability}>
                        <option value="AVAILABLE">В наличии</option>
                        <option value="OUT_OF_STOCK">Нет в наличии</option>
                        <option value="INQUIRY_ONLY">Уточнить</option>
                      </select>
                      <label>
                        <span>
                          <input
                            name="published"
                            type="checkbox"
                            defaultChecked={item.is_published}
                          />{' '}
                          Опубликован
                        </span>
                      </label>
                      <button>Сохранить</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <nav className="actions" aria-label="Страницы материалов">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/admin/materials?page=${page - 1}&q=${encodeURIComponent(queryText)}`}
          >
            Назад
          </Link>
        )}
        {hasNext && (
          <Link
            className="button secondary"
            href={`/admin/materials?page=${page + 1}&q=${encodeURIComponent(queryText)}`}
          >
            Далее
          </Link>
        )}
      </nav>
    </AdminFrame>
  );
}
