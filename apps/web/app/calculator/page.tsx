import type { Metadata } from 'next';

import { Breadcrumbs, EmptyState } from '../../components/ui/primitives';
import { isAiVisualizerAvailable } from '../../lib/ai-visualization/public-availability';
import { getSiteSettings, listMaterials } from '../../lib/phase2a/data';
import { CalculatorClient } from './calculator-client';

export const metadata: Metadata = {
  description: 'Предварительный расчёт стоимости жалюзи по материалу и размерам окна.',
  title: 'Калькулятор стоимости',
};

export default async function CalculatorPage({
  searchParams,
}: {
  searchParams: Promise<{ height?: string; material?: string; width?: string }>;
}) {
  const [query, materials, settings, aiEnabled] = await Promise.all([
    searchParams,
    listMaterials(),
    getSiteSettings(),
    isAiVisualizerAvailable(),
  ]);
  const freeServices = [
    settings?.free_measurement && 'Бесплатный замер',
    settings?.free_delivery && 'бесплатная доставка',
    settings?.free_installation && 'бесплатная установка',
  ].filter((value): value is string => Boolean(value));

  return (
    <section className="shell calculator-page-shell">
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Расчёт стоимости' }]} />
      <div className="calculator-page-heading">
        <p className="eyebrow">Предварительный расчёт</p>
        <h1>Узнайте ориентир по стоимости</h1>
        <p>
          Выберите опубликованный материал и укажите размеры. Финальные параметры и цену мастер
          подтвердит после проверки.
        </p>
      </div>
      {materials.length > 0 ? (
        <CalculatorClient
          aiEnabled={aiEnabled}
          freeServices={freeServices}
          initialHeight={query.height}
          initialMaterialSlug={query.material}
          initialWidth={query.width}
          materials={materials}
        />
      ) : (
        <EmptyState
          description="Расчёт станет доступен, когда опубликованный каталог снова будет подключён."
          title="Калькулятор пока недоступен"
        />
      )}
    </section>
  );
}
