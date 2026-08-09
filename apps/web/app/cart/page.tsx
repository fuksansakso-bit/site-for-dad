import type { Metadata } from 'next';
import Link from 'next/link';

import { CartExperience } from './cart-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Гостевая корзина изделий по неизменяемым серверным расчётам.',
  robots: { follow: false, index: false },
  title: 'Корзина · PROJECT_NAME',
};

export default function CartPage(): React.JSX.Element {
  return (
    <main className="cart-page-shell">
      <header className="commerce-header">
        <Link className="commerce-brand" href="/catalog" aria-label="Вернуться в каталог">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Корзина · без регистрации</p>
      </header>
      <CartExperience />
    </main>
  );
}
