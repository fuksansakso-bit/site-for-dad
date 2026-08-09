import Link from 'next/link';

import { getWebPortfolio } from '../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

export default async function PortfolioPage(): Promise<React.JSX.Element> {
  const items = await getWebPortfolio().listPublishedItems();
  return (
    <main className="public-portfolio-page">
      <header>
        <Link href="/">PROJECT_NAME</Link>
        <p>Реализованные проекты</p>
        <h1>Работы, которые можно увидеть</h1>
        <span>Только локальные фотографии с подтверждёнными правами на публикацию.</span>
      </header>
      <section className="public-portfolio-grid">
        {items.length === 0 ? <p>Портфолио готовится к публикации.</p> : null}
        {items.map((item) => (
          <article id={item.slug} key={item.id}>
            {item.mediaIds[0] === undefined ? null : (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated storage proxy has no static dimensions contract.
              <img
                alt={item.title}
                src={`/api/v1/portfolio/media/${item.mediaIds[0]}?variant=display`}
              />
            )}
            <div>
              <span>{item.category}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <small>
                {[item.locality, item.completedOn].filter(Boolean).join(' · ') ||
                  'Выполненная работа'}
              </small>
            </div>
          </article>
        ))}
      </section>
      <footer>
        <Link href="/catalog">Перейти в каталог</Link>
      </footer>
    </main>
  );
}
