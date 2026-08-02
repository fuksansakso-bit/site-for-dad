import Link from 'next/link';

import { ErrorProbe } from './components/error-probe';
import { ReadinessIndicator } from './components/readiness-indicator';

export default function FoundationPage(): React.JSX.Element {
  return (
    <main className="shell">
      <section aria-labelledby="foundation-title" className="panel">
        <p className="eyebrow">PHASE 1A · FOUNDATION</p>
        <h1 id="foundation-title">Техническая оболочка PROJECT_NAME</h1>
        <p className="summary">
          Эта страница подтверждает запуск приложения, маршрутизацию и безопасные health-проверки.
          Она не является финальной главной страницей и не содержит бизнес-функций.
        </p>
        <ReadinessIndicator />
        <div className="actions">
          <Link className="primary-link" href="/api/v1/health/live">
            Открыть безопасный liveness
          </Link>
          <ErrorProbe />
        </div>
      </section>
    </main>
  );
}
