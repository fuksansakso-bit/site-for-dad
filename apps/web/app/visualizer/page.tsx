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
  const material = await getMaterial(query.material);
  const imageUrl = material ? publicImageUrl('catalog', material.primary_image_path) : null;
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
      aiEnabled={await isAiVisualizerAvailable()}
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

