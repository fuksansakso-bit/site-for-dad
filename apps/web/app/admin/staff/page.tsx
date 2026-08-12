import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { createStaff, updateStaff } from '../actions';
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
      <h1>Сотрудники</h1>
      <p className="notice">Последний активный владелец защищён на уровне базы данных.</p>
      <form action={createStaff} className="form card">
        <label>
          Имя
          <input name="displayName" required maxLength={160} />
        </label>
        <label>
          Email
          <input name="email" type="email" required />
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
          />
        </label>
        <label>
          Роль
          <select name="role">
            <option value="MANAGER">Менеджер</option>
            <option value="ADMIN">Администратор</option>
            <option value="OWNER">Владелец</option>
          </select>
        </label>
        <button>Создать сотрудника</button>
      </form>
      <div className="grid">
        {data?.map((person) => (
          <form action={updateStaff} className="form card" key={person.id}>
            <input type="hidden" name="id" value={person.id} />
            <h3>{person.display_name}</h3>
            <label>
              Роль
              <select name="role" defaultValue={person.role}>
                <option value="MANAGER">Менеджер</option>
                <option value="ADMIN">Администратор</option>
                <option value="OWNER">Владелец</option>
              </select>
            </label>
            <label>
              <span>
                <input name="active" type="checkbox" defaultChecked={person.is_active} /> Активен
              </span>
            </label>
            <button>Сохранить доступ</button>
          </form>
        ))}
      </div>
    </AdminFrame>
  );
}
