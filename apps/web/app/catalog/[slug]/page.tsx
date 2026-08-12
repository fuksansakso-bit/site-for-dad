import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs, StatusBadge } from '../../../components/ui/primitives';
import { isAiVisualizerAvailable } from '../../../lib/ai-visualization/public-availability';
import {
  getMaterial,
  getSiteSettings,
  listMaterials,
  publicImageUrl,
} from '../../../lib/phase2a/data';
import { formatRubles } from '../../../lib/presentation';
import { AddToCart } from './add-to-cart';

export const metadata: Metadata = {
  description: 'Характеристики, наличие и предварительный расчёт выбранного материала.',
  title: 'Материал каталога',
};

function availabilityTone(label: string): 'neutral' | 'success' | 'warning' | 'error' {
  const normalized = label.toLocaleLowerCase('ru-RU');
  if (normalized.includes('нет') || normalized.includes('недоступ')) return 'error';
  if (normalized.includes('уточ')) return 'warning';
  if (normalized.includes('налич') || normalized.includes('доступ')) return 'success';
  return 'neutral';
}

export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [material, settings, aiEnabled] = await Promise.all([
    getMaterial(slug),
    getSiteSettings(),
    isAiVisualizerAvailable(),
  ]);
  if (!material) notFound();

  const imageUrl = publicImageUrl('catalog', material.primary_image_path);
  const related = (await listMaterials(material.category_slug))
    .filter((item) => item.slug !== material.slug)
    .slice(0, 4);
  const freeServices = [
    settings?.free_measurement && 'замер',
    settings?.free_delivery && 'доставка',
    settings?.free_installation && 'установка',
  ].filter((value): value is string => Boolean(value));

  return (
    <>
      <section className="shell material-page-shell">
        <Breadcrumbs
          items={[
            { href: '/', label: 'Главная' },
            { href: '/catalog', label: 'Каталог' },
            {
              href: `/catalog?category=${encodeURIComponent(material.category_slug)}`,
              label: material.category_name,
            },
            { label: material.name },
          ]}
        />
        <div className="material-layout">
          <div className="material-gallery">
            {imageUrl ? (
              <div className="material-primary-image">
                <Image
                  alt={`${material.name}${material.color_name ? `, ${material.color_name}` : ''}`}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 56vw"
                  src={imageUrl}
                />
              </div>
            ) : (
              <div
                className="material-image-empty"
                role="img"
                aria-label="Изображение не опубликовано"
              >
                <span aria-hidden="true" />
                <p>Изображение материала пока не опубликовано</p>
              </div>
            )}
            <p className="material-image-note">Оттенок на экране может отличаться от образца.</p>
          </div>

          <div className="material-summary">
            <p className="eyebrow">{material.category_name}</p>
            <h1>{material.name}</h1>
            <StatusBadge tone={availabilityTone(material.availability_label)}>
              {material.availability_label}
            </StatusBadge>
            {material.description && <p className="material-description">{material.description}</p>}

            <dl className="material-specs">
              <div>
                <dt>Артикул</dt>
                <dd>{material.article}</dd>
              </div>
              {material.color_name && (
                <div>
                  <dt>Цвет</dt>
                  <dd>{material.color_name}</dd>
                </div>
              )}
              {material.material_type && (
                <div>
                  <dt>Тип материала</dt>
                  <dd>{material.material_type}</dd>
                </div>
              )}
            </dl>

            <div className="material-price-block">
              <span>Предварительная стоимость</span>
              <strong>
                {formatRubles(material.display_price_kopecks)} {material.display_price_suffix ?? ''}
              </strong>
              <small>
                Точную стоимость мастер подтвердит после проверки размеров и комплектации.
              </small>
            </div>

            <div className="material-quick-actions">
              <Link
                className="button button-secondary"
                href={`/calculator?material=${encodeURIComponent(material.slug)}`}
              >
                Открыть в калькуляторе
              </Link>
              {aiEnabled && imageUrl && (
                <Link
                  className="button button-quiet"
                  href={`/visualizer?material=${encodeURIComponent(material.slug)}`}
                >
                  AI-примерка на окне
                </Link>
              )}
            </div>

            <div className="material-order-panel">
              <h2>Укажите размеры</h2>
              <p>Добавьте конфигурацию в локальную корзину — регистрация не требуется.</p>
              <AddToCart materialSlug={material.slug} />
            </div>
          </div>
        </div>
      </section>

      {(freeServices.length > 0 || settings?.warranty_text || settings?.lead_time_text) && (
        <section className="material-service-band">
          <dl>
            {freeServices.length > 0 && (
              <div>
                <dt>Бесплатно</dt>
                <dd>{freeServices.join(', ')}</dd>
              </div>
            )}
            {settings?.lead_time_text && (
              <div>
                <dt>Изготовление</dt>
                <dd>{settings.lead_time_text}</dd>
              </div>
            )}
            {settings?.warranty_text && (
              <div>
                <dt>Гарантия</dt>
                <dd>{settings.warranty_text}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {related.length > 0 && (
        <section className="shell related-materials">
          <div className="section-heading">
            <p className="eyebrow">Похожие материалы</p>
            <h2>Ещё в категории «{material.category_name}»</h2>
          </div>
          <div className="related-material-grid">
            {related.map((item) => {
              const relatedImage = publicImageUrl('catalog', item.primary_image_path);
              return (
                <Link href={`/catalog/${item.slug}`} key={item.slug}>
                  <span className="related-material-media">
                    {relatedImage ? (
                      <Image
                        alt={item.name}
                        fill
                        sizes="(max-width: 600px) 50vw, 25vw"
                        src={relatedImage}
                      />
                    ) : (
                      <i aria-hidden="true" />
                    )}
                  </span>
                  <strong>{item.name}</strong>
                  <small>{item.color_name ?? `Артикул ${item.article}`}</small>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
