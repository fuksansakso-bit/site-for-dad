import type { Metadata } from 'next';
import Link from 'next/link';

import { ProductConfigurator } from './product-configurator';

export const metadata: Metadata = {
  description:
    'Пошаговый расчёт жалюзи по активному локальному каталогу и проверенной версии цены.',
  robots: { follow: false, index: false },
  title: 'Конфигуратор жалюзи · PROJECT_NAME',
};

export default async function ConfigurePage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const parameters = await searchParams;
  const candidate = typeof parameters['edit'] === 'string' ? parameters['edit'] : null;
  const editReference =
    candidate !== null && /^[A-Za-z0-9_-]{32}$/u.test(candidate) ? candidate : null;
  return (
    <main className="configurator-shell">
      <header className="configurator-header">
        <Link className="configurator-brand" href="/catalog" aria-label="Вернуться в каталог">
          <span aria-hidden="true">PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <p>Точный локальный расчёт · без регистрации</p>
      </header>
      <ProductConfigurator editReference={editReference} />
    </main>
  );
}
