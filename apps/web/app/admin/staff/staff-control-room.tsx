'use client';

import type {
  StaffDirectoryEntry,
  StaffInvitationEntry,
  StaffRole,
  StaffSessionEntry,
} from '@project-name/identity/staff';
import { useState, type FormEvent } from 'react';

interface StaffControlRoomProps {
  readonly currentActorId: string | null;
  readonly invitations: readonly StaffInvitationEntry[];
  readonly principalRoles: readonly string[];
  readonly sessions: readonly StaffSessionEntry[];
  readonly staff: readonly StaffDirectoryEntry[];
}

const roleLabel: Record<StaffRole, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  OWNER: 'Владелец',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function StaffControlRoom({
  currentActorId,
  invitations,
  principalRoles,
  sessions,
  staff,
}: StaffControlRoomProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('MANAGER');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const owner = principalRoles.includes('OWNER');

  async function request(url: string, method: 'PATCH' | 'POST', body: object) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method,
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Действие отклонено.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Действие не выполнено.');
      setBusy(false);
    }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await request('/api/v1/admin/staff', 'POST', { email, role });
  }

  return (
    <div className="staff-admin-grid">
      <section className="staff-admin-panel staff-invite-panel">
        <div>
          <p className="commerce-kicker">Новый доступ</p>
          <h2>Пригласить сотрудника</h2>
          <p>Ключ из письма одноразовый и действует 72 часа.</p>
        </div>
        <form onSubmit={invite}>
          <label>
            Электронная почта
            <input
              autoComplete="email"
              maxLength={254}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Роль
            <select onChange={(event) => setRole(event.target.value as StaffRole)} value={role}>
              <option value="MANAGER">Менеджер</option>
              {owner ? <option value="ADMIN">Администратор</option> : null}
              {owner ? <option value="OWNER">Владелец</option> : null}
            </select>
          </label>
          <button className="cart-primary-action" disabled={busy} type="submit">
            Отправить приглашение
          </button>
        </form>
        {message === null ? null : (
          <p aria-live="polite" className="commerce-note" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="staff-admin-panel staff-directory-panel">
        <div>
          <p className="commerce-kicker">Команда</p>
          <h2>Активные роли</h2>
        </div>
        <div className="staff-admin-list">
          {staff.map((entry) => {
            const currentRole = entry.roles[0] ?? 'MANAGER';
            const self = entry.actorId === currentActorId;
            return (
              <article key={entry.actorId}>
                <div>
                  <strong>{entry.email}</strong>
                  <span>
                    {entry.activeSessionCount} активных сеансов{self ? ' · это вы' : ''}
                  </span>
                </div>
                <div className="staff-admin-actions">
                  <select
                    aria-label={`Роль ${entry.email}`}
                    defaultValue={currentRole}
                    disabled={busy || (!owner && currentRole !== 'MANAGER')}
                    onChange={(event) =>
                      request(`/api/v1/admin/staff/${entry.actorId}`, 'PATCH', {
                        action: 'CHANGE_ROLE',
                        role: event.target.value,
                      })
                    }
                  >
                    <option value="MANAGER">Менеджер</option>
                    {owner ? <option value="ADMIN">Администратор</option> : null}
                    {owner ? <option value="OWNER">Владелец</option> : null}
                  </select>
                  <button
                    disabled={busy || self || (!owner && currentRole !== 'MANAGER')}
                    onClick={() =>
                      request(`/api/v1/admin/staff/${entry.actorId}`, 'PATCH', {
                        action: 'DISABLE',
                      })
                    }
                    type="button"
                  >
                    Отключить
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="staff-admin-panel">
        <div>
          <p className="commerce-kicker">Ожидают ответа</p>
          <h2>Приглашения</h2>
        </div>
        <div className="staff-admin-list compact">
          {invitations.length === 0 ? <p>Нет приглашений.</p> : null}
          {invitations.map((invitation) => (
            <article key={invitation.invitationId}>
              <div>
                <strong>{roleLabel[invitation.role]}</strong>
                <span>
                  {invitation.status} · до {formatDate(invitation.expiresAt)}
                </span>
              </div>
              {invitation.status === 'PENDING' ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    request(
                      `/api/v1/admin/staff/invitations/${invitation.invitationId}/revoke`,
                      'POST',
                      {},
                    )
                  }
                  type="button"
                >
                  Отозвать
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="staff-admin-panel">
        <div>
          <p className="commerce-kicker">Безопасность</p>
          <h2>Сеансы</h2>
        </div>
        <div className="staff-admin-list compact">
          {sessions.map((session) => (
            <article key={session.sessionId}>
              <div>
                <strong>{session.isCurrent ? 'Текущий сеанс' : 'Сеанс сотрудника'}</strong>
                <span>До {formatDate(session.expiresAt)}</span>
              </div>
              {session.revokedAt === null ? (
                <button
                  disabled={busy}
                  onClick={() =>
                    request(`/api/v1/admin/staff/sessions/${session.sessionId}/revoke`, 'POST', {})
                  }
                  type="button"
                >
                  Завершить
                </button>
              ) : (
                <span>Завершён</span>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
