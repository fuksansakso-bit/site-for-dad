'use client';

export default function AdminCatalogError({
  reset,
}: {
  readonly reset: () => void;
}): React.JSX.Element {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-card">
        <p className="overline">CATALOG DESK · READ ONLY FAILURE</p>
        <h1>Не удалось получить безопасное состояние.</h1>
        <p>Изменения не применялись. Проверьте локальные PostgreSQL, worker и object storage.</p>
        <button className="button button-dark" onClick={reset} type="button">
          Повторить чтение
        </button>
      </section>
    </main>
  );
}
