import { StatusBadge } from '../../../components/ui/primitives';
import { PremiumSelect } from '../../../components/ui/premium-select';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { presentStaffRole } from '../../../lib/presentation';
import { createStaff, updateStaff } from '../actions';
import { AdminEmptyState, AdminPageHeader, AdminSectionHeader } from '../admin-components';
import { AdminFrame } from '../admin-frame';

export default async function StaffAdmin() {
  const staff = await requireStaff(['OWNER']);
  const client = await createSupabaseServerClient();
  const { data } = client
    ? await client
        .from('staff_profiles')
        .select('id,display_name,role,is_active,created_at')
        .order('created_at')
    : { data: [] };
  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        description="Индивидуальные учётные записи и роли. Доступ нельзя передавать между сотрудниками."
        eyebrow="Безопасность"
        title="Сотрудники"
      />
      <div className="notice notice-warning admin-owner-guard" role="status">
        <strong>Защита владельца включена</strong>
        <span>Последнего активного владельца нельзя отключить или понизить в роли.</span>
      </div>

      <div className="admin-editor-layout admin-staff-layout">
        <form action={createStaff} className="form admin-panel admin-staff-create">
          <AdminSectionHeader
            description="Создавайте отдельный доступ для каждого человека."
            title="Новый сотрудник"
          />
          <label>
            Имя
            <input name="displayName" required maxLength={160} />
          </label>
          <label>
            Рабочая почта
            <input name="email" type="email" required autoComplete="off" />
          </label>
          <label>
            Начальный пароль
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{12,}"
              title="Не менее 12 символов: строчная, заглавная, цифра и специальный символ"
              required
              autoComplete="new-password"
            />
            <small>От 12 символов: строчная, заглавная, цифра и специальный знак.</small>
          </label>
          <PremiumSelect
            label="Роль"
            name="role"
            options={[
              { label: 'Менеджер', value: 'MANAGER' },
              { label: 'Администратор', value: 'ADMIN' },
              { label: 'Владелец', value: 'OWNER' },
            ]}
          />
          <button>Создать сотрудника</button>
        </form>

        <aside className="admin-panel admin-role-guide">
          <AdminSectionHeader title="Что разрешают роли" />
          <dl>
            <div>
              <dt>Менеджер</dt>
              <dd>Заявки и ограниченная сводка AI без доступа к фото.</dd>
            </div>
            <div>
              <dt>Администратор</dt>
              <dd>Каталог, портфолио, настройки и управление AI.</dd>
            </div>
            <div>
              <dt>Владелец</dt>
              <dd>Все разделы, включая управление сотрудниками.</dd>
            </div>
          </dl>
        </aside>
      </div>

      <AdminSectionHeader
        description={`${data?.length ?? 0} учётных записей`}
        title="Текущая команда"
      />
      {!data?.length ? (
        <AdminEmptyState
          description="Создайте первую персональную учётную запись сотрудника."
          title="Сотрудников пока нет"
        />
      ) : (
        <div className="admin-staff-grid">
          {data.map((person) => (
            <form action={updateStaff} className="admin-staff-card" key={person.id}>
              <input type="hidden" name="id" value={person.id} />
              <div className="admin-staff-head">
                <span className="admin-profile-avatar" aria-hidden="true">
                  {person.display_name.trim().slice(0, 1).toLocaleUpperCase('ru-RU')}
                </span>
                <div>
                  <h3>{person.display_name}</h3>
                  <StatusBadge tone={person.is_active ? 'success' : 'error'}>
                    {person.is_active ? 'Активен' : 'Отключён'}
                  </StatusBadge>
                </div>
              </div>
              <PremiumSelect
                defaultValue={person.role}
                label="Роль"
                name="role"
                options={[
                  { label: 'Менеджер', value: 'MANAGER' },
                  { label: 'Администратор', value: 'ADMIN' },
                  { label: 'Владелец', value: 'OWNER' },
                ]}
              />
              <small>Сейчас: {presentStaffRole(person.role)}</small>
              <label className="admin-check">
                <input name="active" type="checkbox" defaultChecked={person.is_active} />
                <span>Разрешить вход</span>
              </label>
              <button className="secondary">Сохранить доступ</button>
            </form>
          ))}
        </div>
      )}
    </AdminFrame>
  );
}
