import Link from 'next/link';

export default function CatalogMaterialNotFound(): React.JSX.Element {
  return (
    <main className="catalog-shell">
      <section className="catalog-state" role="status">
        <span>404 · нет в активной версии</span>
        <h1>Материал не найден</h1>
        <p>Возможно, материал скрыт, ссылка устарела или каталог был обновлён.</p>
        <Link className="catalog-text-link" href="/catalog">
          Вернуться в каталог
        </Link>
      </section>
    </main>
  );
}
