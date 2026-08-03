'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <html lang="ru">
      <body>
        <main className="shell">
          <section aria-live="assertive" className="panel" role="alert">
            <p className="eyebrow">SAFE ERROR</p>
            <h1>Приложение временно недоступно</h1>
            <p className="summary">Чувствительные технические сведения не отображаются.</p>
            <button className="primary-button" onClick={reset} type="button">
              Повторить
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
