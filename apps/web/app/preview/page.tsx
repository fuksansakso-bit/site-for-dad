import type { Metadata } from 'next';
import Link from 'next/link';

import { PreviewExperience } from './preview-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Детерминированная стандартная примерка выбранных жалюзи на демонстрационном окне.',
  robots: { follow: false, index: false },
  title: 'Посмотреть на окне · PROJECT_NAME',
};

export default async function PreviewPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const parameters = await searchParams;
  const candidate = typeof parameters['state'] === 'string' ? parameters['state'] : null;
  const stateId = candidate !== null && /^[A-Za-z0-9_-]{32}$/u.test(candidate) ? candidate : null;
  const quoteCandidate = typeof parameters['quote'] === 'string' ? parameters['quote'] : null;
  const quoteToken =
    quoteCandidate !== null && /^[A-Za-z0-9_-]{32}$/u.test(quoteCandidate) ? quoteCandidate : null;
  return (
    <main className="preview-page-shell">
      <header className="preview-page-header">
        <Link className="preview-brand" href="/catalog" aria-label="Вернуться в каталог">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Стандартная примерка · без загрузки фото и генеративного AI</p>
      </header>
      <PreviewExperience quoteToken={quoteToken} stateId={stateId} />
    </main>
  );
}
