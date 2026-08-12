import type { Metadata } from 'next';

import { Breadcrumbs, EmptyState } from '../../components/ui/primitives';
import { isAiVisualizerAvailable } from '../../lib/ai-visualization/public-availability';
import { listCategories, listMaterials } from '../../lib/phase2a/data';
import { CatalogClient } from './catalog-client';

export const metadata: Metadata = {
  description: 'Опубликованные материалы для жалюзи: фактуры, цвета, наличие и цены.',
  title: 'Каталог материалов',
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const [{ category }, categories, materials, aiEnabled] = await Promise.all([
    searchParams,
    listCategories(),
    listMaterials(),
    isAiVisualizerAvailable(),
  ]);

  return (
    <section className="shell catalog-page-shell">
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Каталог' }]} />
      <div className="catalog-page-heading">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Материалы для вашего света</h1>
        </div>
        <p>
          Сравнивайте фактуру, оттенок, наличие и ориентир по стоимости. Все позиции проходят
          публикацию перед появлением на сайте.
        </p>
      </div>
      {materials.length > 0 ? (
        <CatalogClient
          aiEnabled={aiEnabled}
          categories={categories}
          initialCategory={category}
          key={category ?? 'all'}
          materials={materials}
        />
      ) : (
        <EmptyState
          description="Опубликованные материалы появятся после подключения проверенного каталога."
          title="Каталог пока недоступен"
        />
      )}
    </section>
  );
}
