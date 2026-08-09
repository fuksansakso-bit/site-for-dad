import type { Metadata } from 'next';
import Link from 'next/link';

import { getWebBusinessAdministration } from '../../lib/catalog-runtime';
import { CheckoutExperience } from './checkout-experience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Гостевое оформление заявки на жалюзи без регистрации и онлайн-оплаты.',
  robots: { follow: false, index: false },
  title: 'Оформить заявку · PROJECT_NAME',
};

export default async function CheckoutPage(): Promise<React.JSX.Element> {
  const settings = await getWebBusinessAdministration().getActiveSettings();
  return (
    <main className="checkout-page-shell">
      <header className="commerce-header">
        <Link className="commerce-brand" href="/cart" aria-label="Вернуться в корзину">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Гостевая заявка · без онлайн-оплаты</p>
      </header>
      <CheckoutExperience
        commercialTerms={{
          manufacturingLeadTime: settings.manufacturingLeadTime,
          services: settings.services,
          territory: settings.territory,
          warranty: settings.warranty,
        }}
      />
    </main>
  );
}
