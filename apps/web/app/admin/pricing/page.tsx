import Link from 'next/link';

import { readCatalogAdminPrincipal } from '../../../lib/catalog-admin-session';
import { getWebPricing } from '../../../lib/catalog-runtime';
import { signInCatalogAdmin, signOutCatalogAdmin } from '../catalog/actions';
import {
  activatePriceVersion,
  rejectPriceVersion,
  removePricingOverride,
  setPricingOverride,
  verifyPricingParity,
} from './actions';

export const dynamic = 'force-dynamic';

function minor(value: number | null): string {
  if (value === null) return '—';
  return `${Math.trunc(value / 100).toLocaleString('ru-RU')},${String(value % 100).padStart(2, '0')} ₽`;
}

export default async function AdminPricingPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ notice?: string }>;
}): Promise<React.JSX.Element> {
  const [principal, query] = await Promise.all([readCatalogAdminPrincipal(), searchParams]);
  if (principal === null) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login-card">
          <div className="catalog-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="overline">PHASE 1C · PRICING</p>
          <h1>Управление ценами</h1>
          <p>
            Используйте существующий локальный токен OWNER или ADMIN. MANAGER не может активировать
            цену.
          </p>
          {query.notice === undefined ? null : <p className="notice">{query.notice}</p>}
          <form action={signInCatalogAdmin} className="login-form">
            <label>
              Токен сессии
              <input autoComplete="off" name="token" required type="password" />
            </label>
            <button className="button button-ink" type="submit">
              Открыть
            </button>
          </form>
        </section>
      </main>
    );
  }
  const [overview, bootstrap] = await Promise.all([
    getWebPricing().getAdminOverview(),
    getWebPricing().getBootstrap(),
  ]);
  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div>
          <p className="overline">PHASE 1C · PRICING</p>
          <h1>Версии и правила цен</h1>
        </div>
        <nav>
          <Link className="button" href="/admin/catalog">
            Каталог
          </Link>
          <Link className="button" href="/configure">
            Конфигуратор
          </Link>
          <form action={signOutCatalogAdmin}>
            <button className="button" type="submit">
              Выйти
            </button>
          </form>
        </nav>
      </header>
      <section className="admin-hero">
        <div>
          <p className="section-number">01 / ACTIVE VERSION</p>
          <h2>
            Активна версия #
            {overview.versions.find((item) => item.id === overview.activePriceVersionId)
              ?.versionNumber ?? '—'}
          </h2>
          <p>Расчёты выполняются только по этому immutable набору правил PostgreSQL.</p>
        </div>
        <dl>
          <dt>Правил</dt>
          <dd>{bootstrap.profiles.length}</dd>
          <dt>Parity fixtures</dt>
          <dd>
            {overview.versions.find((item) => item.id === overview.activePriceVersionId)
              ?.fixtureCount ?? 0}
          </dd>
          <dt>Макс. отклонение</dt>
          <dd>
            {minor(
              overview.versions.find((item) => item.id === overview.activePriceVersionId)
                ?.maximumDeviationMinor ?? null,
            )}
          </dd>
        </dl>
      </section>
      {query.notice === undefined ? null : <p className="notice admin-notice">{query.notice}</p>}
      <section className="admin-section">
        <div className="admin-section-heading">
          <p className="section-number">02 / VERSIONS</p>
          <h2>Review и активация</h2>
        </div>
        <div className="admin-release-grid">
          {overview.versions.map((version) => (
            <article className="admin-release-card" key={version.id}>
              <div>
                <span
                  className={`status status-${version.status === 'ACTIVE' ? 'good' : version.status === 'REJECTED' ? 'bad' : 'warn'}`}
                >
                  {version.status}
                </span>
                <h3>PriceVersion #{version.versionNumber}</h3>
                <p>{version.sourceVersion ?? 'Правила цены не загружены'}</p>
              </div>
              <dl>
                <dt>Правил</dt>
                <dd>{version.ruleCount}</dd>
                <dt>Изменений</dt>
                <dd>{version.changeCount}</dd>
                <dt>Parity</dt>
                <dd>{version.parityStatus ?? 'PENDING'}</dd>
                <dt>Fixtures</dt>
                <dd>{version.fixtureCount}</dd>
                <dt>Неподдержано</dt>
                <dd>{version.unsupportedCount}</dd>
              </dl>
              {version.status === 'ACTIVE' ? null : (
                <div className="pricing-admin-commands">
                  <form action={verifyPricingParity} className="command-form">
                    <input name="priceVersionId" type="hidden" value={version.id} />
                    <input
                      name="reason"
                      type="hidden"
                      value="Повторная проверка сохранённых AMIGO fixtures."
                    />
                    <button className="button" type="submit">
                      Запустить parity
                    </button>
                  </form>
                  <form action={activatePriceVersion} className="command-form">
                    <input name="priceVersionId" type="hidden" value={version.id} />
                    <label>
                      Причина активации
                      <input
                        name="reason"
                        required
                        defaultValue="Review выполнен; parity прошёл."
                      />
                    </label>
                    <button className="button button-brass" type="submit">
                      Активировать
                    </button>
                  </form>
                  <form action={rejectPriceVersion} className="command-form">
                    <input name="priceVersionId" type="hidden" value={version.id} />
                    <label>
                      Причина отклонения
                      <input
                        name="reason"
                        required
                        defaultValue="Candidate требует корректировки."
                      />
                    </label>
                    <button className="button" type="submit">
                      Отклонить
                    </button>
                  </form>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading">
          <p className="section-number">03 / RULES & OVERRIDES</p>
          <h2>Проверенные правила</h2>
          <p>LocalPriceOverride заменяет AMIGO цену и сохраняется отдельно от sync.</p>
        </div>
        <div className="pricing-rule-table">
          {bootstrap.profiles.map((profile) => (
            <article key={profile.id}>
              <div>
                <strong>{profile.optionData.familyName}</strong>
                <span>
                  {profile.optionData.systemName} · {profile.optionData.materialName} · арт.{' '}
                  {profile.optionData.materialArticle}
                </span>
              </div>
              <dl>
                <dt>Источник</dt>
                <dd>
                  {profile.kind === 'AREA_MINIMUM'
                    ? minor(profile.basePriceMinor) + ' / м²'
                    : 'Таблица размеров'}
                </dd>
                <dt>Новая</dt>
                <dd>AMIGO</dd>
                <dt>Absolute diff</dt>
                <dd>0 ₽</dd>
                <dt>Percentage diff</dt>
                <dd>0%</dd>
              </dl>
              <div className="pricing-admin-commands">
                <form action={setPricingOverride} className="command-form">
                  <input name="materialVariantId" type="hidden" value={profile.materialVariantId} />
                  <label>
                    Новая цена, ₽
                    <input inputMode="decimal" name="amountRubles" placeholder="1500,00" required />
                  </label>
                  <label>
                    Причина
                    <input name="reason" defaultValue="Локальное решение владельца." required />
                  </label>
                  <button className="button button-brass" type="submit">
                    Создать override
                  </button>
                </form>
                <form action={removePricingOverride} className="command-form">
                  <input name="materialVariantId" type="hidden" value={profile.materialVariantId} />
                  <input name="reason" type="hidden" value="Возврат к подтверждённой цене AMIGO." />
                  <button className="button" type="submit">
                    Вернуть AMIGO
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-section">
        <div className="admin-section-heading">
          <p className="section-number">04 / AUDIT</p>
          <h2>История</h2>
        </div>
        <div className="admin-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Время</th>
                <th>Действие</th>
                <th>Результат</th>
                <th>Причина</th>
              </tr>
            </thead>
            <tbody>
              {overview.audit.map((entry) => (
                <tr key={`${entry.createdAt}-${entry.targetId}`}>
                  <td>
                    {new Intl.DateTimeFormat('ru-RU', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'Europe/Moscow',
                    }).format(new Date(entry.createdAt))}
                  </td>
                  <td>{entry.action}</td>
                  <td>{entry.outcome}</td>
                  <td>{entry.reasonCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
