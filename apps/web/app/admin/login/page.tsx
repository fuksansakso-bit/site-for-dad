import Link from 'next/link';
import { redirect } from 'next/navigation';

import { currentStaff } from '../../../lib/phase2a/staff';
import { LoginForm } from './login-form';

export default async function AdminLogin() {
  if (await currentStaff()) redirect('/admin');
  return (
    <section className="admin-login-shell">
      <div className="admin-login-intro">
        <Link className="admin-login-back" href="/">
          <span aria-hidden="true">←</span> Вернуться на сайт
        </Link>
        <div className="admin-login-copy">
          <span className="admin-login-mark" aria-hidden="true">
            Ж
          </span>
          <p className="eyebrow">Закрытое рабочее пространство</p>
          <h1>Всё важное для управления — без лишнего шума.</h1>
          <p>
            Каталог, заявки, портфолио и настройки доступны только сотрудникам с назначенной ролью.
          </p>
        </div>
        <ul className="admin-login-trust" aria-label="Защита рабочего пространства">
          <li>Индивидуальный доступ</li>
          <li>Разграничение ролей</li>
          <li>Журнал важных действий</li>
        </ul>
      </div>
      <div className="admin-login-panel">
        <div className="admin-login-card">
          <p className="eyebrow">Центр управления</p>
          <h2>Вход для сотрудников</h2>
          <p>Используйте рабочую почту и пароль, выданные владельцем.</p>
          <LoginForm />
          <small>Нет доступа? Обратитесь к владельцу сайта.</small>
        </div>
      </div>
    </section>
  );
}
