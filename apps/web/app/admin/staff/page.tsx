import { IdentityError } from '@project-name/identity';
import { redirect } from 'next/navigation';

import { requireStaffPrincipal } from '../../../lib/account-session';
import { getWebStaffAdministration } from '../../../lib/catalog-runtime';
import { StaffControlRoom } from './staff-control-room';

export const dynamic = 'force-dynamic';

async function loadStaffAdministration() {
  try {
    const principal = await requireStaffPrincipal();
    const administration = getWebStaffAdministration();
    const [staff, invitations, sessions] = await Promise.all([
      administration.listStaff(principal),
      administration.listInvitations(principal),
      administration.listSessions(principal),
    ]);
    return { invitations, principal, sessions, staff };
  } catch (error) {
    if (error instanceof IdentityError) redirect('/login');
    throw error;
  }
}

export default async function StaffAdministrationPage() {
  const { invitations, principal, sessions, staff } = await loadStaffAdministration();
  return (
    <main className="staff-admin-page">
      <header className="staff-admin-heading">
        <div>
          <p className="commerce-kicker">Доступ и безопасность</p>
          <h1>Сотрудники</h1>
          <p>
            Приглашения, роли и активные сеансы. Каждое изменение проверяется на сервере и попадает
            в журнал.
          </p>
        </div>
        <span className="staff-admin-role">{principal.roles.join(' · ')}</span>
      </header>
      <StaffControlRoom
        currentActorId={principal.actorId}
        invitations={invitations}
        principalRoles={principal.roles}
        sessions={sessions}
        staff={staff}
      />
    </main>
  );
}
