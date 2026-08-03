export default function CatalogLoading(): React.JSX.Element {
  return (
    <main
      className="catalog-shell catalog-loading"
      aria-busy="true"
      aria-label="Каталог загружается"
    >
      <div className="catalog-loading-bar" />
      <section className="catalog-loading-hero">
        <div />
        <div />
      </section>
      <section className="catalog-loading-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} />
        ))}
      </section>
      <span className="sr-only">Загружаем активную версию каталога…</span>
    </main>
  );
}
