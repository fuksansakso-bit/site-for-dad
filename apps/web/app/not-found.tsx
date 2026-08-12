import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="shell">
      <h1>Страница не найдена</h1>
      <Link className="button" href="/">
        На главную
      </Link>
    </section>
  );
}
