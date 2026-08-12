import type { Metadata } from 'next';

import { Breadcrumbs } from '../../components/ui/primitives';
import { getSiteSettings } from '../../lib/phase2a/data';
import { CheckoutExperience } from './checkout-experience';

export const metadata: Metadata = {
  description: 'Гостевая заявка мастеру без регистрации и оплаты на сайте.',
  title: 'Оформление заявки',
};

export default async function CheckoutPage() {
  const settings = await getSiteSettings();
  return (
    <section className="shell checkout-page-shell">
      <Breadcrumbs
        items={[
          { href: '/', label: 'Главная' },
          { href: '/cart', label: 'Корзина' },
          { label: 'Заявка' },
        ]}
      />
      <div className="checkout-page-heading">
        <p className="eyebrow">Гостевая заявка</p>
        <h1>Оставьте контакт для мастера</h1>
        <p>Он проверит расчёт, уточнит детали и согласует следующий шаг.</p>
      </div>
      <CheckoutExperience installmentText={settings?.installment_text?.trim() || null} />
    </section>
  );
}
