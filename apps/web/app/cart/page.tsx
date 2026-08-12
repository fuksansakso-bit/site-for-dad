import { CartExperience } from './cart-experience';
export default function CartPage() {
  return (
    <section className="shell">
      <p className="eyebrow">Без регистрации</p>
      <h1>Корзина</h1>
      <CartExperience />
    </section>
  );
}
