import { redirect } from 'next/navigation';
import { currentStaff } from '../../../lib/phase2a/staff';
import { LoginForm } from './login-form';
export default async function AdminLogin() {
  if (await currentStaff()) redirect('/admin');
  return (
    <section className="shell">
      <p className="eyebrow">Только для сотрудников</p>
      <h1>Вход в админку</h1>
      <LoginForm />
    </section>
  );
}
