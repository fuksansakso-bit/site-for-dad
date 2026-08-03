export default function AdminCatalogLoading(): React.JSX.Element {
  return (
    <main className="admin-login-shell" aria-live="polite">
      <div className="admin-login-card loading-card">
        <p className="overline">CATALOG DESK</p>
        <h1>Сверяем версии…</h1>
        <div className="loading-line" />
        <div className="loading-line loading-line-short" />
      </div>
    </main>
  );
}
