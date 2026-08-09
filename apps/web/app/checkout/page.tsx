import type { Metadata } from 'next';
import Link from 'next/link';

import { CheckoutExperience } from './checkout-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Гостевое оформление заявки на жалюзи без регистрации и онлайн-оплаты.',
  robots: { follow: false, index: false },
  title: 'Оформить заявку · PROJECT_NAME',
};

export default function CheckoutPage(): React.JSX.Element {
  return (
    <main className="checkout-page-shell">
      <header className="commerce-header">
        <Link className="commerce-brand" href="/cart" aria-label="Вернуться в корзину">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Гостевая заявка · без онлайн-оплаты</p>
      </header>
      <CheckoutExperience />
    </main>
  );
}
