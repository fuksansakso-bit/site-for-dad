import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
import { updateSettings } from '../actions';
import { AdminPageHeader } from '../admin-components';
import { AdminFrame } from '../admin-frame';

export default async function SettingsAdmin() {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const client = await createSupabaseServerClient();
  const { data } = client
    ? await client.from('site_settings').select('*').eq('id', true).single()
    : { data: null };
  const brandMissing =
    !data?.site_name?.trim() || data.site_name.trim().toUpperCase() === 'PROJECT_NAME';

  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        description="Публичное название, контакты и подтверждённые условия обслуживания. Изменения появятся на сайте после сохранения."
        eyebrow="Публичные данные"
        title="Настройки сайта"
      />
      {brandMissing && (
        <div className="notice notice-warning admin-brand-warning" role="status">
          <strong>Укажите название бренда перед production-запуском</strong>
          <span>До этого Preview использует нейтральное название «Жалюзи на заказ».</span>
        </div>
      )}
      {data && (
        <form action={updateSettings} className="form admin-settings-form">
          <fieldset className="admin-form-section">
            <legend>Название и визуальная идентичность</legend>
            <p>Название отображается в шапке, подвале и метаданных публичного сайта.</p>
            <div className="admin-form-grid">
              <label>
                Название бренда
                <input
                  name="siteName"
                  defaultValue={brandMissing ? '' : data.site_name}
                  required
                  maxLength={160}
                  placeholder="Название вашей компании"
                />
              </label>
              <label className="admin-file-field">
                <span>Новый логотип (необязательно)</span>
                <input name="logo" type="file" accept="image/jpeg,image/png,image/webp" />
                <small>JPEG, PNG или WebP до 3 МБ</small>
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Контакты и регион</legend>
            <div className="admin-form-grid">
              <label>
                WhatsApp
                <input name="whatsapp" defaultValue={data.whatsapp_phone} pattern="7[0-9]{10}" />
                <small>11 цифр, начиная с 7</small>
              </label>
              <label>
                Телефон
                <input name="phone" defaultValue={data.phone} pattern="\+7[0-9]{10}" />
                <small>Формат +7XXXXXXXXXX</small>
              </label>
              <label className="admin-field-wide">
                Регион обслуживания
                <input name="region" defaultValue={data.region} required maxLength={160} />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Подтверждённые условия</legend>
            <div className="admin-form-grid">
              <label>
                Срок изготовления
                <input
                  name="leadTime"
                  defaultValue={data.lead_time_text}
                  required
                  maxLength={160}
                />
              </label>
              <label>
                Гарантия
                <input name="warranty" defaultValue={data.warranty_text} required maxLength={160} />
              </label>
              <label className="admin-field-wide">
                Текст о рассрочке
                <textarea
                  name="installment"
                  defaultValue={data.installment_text}
                  maxLength={1000}
                />
              </label>
            </div>
            <div className="admin-service-options">
              <label className="admin-check">
                <input type="checkbox" name="measurement" defaultChecked={data.free_measurement} />
                <span>Бесплатный замер</span>
              </label>
              <label className="admin-check">
                <input type="checkbox" name="delivery" defaultChecked={data.free_delivery} />
                <span>Бесплатная доставка</span>
              </label>
              <label className="admin-check">
                <input
                  type="checkbox"
                  name="installation"
                  defaultChecked={data.free_installation}
                />
                <span>Бесплатная установка</span>
              </label>
            </div>
          </fieldset>
          <div className="admin-form-submit">
            <p>Сохраняйте только подтверждённые владельцем данные.</p>
            <button>Сохранить настройки</button>
          </div>
        </form>
      )}
    </AdminFrame>
  );
}
