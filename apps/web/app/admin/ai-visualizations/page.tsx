import Link from 'next/link';

import { StatusBadge } from '../../../components/ui/primitives';
import { PremiumSelect } from '../../../components/ui/premium-select';
import { getAiVisualizerServerConfig } from '../../../lib/ai-visualization/config';
import { getEffectiveAiSettings } from '../../../lib/ai-visualization/job-data';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';
import {
  presentAdminAuditAction,
  presentAiError,
  presentAiStatus,
  presentBlindFamily,
  presentProviderError,
} from '../../../lib/presentation';
import {
  AdminEmptyState,
  AdminMetric,
  AdminPageHeader,
  AdminSectionHeader,
} from '../admin-components';
import { AdminFrame } from '../admin-frame';
import { AdminImageButton } from './admin-image-button';
import { deleteAiVisualizationJob, runAiCleanup, updateAiVisualizerSettings } from './actions';

const STATUSES = [
  'CREATED',
  'UPLOAD_PENDING',
  'READY',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'REJECTED',
  'EXPIRED',
  'DELETED',
] as const;

type Stats = {
  totalJobs: number;
  jobsToday: number;
  successfulToday: number;
  failedToday: number;
  rejectedToday: number;
  active: number;
  expired: number;
  estimatedStorageBytes: number;
  averageDurationSeconds: number;
  retryAttempts: number;
  nextCleanupAt: string | null;
  providerErrorsToday: number;
  modelUnavailableToday: number;
  rateLimitedToday: number;
};

const EMPTY_STATS: Stats = {
  active: 0,
  averageDurationSeconds: 0,
  estimatedStorageBytes: 0,
  expired: 0,
  failedToday: 0,
  jobsToday: 0,
  modelUnavailableToday: 0,
  nextCleanupAt: null,
  providerErrorsToday: 0,
  rateLimitedToday: 0,
  rejectedToday: 0,
  retryAttempts: 0,
  successfulToday: 0,
  totalJobs: 0,
};

function safeDate(value: string | undefined): string | null {
  return value?.match(/^\d{4}-\d{2}-\d{2}$/u) ? value : null;
}

function safeToken(value: string | undefined, maximum = 200): string | null {
  return value && value.length <= maximum && /^[A-Za-z0-9._/-]+$/u.test(value) ? value : null;
}

