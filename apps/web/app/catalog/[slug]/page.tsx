import { notFound } from 'next/navigation';
/* eslint-disable @next/next/no-img-element -- paths are runtime Supabase Storage objects configured by migration. */
import { getMaterial, publicImageUrl } from '../../../lib/phase2a/data';
import { formatMoney } from '../../../lib/phase2a/pricing';
import { AddToCart } from './add-to-cart';
export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const material = await getMaterial(slug);
  if (!material) notFound();
  const image = publicImageUrl('catalog', material.primary_image_path);
  return (
    <section className="shell">
      <div className="grid">
        <div className="card">{image && <img src={image} alt={material.name} />}</div>
        <div>
          <p className="eyebrow">{material.category_name}</p>
          <h1>{material.name}</h1>
          <p>Артикул {material.article}</p>
          <p>{material.description}</p>
          <p className="price">
            {material.display_price_kopecks === null
              ? 'Стоимость уточнит менеджер'
              : `${formatMoney(material.display_price_kopecks)} ${material.display_price_suffix ?? ''}`}
          </p>
          <AddToCart materialSlug={material.slug} />
        </div>
      </div>
    </section>
  );
}
