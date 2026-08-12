import Link from 'next/link';

import {
  AI_VISUALIZATION_PROMPT_VERSION,
  getAiVisualizerServerConfig,
} from '../../../lib/ai-visualization/config';
import { getEffectiveAiSettings } from '../../../lib/ai-visualization/job-data';
import { requireStaff } from '../../../lib/phase2a/staff';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';
import { AdminFrame } from '../admin-frame';
import { AdminImageButton } from './admin-image-button';
import {
  deleteAiVisualizationJob,
  runAiCleanup,
  updateAiVisualizerSettings,
} from './actions';

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
  const source = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return {
    active: integer(source['active']),
    averageDurationSeconds: integer(source['averageDurationSeconds']),
    estimatedStorageBytes: integer(source['estimatedStorageBytes']),
    expired: integer(source['expired']),
    failedToday: integer(source['failedToday']),
    jobsToday: integer(source['jobsToday']),
    modelUnavailableToday: integer(source['modelUnavailableToday']),
    nextCleanupAt:
      typeof source['nextCleanupAt'] === 'string' ? source['nextCleanupAt'] : null,
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

export default async function AiVisualizationsAdmin({
  searchParams,
}: {
  searchParams: Promise<{
    dateFrom?: string;
    dateTo?: string;
    errorCode?: string;
    material?: string;
    model?: string;
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
        <h1>AI-визуализации</h1>
        <p className="notice">Supabase не подключён.</p>
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
  const model = safeToken(queryParams.model);
  const material = safeToken(queryParams.material, 180);
  const errorCode = safeToken(queryParams.errorCode, 80);
  const dateFrom = safeDate(queryParams.dateFrom);
  const dateTo = safeDate(queryParams.dateTo);
  let jobsQuery = client
    .from('ai_visualization_jobs')
    .select(
      'id,public_reference,material_slug_snapshot,material_name_snapshot,article_snapshot,category_snapshot,product_family,status,model_name,prompt_version,attempt_number,error_code,provider_error_code,provider_request_id,input_byte_size,result_byte_size,created_at,started_at,completed_at,expires_at,deleted_at',
    )
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) jobsQuery = jobsQuery.eq('status', status);
  if (model) jobsQuery = jobsQuery.eq('model_name', model);
  if (material) jobsQuery = jobsQuery.eq('material_slug_snapshot', material);
  if (errorCode) jobsQuery = jobsQuery.eq('error_code', errorCode);
  if (dateFrom) jobsQuery = jobsQuery.gte('created_at', `${dateFrom}T00:00:00.000Z`);
  if (dateTo) jobsQuery = jobsQuery.lte('created_at', `${dateTo}T23:59:59.999Z`);
  const [{ data: jobs }, { data: audits }] = canManage
    ? await Promise.all([
        jobsQuery,
        client
          .from('admin_audit_log')
          .select('id,actor_display_name,action,entity_id,safe_diff,created_at')
          .in('entity', ['ai_visualization_jobs', 'ai_visualizer_settings'])
          .order('created_at', { ascending: false })
          .limit(30),
      ])
    : [{ data: [] }, { data: [] }];

  const cards = [
    ['Задач сегодня', stats.jobsToday],
    ['Успешно', stats.successfulToday],
    ['Ошибки', stats.failedToday],
    ['Отклонено', stats.rejectedToday],
    ['Rate limited', stats.rateLimitedToday],
    ['Активно', stats.active],
    ['Provider errors', stats.providerErrorsToday],
    ['Model unavailable', stats.modelUnavailableToday],
  ];

  return (
    <AdminFrame staff={staff}>
      <h1>AI-визуализации</h1>
      <p className="muted">
        Provider: <strong>Polza AI</strong> · модель: <code>{config.modelName}</code> · prompt:{' '}
        <code>{AI_VISUALIZATION_PROMPT_VERSION}</code>
      </p>
      <p className={effective?.enabled ? 'notice ai-admin-enabled' : 'notice'}>
        Функция {effective?.enabled ? 'включена' : 'выключена'}. Environment gate:{' '}
        {config.environmentEnabled ? 'on' : 'off'}, key: {config.polzaApiKey ? 'configured' : 'missing'},
        database switch: {settings?.is_enabled ? 'on' : 'off'}.
      </p>
      <div className="grid ai-admin-stats">
        {cards.map(([label, value]) => (
          <article className="card" key={label}>
            <h2>{value}</h2>
            <p>{label}</p>
          </article>
        ))}
        <article className="card">
          <h2>{formatBytes(stats.estimatedStorageBytes)}</h2>
          <p>Оценка Storage</p>
        </article>
        <article className="card">
          <h2>{stats.averageDurationSeconds} сек.</h2>
          <p>Среднее выполнение</p>
        </article>
        <article className="card">
          <h2>{stats.retryAttempts}</h2>
          <p>Повторные попытки</p>
        </article>
        <article className="card">
          <h2>{stats.expired}</h2>
          <p>Ожидают очистки</p>
        </article>
      </div>
      <p className="muted">
        Всего задач: {stats.totalJobs}. Ближайшее истечение:{' '}
        {stats.nextCleanupAt ? new Date(stats.nextCleanupAt).toLocaleString('ru-RU') : 'нет'}.
        Плановый cron: ежедневно в 02:17 UTC.
      </p>

      {canManage && settings && (
        <details className="card">
          <summary>
            <strong>Лимиты и kill switch</strong>
          </summary>
          <form action={updateAiVisualizerSettings} className="form">
            <label>
              <span>
                <input defaultChecked={settings.is_enabled} name="enabled" type="checkbox" />{' '}
                Разрешить AI при включённом environment gate и доступном key
              </span>
            </label>
            <label>
              Лимит гостя в сутки
              <input defaultValue={settings.max_attempts_per_guest_per_day} max="20" min="1" name="guestLimit" type="number" />
            </label>
            <label>
              Глобальный лимит в сутки
              <input defaultValue={settings.global_daily_job_limit} max="1000" min="1" name="globalLimit" type="number" />
            </label>
            <label>
              Одновременные задачи
              <input defaultValue={settings.max_concurrent_jobs} max="20" min="1" name="concurrentLimit" type="number" />
            </label>
            <label>
              Retention, часов
              <input defaultValue={settings.retention_hours} max="168" min="1" name="retentionHours" type="number" />
            </label>
            <button>Сохранить безопасные настройки</button>
          </form>
          <form action={runAiCleanup} className="actions">
            <input name="confirmation" type="hidden" value="expired-only" />
            <button className="danger">Удалить просроченные AI-файлы</button>
          </form>
        </details>
      )}

      {canManage && (
        <>
          <h2>Задачи</h2>
          <form className="actions ai-admin-filters" method="get">
            <select aria-label="Статус" defaultValue={status ?? ''} name="status">
              <option value="">Все статусы</option>
              {STATUSES.map((value) => <option key={value}>{value}</option>)}
            </select>
            <input aria-label="Модель" defaultValue={model ?? ''} name="model" placeholder="Модель" />
            <input aria-label="Материал" defaultValue={material ?? ''} name="material" placeholder="Slug материала" />
            <input aria-label="Код ошибки" defaultValue={errorCode ?? ''} name="errorCode" placeholder="Код ошибки" />
            <input aria-label="Дата от" defaultValue={dateFrom ?? ''} name="dateFrom" type="date" />
            <input aria-label="Дата до" defaultValue={dateTo ?? ''} name="dateTo" type="date" />
            <button>Применить</button>
          </form>
          <div className="admin-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Создано</th>
                  <th>Материал</th>
                  <th>Статус</th>
                  <th>Попытка / provider</th>
                  <th>Файлы</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {jobs?.map((job) => (
                  <tr key={job.id}>
                    <td>
                      {new Date(job.created_at).toLocaleString('ru-RU')}
                      <br />
                      <small>{job.public_reference.slice(0, 10)}…</small>
                    </td>
                    <td>
                      <Link href={`/catalog/${job.material_slug_snapshot}`}>
                        {job.material_name_snapshot}
                      </Link>
                      <br />
                      <small>{job.article_snapshot} · {job.product_family}</small>
                    </td>
                    <td>
                      <span className="badge">{job.status}</span>
                      {(job.error_code || job.provider_error_code) && (
                        <small className="error admin-block">{job.error_code ?? job.provider_error_code}</small>
                      )}
                    </td>
                    <td>
                      {job.attempt_number}
                      <br />
                      <small>{job.provider_request_id ? `${job.provider_request_id.slice(0, 18)}…` : 'не создан'}</small>
                    </td>
                    <td>
                      {formatBytes((job.input_byte_size ?? 0) + (job.result_byte_size ?? 0))}
                      {!job.deleted_at && !['EXPIRED', 'DELETED'].includes(job.status) && (
                        <div className="actions">
                          <AdminImageButton jobId={job.id} kind="input" />
                          {job.result_byte_size && <AdminImageButton jobId={job.id} kind="result" />}
                        </div>
                      )}
                    </td>
                    <td>
                      {job.status !== 'PROCESSING' && job.status !== 'DELETED' && (
                        <form action={deleteAiVisualizationJob}>
                          <input name="id" type="hidden" value={job.id} />
                          <button className="danger">Удалить job</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Аудит</h2>
          <div className="admin-table-scroll">
            <table>
              <thead><tr><th>Время</th><th>Сотрудник</th><th>Действие</th><th>Безопасные данные</th></tr></thead>
              <tbody>
                {audits?.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleString('ru-RU')}</td>
                    <td>{entry.actor_display_name ?? 'Система'}</td>
                    <td>{entry.action}</td>
                    <td><code>{JSON.stringify(entry.safe_diff)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {!canManage && (
        <p className="notice">
          Для роли MANAGER доступна только ограниченная агрегированная статистика без фотографий,
          job metadata и изменения лимитов.
        </p>
      )}
    </AdminFrame>
  );
}

