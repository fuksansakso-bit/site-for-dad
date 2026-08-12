import Link from 'next/link';

import { StatusBadge } from '../../../components/ui/primitives';
import { PremiumSelect } from '../../../components/ui/premium-select';
import { publicImageUrl } from '../../../lib/phase2a/data';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import {
  presentAmigoMappingStatus,
  presentAvailability,
  presentPricingMode,
} from '../../../lib/presentation';
import { createCategory, updateCategory, updateMaterial } from '../actions';
import { AdminEmptyState, AdminPageHeader, AdminSectionHeader } from '../admin-components';
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
      'id,name,article,primary_image_path,pricing_mode,availability,is_published,amigo_from_price_kopecks,amigo_from_price_label,amigo_price_version,amigo_mapping_status,amigo_calculator_model_id,amigo_calculator_material_id,categories(name)',
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
      <AdminPageHeader
        actions={
          <Link className="button secondary" href="/catalog" target="_blank" rel="noreferrer">
            Открыть каталог ↗
          </Link>
        }
        description="Публикация, наличие и способ расчёта для материалов, уже загруженных в Supabase."
        eyebrow="Ассортимент"
        title="Материалы и категории"
      />

      <details className="admin-disclosure admin-panel">
        <summary>
          <span>
            <strong>Категории каталога</strong>
            <small>{categories.length} разделов</small>
          </span>
          <span aria-hidden="true">+</span>
        </summary>
        <div className="admin-disclosure-content">
          <form action={createCategory} className="form admin-category-create">
            <AdminSectionHeader
              description="Новый раздел появится публично только после включения публикации."
              title="Новая категория"
            />
            <div className="admin-form-grid">
              <label>
                Название
                <input name="name" required maxLength={160} />
              </label>
              <label>
                Адрес страницы латиницей
                <input
                  name="slug"
                  required
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  maxLength={160}
                  placeholder="rulonnye-shtory"
                />
              </label>
              <label className="admin-field-wide">
                Описание
                <textarea name="description" maxLength={2000} />
              </label>
              <label>
                Порядок
                <input name="sortOrder" type="number" min="0" defaultValue="0" />
              </label>
              <label className="admin-check">
                <input name="published" type="checkbox" />
                <span>Опубликовать сразу</span>
              </label>
            </div>
            <button>Создать категорию</button>
          </form>
          <div className="admin-category-grid">
            {categories.map((category) => (
              <form action={updateCategory} className="form admin-category-card" key={category.id}>
                <input type="hidden" name="id" value={category.id} />
                <div className="admin-category-card-head">
                  <span>{category.is_published ? 'Опубликована' : 'Скрыта'}</span>
                  <small>/{category.slug}</small>
                </div>
                <label>
                  Название
                  <input name="name" defaultValue={category.name} required maxLength={160} />
                </label>
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
                  <input
                    name="sortOrder"
                    type="number"
                    min="0"
                    defaultValue={category.sort_order}
                  />
                </label>
                <label className="admin-check">
                  <input name="published" type="checkbox" defaultChecked={category.is_published} />
                  <span>Показывать в каталоге</span>
                </label>
                <button className="secondary">Сохранить</button>
              </form>
            ))}
          </div>
        </div>
      </details>

      <AdminSectionHeader
        description="На странице по 100 позиций. Изменения применяются к каждой карточке отдельно."
        title="Управление материалами"
      />
      <form className="admin-filter-bar" method="get" role="search">
        <input
          name="q"
          defaultValue={queryText}
          aria-label="Поиск материала"
          placeholder="Название материала"
        />
        <button>Найти</button>
        {queryText && (
          <Link className="button secondary" href="/admin/materials">
            Сбросить
          </Link>
        )}
        <span>
          Найдено <strong>{count}</strong> · страница {page}
        </span>
      </form>
      {materials.length === 0 ? (
        <AdminEmptyState
          action={
            queryText ? (
              <Link className="button secondary" href="/admin/materials">
                Очистить поиск
              </Link>
            ) : undefined
          }
          description="Измените поисковый запрос или проверьте импорт каталога."
          title="Материалы не найдены"
        />
      ) : (
        <div className="admin-table-scroll admin-material-table">
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
                    <td className="admin-material-media">
                      {image && (
                        // eslint-disable-next-line @next/next/no-img-element -- approved Supabase object
                        <img src={image} alt="" width="88" height="66" />
                      )}
                    </td>
                    <td>
                      <strong className="admin-table-title">{item.name}</strong>
                      <small>Артикул {item.article}</small>
                    </td>
                    <td>
                      {(item.categories as unknown as { name: string } | null)?.name ??
                        'Без категории'}
                      <StatusBadge
                        tone={
                          item.availability === 'AVAILABLE'
                            ? 'success'
                            : item.availability === 'OUT_OF_STOCK'
                              ? 'error'
                              : 'warning'
                        }
                      >
                        {presentAvailability(item.availability)}
                      </StatusBadge>
                    </td>
                    <td>
                      <span className="admin-table-title">
                        {presentPricingMode(item.pricing_mode)}
                      </span>
                      <small>
                        {item.amigo_from_price_kopecks
                          ? `от ${formatMoney(item.amigo_from_price_kopecks)}`
                          : 'Не опубликован: нет полной связи AMIGO'}
                      </small>
                      {item.amigo_price_version && <small>{item.amigo_price_version}</small>}
                    </td>
                    <td>
                      {item.pricing_mode === 'AMIGO_EXACT' &&
                      item.amigo_mapping_status === 'READY' ? (
                        <form
                          action={updateMaterial}
                          className="admin-inline-editor admin-inline-editor-compact"
                        >
                          <input type="hidden" name="id" value={item.id} />
                          <PremiumSelect
                            ariaLabel={`Наличие: ${item.name}`}
                            name="availability"
                            defaultValue={item.availability}
                            options={[
                              { label: 'В наличии', value: 'AVAILABLE' },
                              { label: 'Нет в наличии', value: 'OUT_OF_STOCK' },
                              { label: 'Уточнить', value: 'INQUIRY_ONLY' },
                            ]}
                          />
                          <label className="admin-check admin-check-compact">
                            <input
                              name="published"
                              type="checkbox"
                              defaultChecked={item.is_published}
                            />
                            <span>Опубликован</span>
                          </label>
                          <button className="button-compact">Сохранить</button>
                        </form>
                      ) : (
                        <StatusBadge tone="warning">
                          {presentAmigoMappingStatus(item.amigo_mapping_status)}
                        </StatusBadge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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
