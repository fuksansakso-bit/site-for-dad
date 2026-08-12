import type { Metadata } from 'next';

import { Breadcrumbs } from '../../components/ui/primitives';
import { CartExperience } from './cart-experience';

export const metadata: Metadata = {
  description: 'Проверьте выбранные материалы, размеры и предварительную стоимость.',
  title: 'Корзина',
};

export default function CartPage() {
  return (
    <section className="shell cart-page-shell">
      <Breadcrumbs items={[{ href: '/', label: 'Главная' }, { label: 'Корзина' }]} />
      <div className="cart-page-heading">
        <p className="eyebrow">Без регистрации</p>
        <h1>Проверьте свой выбор</h1>
        <p>Корзина хранится только в этом браузере. Перед заявкой цены проверяются на сервере.</p>
      </div>
      <CartExperience />
    </section>
  );
}
