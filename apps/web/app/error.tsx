'use client';

export default function ErrorBoundary({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  return (
    <main className="shell">
      <section aria-live="assertive" className="panel" role="alert">
        <p className="eyebrow">SAFE ERROR</p>
        <h1>Не удалось выполнить действие</h1>
        <p className="summary">Внутренние сведения скрыты. Попробуйте ещё раз.</p>
        <button className="primary-button" onClick={reset} type="button">
          Повторить
        </button>
      </section>
    </main>
  );
}