function integer(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function statsFrom(value: unknown): Stats {
  const source =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    active: integer(source['active']),
    averageDurationSeconds: integer(source['averageDurationSeconds']),
    estimatedStorageBytes: integer(source['estimatedStorageBytes']),
    expired: integer(source['expired']),
    failedToday: integer(source['failedToday']),
    jobsToday: integer(source['jobsToday']),
    modelUnavailableToday: integer(source['modelUnavailableToday']),
    nextCleanupAt: typeof source['nextCleanupAt'] === 'string' ? source['nextCleanupAt'] : null,
    providerErrorsToday: integer(source['providerErrorsToday']),
    rateLimitedToday: integer(source['rateLimitedToday']),
    rejectedToday: integer(source['rejectedToday']),
    retryAttempts: integer(source['retryAttempts']),
    successfulToday: integer(source['successfulToday']),
    totalJobs: integer(source['totalJobs']),
  };
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} КБ`
    : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'error' {
  if (status === 'SUCCEEDED') return 'success';
  if (['FAILED', 'REJECTED'].includes(status)) return 'error';
  if (['CREATED', 'UPLOAD_PENDING', 'READY', 'PROCESSING'].includes(status)) return 'warning';
  return 'neutral';
}

export default async function AiVisualizationsAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    material?: string;
    status?: string;
  }>;
}) {
  const staff = await requireStaff();
  const client = createSupabaseAdminClient();
  const queryParams = await searchParams;
  const config = getAiVisualizerServerConfig();
  if (!client) {
    return (
      <AdminFrame staff={staff}>
        <AdminPageHeader
          description="Состояние функции, лимиты, приватные файлы и безопасная очистка."
          eyebrow="Приватная обработка"
          title="AI-визуализации"
        />
        <AdminEmptyState
          description="Подключение к рабочим данным временно недоступно. Попробуйте обновить страницу позже."
          title="Не удалось загрузить состояние"
        />
      </AdminFrame>
    );
  }
  const [{ data: rawStats }, { data: settings }] = await Promise.all([
    client.rpc('get_ai_visualization_admin_stats'),
    client.from('ai_visualizer_settings').select('*').eq('id', true).single(),
  ]);
  const stats = rawStats ? statsFrom(rawStats) : EMPTY_STATS;
  const effective = settings ? await getEffectiveAiSettings(client, config) : null;
  const canManage = staff.role === 'OWNER' || staff.role === 'ADMIN';
  const status = STATUSES.includes(queryParams.status as (typeof STATUSES)[number])
    ? queryParams.status
    : null;
  const material = safeToken(queryParams.material, 180);
  const dateFrom = safeDate(queryParams.dateFrom);
  const dateTo = safeDate(queryParams.dateTo);
  let jobsQuery = client
    .from('ai_visualization_jobs')
    .select(
      'id,material_slug_snapshot,material_name_snapshot,article_snapshot,product_family,status,attempt_number,error_code,provider_error_code,provider_request_id,input_byte_size,result_byte_size,created_at,deleted_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) jobsQuery = jobsQuery.eq('status', status);
  if (material) jobsQuery = jobsQuery.eq('material_slug_snapshot', material);
  if (dateFrom) jobsQuery = jobsQuery.gte('created_at', `${dateFrom}T00:00:00.000Z`);
  if (dateTo) jobsQuery = jobsQuery.lte('created_at', `${dateTo}T23:59:59.999Z`);
  const [{ data: jobs }, { data: audits }] = canManage
    ? await Promise.all([
        jobsQuery,
        client
          .from('admin_audit_log')
          .select('id,actor_display_name,action,created_at')
          .in('entity', ['ai_visualization_jobs', 'ai_visualizer_settings'])
          .order('created_at', { ascending: false })
          .limit(30),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <AdminFrame staff={staff}>
      <AdminPageHeader
        description="Состояние функции, лимиты, приватные файлы и безопасная очистка — без раскрытия фотографий и ключей."
        eyebrow="Приватная обработка"
        title="AI-визуализации"
      />

      <section className={`admin-ai-health ${effective?.enabled ? 'is-enabled' : ''}`}>
        <div className="admin-ai-health-mark" aria-hidden="true">
          AI
        </div>
        <div>
          <p className="eyebrow">Доступность для покупателей</p>
          <h2>{effective?.enabled ? 'Функция включена' : 'Функция выключена'}</h2>
          <p>
            {effective?.enabled
              ? 'Приватная примерка доступна на опубликованных материалах.'
              : 'Публичные точки входа скрыты или показывают безопасную альтернативу.'}
          </p>
        </div>
        <dl>
          <div>
            <dt>Серверная настройка</dt>
            <dd>{config.environmentEnabled ? 'Включена' : 'Выключена'}</dd>
          </div>
          <div>
            <dt>Доступ к сервису</dt>
            <dd>{config.polzaApiKey ? 'Подключён' : 'Не настроен'}</dd>
          </div>
          <div>
            <dt>Разрешение в базе</dt>
            <dd>{settings?.is_enabled ? 'Включено' : 'Выключено'}</dd>
          </div>
        </dl>
      </section>

      <div className="admin-metric-grid admin-ai-metrics">
        <AdminMetric label="Сегодня" value={stats.jobsToday} />
        <AdminMetric label="Успешно" tone="success" value={stats.successfulToday} />
        <AdminMetric label="Ошибки" tone="error" value={stats.failedToday} />
        <AdminMetric label="В работе" tone="warning" value={stats.active} />
        <AdminMetric label="Ограничено сервисом" value={stats.rateLimitedToday} />
        <AdminMetric label="Повторные попытки" value={stats.retryAttempts} />
        <AdminMetric label="Приватные файлы" value={formatBytes(stats.estimatedStorageBytes)} />
        <AdminMetric
          label="Среднее время"
          value={stats.averageDurationSeconds ? `${stats.averageDurationSeconds} сек.` : '—'}
        />
      </div>
      <p className="admin-metric-note">
        Всего запусков: {stats.totalJobs}. Ожидают плановой очистки: {stats.expired}.
        {stats.nextCleanupAt && (
          <> Ближайшее истечение: {new Date(stats.nextCleanupAt).toLocaleString('ru-RU')}.</>
        )}
      </p>

      {canManage && settings && (
        <details className="admin-disclosure admin-panel admin-ai-settings">
          <summary>
            <span>
              <strong>Доступность и лимиты</strong>
              <small>Защита от лишних запусков и срок хранения</small>
            </span>
            <span aria-hidden="true">+</span>
          </summary>
          <div className="admin-disclosure-content">
            <form action={updateAiVisualizerSettings} className="form admin-ai-settings-form">
              <label className="admin-check admin-ai-master-switch">
                <input defaultChecked={settings.is_enabled} name="enabled" type="checkbox" />
                <span>
                  <strong>Разрешить AI-визуализацию</strong>
                  <small>
                    Работает только вместе с серверной настройкой и подключённым сервисом.
                  </small>
                </span>
              </label>
              <div className="admin-form-grid">
                <label>
                  Попыток для одного гостя в сутки
                  <input
                    defaultValue={settings.max_attempts_per_guest_per_day}
                    max="20"
                    min="1"
                    name="guestLimit"
                    type="number"
                  />
                </label>
                <label>
                  Общий лимит в сутки
                  <input
                    defaultValue={settings.global_daily_job_limit}
                    max="1000"
                    min="1"
                    name="globalLimit"
                    type="number"
                  />
                </label>
                <label>
                  Одновременных обработок
                  <input
                    defaultValue={settings.max_concurrent_jobs}
                    max="20"
                    min="1"
                    name="concurrentLimit"
                    type="number"
                  />
                </label>
                <label>
                  Хранение файлов, часов
                  <input
                    defaultValue={settings.retention_hours}
                    max="168"
                    min="1"
                    name="retentionHours"
                    type="number"
                  />
                </label>
              </div>
              <button>Сохранить настройки</button>
            </form>
            <form action={runAiCleanup} className="admin-cleanup-action">
              <div>
                <strong>Очистка приватных файлов</strong>
                <p>Удалит только данные с истёкшим сроком хранения.</p>
              </div>
              <input name="confirmation" type="hidden" value="expired-only" />
              <button className="danger secondary">Удалить просроченные файлы</button>
            </form>
          </div>
        </details>
      )}

      {canManage && (
        <>
          <section className="admin-section-stack">
            <AdminSectionHeader
              description="До 100 последних обработок. Фотографии открываются только по короткой защищённой ссылке."
              title="История обработок"
            />
            <form className="admin-filter-bar admin-ai-filter-bar" method="get">
              <PremiumSelect
                defaultValue={status ?? ''}
                label="Состояние"
                name="status"
                options={[
                  { label: 'Все состояния', value: '' },
                  ...STATUSES.map((value) => ({ label: presentAiStatus(value), value })),
                ]}
              />
              <label>
                <span>Материал</span>
                <input
                  defaultValue={material ?? ''}
                  name="material"
                  placeholder="Адрес материала"
                />
              </label>
              <label>
                <span>С даты</span>
                <input defaultValue={dateFrom ?? ''} name="dateFrom" type="date" />
              </label>
              <label>
                <span>По дату</span>
                <input defaultValue={dateTo ?? ''} name="dateTo" type="date" />
              </label>
              <button>Показать</button>
              {(status || material || dateFrom || dateTo) && (
                <Link className="button secondary" href="/admin/ai-visualizations">
                  Сбросить
                </Link>
              )}
            </form>
            {jobs?.length ? (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Создано</th>
                      <th>Материал</th>
                      <th>Состояние</th>
                      <th>Обработка</th>
                      <th>Приватные файлы</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const error =
                        presentAiError(job.error_code) ??
                        presentProviderError(job.provider_error_code);
                      return (
                        <tr key={job.id}>
                          <td>{new Date(job.created_at).toLocaleString('ru-RU')}</td>
                          <td>
                            <Link href={`/catalog/${job.material_slug_snapshot}`}>
                              {job.material_name_snapshot}
                            </Link>
                            <small>
                              {job.article_snapshot} · {presentBlindFamily(job.product_family)}
                            </small>
                          </td>
                          <td>
                            <StatusBadge tone={statusTone(job.status)}>
                              {presentAiStatus(job.status)}
                            </StatusBadge>
                            {error && <small className="error admin-block">{error}</small>}
                          </td>
                          <td>
                            <span>Попытка {job.attempt_number}</span>
                            <small>
                              {job.provider_request_id
                                ? 'Передано во внешний сервис'
                                : 'Ожидает передачи'}
                            </small>
                          </td>
                          <td>
                            <span>
                              {formatBytes(
                                (job.input_byte_size ?? 0) + (job.result_byte_size ?? 0),
                              )}
                            </span>
                            {!job.deleted_at && !['EXPIRED', 'DELETED'].includes(job.status) && (
                              <div className="admin-image-actions">
                                <AdminImageButton jobId={job.id} kind="input" />
                                {job.result_byte_size ? (
                                  <AdminImageButton jobId={job.id} kind="result" />
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td>
                            {job.status !== 'PROCESSING' && job.status !== 'DELETED' && (
                              <form action={deleteAiVisualizationJob}>
                                <input name="id" type="hidden" value={job.id} />
                                <button className="danger secondary">Удалить данные</button>
                              </form>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState
                description="Измените фильтры или дождитесь новой обработки."
                title="Обработок пока нет"
              />
            )}
          </section>

          <section className="admin-section-stack">
            <AdminSectionHeader
              description="Только безопасные служебные события — без фотографий, ключей и содержимого запросов."
              title="Журнал действий"
            />
            {audits?.length ? (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>Сотрудник</th>
                      <th>Действие</th>
                      <th>Приватность</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.created_at).toLocaleString('ru-RU')}</td>
                        <td>{entry.actor_display_name ?? 'Система'}</td>
                        <td>{presentAdminAuditAction(entry.action)}</td>
                        <td>
                          <span className="admin-safe-record">Без чувствительных данных</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AdminEmptyState
                description="События появятся после изменения настроек или работы с визуализациями."
                title="Журнал пока пуст"
              />
            )}
          </section>
        </>
      )}
      {!canManage && (
        <div className="notice">
          <strong>Ограниченный режим</strong>
          <span>
            Менеджеру доступна только сводная статистика — без фотографий, служебных данных и
            изменения лимитов.
          </span>
        </div>
      )}
    </AdminFrame>
  );
}
