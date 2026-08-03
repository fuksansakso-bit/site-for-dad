'use client';

export default function CatalogError({ reset }: { readonly reset: () => void }): React.JSX.Element {
  return (
    <main className="catalog-shell">
      <section className="catalog-state catalog-state-error">
        <span>Непредвиденная ошибка</span>
        <h1>Каталог не удалось открыть</h1>
        <p>Непроверенные данные не будут показаны. Попробуйте ещё раз.</p>
        <button className="catalog-text-link" onClick={reset} type="button">
          Повторить
        </button>
      </section>
    </main>
  );
}
