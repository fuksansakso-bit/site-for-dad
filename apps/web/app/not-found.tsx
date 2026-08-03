import Link from 'next/link';

export default function NotFound(): React.JSX.Element {
  return (
    <main className="shell">
      <section className="panel" role="status">
        <p className="eyebrow">404</p>
        <h1>Страница не найдена</h1>
        <p className="summary">Запрошенный технический маршрут отсутствует.</p>
        <Link className="primary-link" href="/">
          Вернуться к Foundation
        </Link>
      </section>
    </main>
  );
}
