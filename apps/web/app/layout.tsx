import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';

import { getSiteSettings, publicImageUrl } from '../lib/phase2a/data';
import './styles.css';

export const metadata: Metadata = {
  description: 'Каталог жалюзи, расчёт и заявка на замер',
  title: 'PROJECT_NAME — жалюзи на заказ',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const settings = await getSiteSettings();
  const logo = settings?.logo_path ? publicImageUrl('branding', settings.logo_path) : null;
  return (
    <html lang="ru">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element -- approved Supabase branding object
              <img src={logo} width="40" height="40" alt="" />
            )}
            {settings?.site_name ?? 'PROJECT_NAME'}
          </Link>
          <nav aria-label="Основная навигация">
            <Link href="/catalog">Каталог</Link>
            <Link href="/calculator">Калькулятор</Link>
            <Link href="/portfolio">Наши работы</Link>
            <Link href="/cart">Корзина</Link>
          </nav>
        </header>
        <main>{children}</main>
        <footer>
          <p>
            Жалюзи на заказ
            {settings?.region ? ` • ${settings.region}` : ''}
          </p>
          <p>
            Срок изготовления {settings?.lead_time_text ?? '2–7 дней'} • Гарантия{' '}
            {settings?.warranty_text ?? '12 месяцев'}
          </p>
          {settings?.phone && <a href={`tel:${settings.phone}`}>{settings.phone}</a>}
        </footer>
      </body>
    </html>
  );
}
