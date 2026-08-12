import { CheckoutExperience } from './checkout-experience';
export default function CheckoutPage() {
  return (
    <section className="shell">
      <p className="eyebrow">Гостевая заявка</p>
      <h1>Контактные данные</h1>
      <p>
        Цена будет пересчитана на сервере перед сохранением. Отправляя форму, вы соглашаетесь на
        обработку данных для ответа по заявке.
      </p>
      <CheckoutExperience />
    </section>
  );
}
