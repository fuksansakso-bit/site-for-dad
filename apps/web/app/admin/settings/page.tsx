import { randomUUID } from 'node:crypto';

import { requireBusinessAdminPrincipal } from '../../../lib/business-admin-session';
import { getWebBusinessAdministration } from '../../../lib/catalog-runtime';
import { activateSiteSettings } from './actions';

export const dynamic = 'force-dynamic';

const notices: Readonly<Record<string, string>> = {
  BUSINESS_ADMIN_CONFLICT: 'Настройки уже изменились. Обновите страницу.',
  BUSINESS_ADMIN_INVALID_INPUT: 'Проверьте значения и причину изменения.',
  SITE_SETTINGS_ACTIVATED: 'Новая версия настроек активирована.',
};

function moment(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}

export default async function SiteSettingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly notice?: string }>;
}): Promise<React.JSX.Element> {
  const { principal, role } = await requireBusinessAdminPrincipal();
  const revisions = await getWebBusinessAdministration().listSettings({
    actorId: principal.actorId,
    correlationId: `site-settings-list-${randomUUID()}`,
    role,
  });
  const active = revisions.find((item) => item.status === 'ACTIVE');
  if (active === undefined) throw new Error('ACTIVE_SITE_SETTINGS_MISSING');
  const notice = (await searchParams).notice;

  return (
    <main className="settings-admin-page">
      <header className="business-page-heading">
        <div>
          <p>Контакты и условия</p>
          <h1>Настройки сайта</h1>
        </div>
        <span>Активна версия #{active.version}</span>
      </header>
      {notice === undefined ? null : (
        <p className="request-admin-notice">{notices[notice] ?? notice}</p>
      )}
      <form action={activateSiteSettings} className="settings-admin-form">
        <input name="expectedVersion" type="hidden" value={active.version} />
        <label>
          Название бизнеса
          <input
            defaultValue={active.settings.businessName}
            maxLength={120}
            name="businessName"
            required
          />
        </label>
        <label>
          WhatsApp
          <input
            defaultValue={`+${active.settings.whatsappRecipient}`}
            inputMode="tel"
            name="whatsappRecipient"
            pattern="\+?[1-9][0-9]{7,14}"
            required
          />
        </label>
        <label>
          Территория работы
          <input
            defaultValue={active.settings.territory}
            maxLength={160}
            name="territory"
            required
          />
        </label>
        <label>
          Срок изготовления
          <input
            defaultValue={active.settings.manufacturingLeadTime}
            maxLength={120}
            name="manufacturingLeadTime"
            required
          />
        </label>
        <label>
          Гарантия
          <input defaultValue={active.settings.warranty} maxLength={120} name="warranty" required />
        </label>
        <label>
          Замер
          <input
            defaultValue={active.settings.services.measurement}
            maxLength={80}
            name="measurement"
            required
          />
        </label>
        <label>
          Доставка
          <input
            defaultValue={active.settings.services.delivery}
            maxLength={80}
            name="delivery"
            required
          />
        </label>
        <label>
          Установка
          <input
            defaultValue={active.settings.services.installation}
            maxLength={80}
            name="installation"
            required
          />
        </label>
        <label className="settings-wide-field">
          Рассрочка
          <input disabled value={active.settings.installmentText} />
          <small>До отдельного решения допускается только эта безопасная формулировка.</small>
        </label>
        <label className="settings-wide-field">
          Причина новой версии
          <textarea maxLength={500} minLength={5} name="reason" required rows={3} />
        </label>
        <button className="primary-button" type="submit">
          Создать и активировать новую версию
        </button>
      </form>
      <section className="settings-history">
        <h2>История версий</h2>
        {revisions.map((item) => (
          <article key={item.id}>
            <strong>Версия #{item.version}</strong>
            <span>{item.status}</span>
            <p>{item.reason}</p>
            <time>{moment(item.createdAt)}</time>
          </article>
        ))}
      </section>
    </main>
  );
}
