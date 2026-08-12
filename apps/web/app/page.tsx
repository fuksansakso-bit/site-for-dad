import Link from 'next/link';

import { getSiteSettings, listCategories } from '../lib/phase2a/data';

export default async function HomePage() {
  const [categories, settings] = await Promise.all([listCategories(), getSiteSettings()]);
  return (
    <>
      <section className="shell hero">
        <p className="eyebrow">Жалюзи для дома и бизнеса</p>
        <h1>Подберём, изготовим и установим</h1>
        <p>
          Посмотрите материалы, рассчитайте предварительную стоимость и оставьте гостевую заявку.
          Без регистрации и лишних шагов.
        </p>
        <div className="actions">
          <Link className="button" href="/catalog">
            Открыть каталог
          </Link>
          <Link className="button secondary" href="/calculator">
            Рассчитать стоимость
          </Link>
        </div>
      </section>
      <section className="shell">
        <h2>О мастерской</h2>
        <div className="grid">
          <article className="card">
            <h3>Работаем в вашем регионе</h3>
            <p>{settings?.region ?? 'Регион уточнит менеджер'}</p>
          </article>
          <article className="card">
            <h3>Изготовление и гарантия</h3>
            <p>
              {settings?.lead_time_text ?? '2–7 дней'} • {settings?.warranty_text ?? '12 месяцев'}
            </p>
          </article>
          <article className="card">
            <h3>Бесплатные услуги</h3>
            <p>Замер, доставка и установка — бесплатно.</p>
          </article>
        </div>
        <p>{settings?.installment_text ?? 'Доступна рассрочка. Уточните условия у менеджера'}</p>
      </section>
      <section className="shell">
        <h2>Категории</h2>
        {categories.length ? (
          <div className="grid">
            {categories.map((category) => (
              <Link
                className="card"
                key={category.slug}
                href={`/catalog?category=${category.slug}`}
              >
                <h3>{category.name}</h3>
                <p className="muted">{category.description ?? 'Материалы и варианты исполнения'}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="notice">
            Каталог появится после подключения Supabase и импорта проверенных данных.
          </p>
        )}
      </section>
    </>
  );
}
