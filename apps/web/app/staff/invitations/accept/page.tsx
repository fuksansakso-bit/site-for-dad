import Link from 'next/link';

import { InvitationAcceptance } from './invitation-acceptance';

export default function StaffInvitationAcceptancePage() {
  return (
    <main className="login-shell">
      <header className="login-header">
        <Link className="commerce-brand" href="/">
          <span>PN</span>
          <strong>PROJECT_NAME</strong>
        </Link>
        <Link href="/login">Вход для сотрудников</Link>
      </header>
      <section className="login-layout">
        <div className="login-intro">
          <p className="commerce-kicker">Команда</p>
          <h1>Принять приглашение</h1>
          <p>После подтверждения войдите по одноразовому коду из письма. Пароль не создаётся.</p>
        </div>
        <InvitationAcceptance />
      </section>
    </main>
  );
}
