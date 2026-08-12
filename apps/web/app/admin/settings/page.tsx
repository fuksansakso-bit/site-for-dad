import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { updateSettings } from '../actions';
import { AdminFrame } from '../admin-frame';

export default async function SettingsAdmin() {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  const { data } = client
    ? await client.from('site_settings').select('*').eq('id', true).single()
    : { data: null };

  return (
    <AdminFrame staff={staff}>
      <h1>Настройки сайта</h1>
      {data && (
        <form action={updateSettings} className="form">
          <label>
            Название
            <input name="siteName" defaultValue={data.site_name} required maxLength={160} />
          </label>
          <label>
            Новый логотип (необязательно)
            <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label>
            WhatsApp
            <input name="whatsapp" defaultValue={data.whatsapp_phone} pattern="7[0-9]{10}" />
          </label>
          <label>
            Телефон
            <input name="phone" defaultValue={data.phone} pattern="\+7[0-9]{10}" />
          </label>
          <label>
            Регион
            <input name="region" defaultValue={data.region} required maxLength={160} />
          </label>
          <label>
            Срок
            <input name="leadTime" defaultValue={data.lead_time_text} required maxLength={160} />
          </label>
          <label>
            Гарантия
            <input name="warranty" defaultValue={data.warranty_text} required maxLength={160} />
          </label>
          <label>
            <span>
              <input type="checkbox" name="measurement" defaultChecked={data.free_measurement} />{' '}
              Бесплатный замер
            </span>
          </label>
          <label>
            <span>
              <input type="checkbox" name="delivery" defaultChecked={data.free_delivery} />{' '}
              Бесплатная доставка
            </span>
          </label>
          <label>
            <span>
              <input type="checkbox" name="installation" defaultChecked={data.free_installation} />{' '}
              Бесплатная установка
            </span>
          </label>
          <label>
            Рассрочка
            <textarea name="installment" defaultValue={data.installment_text} maxLength={1000} />
          </label>
          <button>Сохранить</button>
        </form>
      )}
    </AdminFrame>
  );
}
