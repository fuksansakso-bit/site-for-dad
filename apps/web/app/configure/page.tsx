import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductConfigurator } from './product-configurator';

export const metadata: Metadata = {
  description:
    'Пошаговый расчёт жалюзи по активному локальному каталогу и проверенной версии цены.',
  robots: { follow: false, index: false },
  title: 'Конфигуратор жалюзи · PROJECT_NAME',
};

export default function ConfigurePage(): React.JSX.Element {
  return (
    <main className="configurator-shell">
      <header className="configurator-header">
        <Link className="configurator-brand" href="/catalog" aria-label="Вернуться в каталог">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Точный локальный расчёт · без регистрации</p>
      </header>
      <ProductConfigurator />
    </main>
  );
}
