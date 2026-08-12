import type { Metadata } from 'next';
import Link from 'next/link';

import { isAiVisualizerAvailable } from '../../lib/ai-visualization/public-availability';
import { getMaterial, publicImageUrl } from '../../lib/phase2a/data';
import { VisualizerFlow } from './visualizer-flow';

export const metadata: Metadata = {
  description: 'Примерьте выбранные жалюзи на фотографии своего окна с помощью AI.',
  title: 'AI-визуализация жалюзи — PROJECT_NAME',
};

function dimension(value: string | undefined): number | null {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isSafeInteger(parsed) && parsed >= 100 && parsed <= 10_000 ? parsed : null;
}

export default async function VisualizerPage({
  searchParams,
}: {
  searchParams: Promise<{ height?: string; material?: string; width?: string }>;
}) {
  const query = await searchParams;
  if (!query.material) {
    return (
      <section className="shell visualizer-shell">
        <p className="eyebrow">AI-визуализация</p>
        <h1>Сначала выберите материал</h1>
        <p className="visualizer-lead">
          Откройте материал в каталоге и нажмите «Примерить на своём окне».
        </p>
        <Link className="button" href="/catalog">
          Перейти в каталог
        </Link>
      </section>
    );
  }
  const e2eFixture =
    process.env['NODE_ENV'] !== 'production' &&
    process.env['AI_E2E_FIXTURE_ENABLED'] === 'true' &&
    query.material === 'phase2b-e2e';
  const material = e2eFixture
    ? {
        article: 'E2E-001',
        availability_label: 'В наличии',
        category_name: 'Рулонные жалюзи',
        color_name: 'Песочный',
        name: 'Тестовый лён',
        primary_image_path: null,
        slug: 'phase2b-e2e',
      }
    : await getMaterial(query.material);
  const imageUrl = e2eFixture
    ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    : material
      ? publicImageUrl('catalog', material.primary_image_path)
      : null;
  if (!material || !imageUrl) {
    return (
      <section className="shell visualizer-shell">
        <p className="eyebrow">AI-визуализация</p>
        <h1>Материал недоступен</h1>
        <p className="notice">Выберите другой опубликованный материал с изображением.</p>
        <Link className="button" href="/catalog">
          Выбрать материал
        </Link>
      </section>
    );
  }
  return (
    <VisualizerFlow
      aiEnabled={e2eFixture || (await isAiVisualizerAvailable())}
      initialDimensions={{
        heightMm: dimension(query.height),
        widthMm: dimension(query.width),
      }}
      material={{
        article: material.article,
        availability: material.availability_label,
        categoryName: material.category_name,
        color: material.color_name,
        imageUrl,
        name: material.name,
        slug: material.slug,
      }}
    />
  );
}
