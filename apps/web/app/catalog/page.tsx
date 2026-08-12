import { listMaterials } from '../../lib/phase2a/data';
import { CatalogClient } from './catalog-client';
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const materials = await listMaterials(category);
  return (
    <section className="shell">
      <p className="eyebrow">Каталог</p>
      <h1>Материалы</h1>
      {materials.length ? (
        <CatalogClient materials={materials} />
      ) : (
        <p className="notice">
          Опубликованные материалы не найдены. Проверьте подключение Supabase или выбранную
          категорию.
        </p>
      )}
    </section>
  );
}
