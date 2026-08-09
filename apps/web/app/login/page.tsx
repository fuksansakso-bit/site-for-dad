import Link from 'next/link';
import { redirect } from 'next/navigation';

import { readStaffPrincipal } from '../../lib/account-session';
import { LoginExperience } from './passwordless-login';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const principal = await readStaffPrincipal();
  if (principal !== null) redirect('/admin');

  return (
    <main className="login-shell">
      <header className="login-header">
        <Link className="commerce-brand" href="/">
          <span>PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <Link href="/">Вернуться на сайт</Link>
      </header>
      <section className="login-layout">
        <div className="login-intro">
          <p className="commerce-kicker">Команда</p>
          <h1>Управление без общего пароля</h1>
          <p>
            Доступ получают только приглашённые сотрудники. Клиентам вход не нужен: каталог, расчёт,
            корзина и заявка работают без регистрации.
          </p>
          <ul>
            <li>Код действует 10 минут</li>
            <li>Пароль не создаётся и не хранится</li>
            <li>Гостевой путь остаётся доступен</li>
          </ul>
        </div>
        <LoginExperience
          localInboxUrl={
            process.env['NEXT_PUBLIC_APP_ENV'] === 'local' ? 'http://127.0.0.1:8025' : null
          }
        />
      </section>
    </main>
  );
}
