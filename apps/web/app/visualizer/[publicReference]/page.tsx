import Link from 'next/link';

import { Breadcrumbs, EmptyState } from '../../../components/ui/primitives';
import { getOwnedAiJob } from '../../../lib/ai-visualization/job-data';
import { safeJobPayload } from '../../../lib/ai-visualization/lifecycle';
import { getAiVisualizerPublicAvailability } from '../../../lib/ai-visualization/public-availability';
import { getAiGuestSession } from '../../../lib/ai-visualization/session';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';
import { VisualizerFlow } from '../visualizer-flow';

function unavailable() {
  return (
    <section className="shell visualizer-shell">
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'AI-визуализация' }]} />
      <EmptyState
        action={
          <Link className="button" href="/catalog">
            Выбрать материал
          </Link>
        }
        description="Ссылка могла устареть или данные уже были удалены."
        title="Визуализация недоступна"
      />
    </section>
  );
}

export default async function SavedVisualizationPage({
  params,
}: {
  params: Promise<{ publicReference: string }>;
}) {
  const { publicReference } = await params;
  const guest = await getAiGuestSession();
  const client = createSupabaseAdminClient();
  if (!guest || !client) return unavailable();
  let job;
  try {
    job = await getOwnedAiJob(client, publicReference, guest.hash);
  } catch {
    return unavailable();
  }
  const safe = safeJobPayload(job);
  const availability = await getAiVisualizerPublicAvailability();
  return (
    <VisualizerFlow
      aiEnabled={availability.enabled}
      initialDimensions={{
        heightMm: job.product_metadata.heightMm ?? null,
        widthMm: job.product_metadata.widthMm ?? null,
      }}
      initialJob={{
        attemptNumber: safe.attemptNumber,
        errorCode: safe.errorCode,
        errorMessage: safe.errorMessage,
        expiresAt: safe.expiresAt,
        publicReference: safe.publicReference,
        resultAvailable: safe.resultAvailable,
        status: safe.status,
      }}
      material={{
        article: safe.material.article,
        availability:
          safe.material.availability === 'AVAILABLE'
            ? 'В наличии'
            : safe.material.availability === 'OUT_OF_STOCK'
              ? 'Нет в наличии'
              : 'Уточнить наличие',
        categoryName: safe.material.categoryName,
        color: safe.material.color,
        imageUrl: safe.material.imageUrl,
        name: safe.material.name,
        slug: safe.material.slug,
      }}
      retentionHours={availability.retentionHours}
    />
  );
}
