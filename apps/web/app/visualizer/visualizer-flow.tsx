'use client';

/* eslint-disable @next/next/no-img-element -- material and private signed Storage URLs are runtime values. */
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import {
  ClientImageError,
  prepareWindowImage,
  type PreparedWindowImage,
  uploadWindowImageDirectly,
} from '../../lib/ai-visualization/client-image';
import type {
  AiVisualizationErrorCode,
  AiVisualizationStatus,
} from '../../lib/ai-visualization/types';
import { readCart, writeCart } from '../../lib/phase2a/cart-storage';
import { cartItemSchema } from '../../lib/phase2a/schemas';
import { Breadcrumbs } from '../../components/ui/primitives';
import { BeforeAfter } from './before-after';
import type { VisualizerInitialJob, VisualizerMaterial } from './visualizer-types';

type Stage = 'material' | 'photo' | 'consent' | 'generating' | 'result' | 'error' | 'deleted';

type JobResponse = {
  attemptNumber: number;
  errorCode: AiVisualizationErrorCode | null;
  errorMessage: string | null;
  expiresAt: string;
  publicReference: string;
  resultAvailable: boolean;
  reused: boolean;
  status: AiVisualizationStatus;
};

type ResultUrls = { inputUrl: string; resultUrl: string };

function randomKey(): string {
  return crypto.randomUUID().replaceAll('-', '');
}

async function responsePayload(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorMessage(payload: Record<string, unknown>, fallback: string): string {
  const error = payload['error'];
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return fallback;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', ...init });
  const payload = await responsePayload(response);
  if (!response.ok) {
    throw new ClientImageError(
      errorMessage(payload, 'Не удалось выполнить запрос. Попробуйте позже.'),
    );
  }
  return payload as T;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function pollUntilFinal(
  publicReference: string,
  signal: AbortSignal,
  onProgress: (attempt: number) => void,
): Promise<JobResponse> {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (attempt > 0) await wait(Math.min(5_000, 1_500 + attempt * 350), signal);
    const job = await jsonRequest<JobResponse>(`/api/ai-visualizations/${publicReference}`, {
      signal,
    });
    if (job.status !== 'PROCESSING') return job;
    onProgress(attempt);
  }
  throw new ClientImageError(
    'Создание занимает больше обычного. Вы можете проверить статус ещё раз — новая генерация не запустится.',
  );
}

function initialStage(job: VisualizerInitialJob | undefined): Stage {
  if (!job) return 'material';
  if (job.status === 'SUCCEEDED') return 'result';
  if (job.status === 'PROCESSING') return 'generating';
  if (job.status === 'READY') return 'consent';
  if (job.status === 'FAILED' || job.status === 'REJECTED') return 'error';
  return 'photo';
}

function dimensions(width: string, height: string) {
  const widthMm = Number.parseInt(width, 10);
  const heightMm = Number.parseInt(height, 10);
  return Number.isSafeInteger(widthMm) &&
    Number.isSafeInteger(heightMm) &&
    widthMm >= 100 &&
    widthMm <= 10_000 &&
    heightMm >= 100 &&
    heightMm <= 10_000
    ? { heightMm, widthMm }
    : null;
}

export function VisualizerFlow({
  aiEnabled,
  initialDimensions,
  initialJob,
  material,
  retentionHours,
}: {
  aiEnabled: boolean;
  initialDimensions: { heightMm: number | null; widthMm: number | null };
  initialJob?: VisualizerInitialJob;
  material: VisualizerMaterial;
  retentionHours: number;
}) {
  const cameraInputId = useId();
  const fileInputId = useId();
  const consentId = useId();
  const previewObjectUrl = useRef<string | null>(null);
  const activePoll = useRef<AbortController | null>(null);
  const generationLock = useRef(false);
  const [stage, setStage] = useState<Stage>(() => initialStage(initialJob));
  const [preparedImage, setPreparedImage] = useState<PreparedWindowImage | null>(null);
  const [inputUrl, setInputUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [publicReference, setPublicReference] = useState(initialJob?.publicReference ?? null);
  const [jobStatus, setJobStatus] = useState<AiVisualizationStatus | null>(
    initialJob?.status ?? null,
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(initialJob?.status === 'PROCESSING');
  const [loadingText, setLoadingText] = useState('Подготавливаем фотографию');
  const [message, setMessage] = useState(initialJob?.errorMessage ?? '');
  const [width, setWidth] = useState(
    initialDimensions.widthMm === null ? '' : String(initialDimensions.widthMm),
  );
  const [height, setHeight] = useState(
    initialDimensions.heightMm === null ? '' : String(initialDimensions.heightMm),
  );

  useEffect(() => {
    return () => {
      activePoll.current?.abort();
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!initialJob) return;
    const restoredJob: VisualizerInitialJob = initialJob;
    const controller = new AbortController();
    activePoll.current = controller;
    async function restore() {
      try {
        if (restoredJob.status === 'SUCCEEDED') {
          const urls = await jsonRequest<ResultUrls>(
            `/api/ai-visualizations/${restoredJob.publicReference}/result`,
            { signal: controller.signal },
          );
          setInputUrl(urls.inputUrl);
          setResultUrl(urls.resultUrl);
          setStage('result');
          setBusy(false);
          return;
        }
        if (['READY', 'PROCESSING', 'FAILED', 'REJECTED'].includes(restoredJob.status)) {
          const photo = await jsonRequest<{ inputUrl: string }>(
            `/api/ai-visualizations/${restoredJob.publicReference}/photo`,
            { signal: controller.signal },
          );
          setInputUrl(photo.inputUrl);
        }
        if (restoredJob.status === 'PROCESSING') {
          const job = await pollUntilFinal(
            restoredJob.publicReference,
            controller.signal,
            (attempt) =>
              setLoadingText(attempt < 2 ? 'Создаём визуализацию' : 'Обрабатываем результат'),
          );
          setJobStatus(job.status);
          if (job.status === 'SUCCEEDED') {
            const urls = await jsonRequest<ResultUrls>(
              `/api/ai-visualizations/${job.publicReference}/result`,
              { signal: controller.signal },
            );
            setInputUrl(urls.inputUrl);
            setResultUrl(urls.resultUrl);
            setStage('result');
          } else {
            setMessage(job.errorMessage ?? 'Не удалось создать визуализацию.');
            setStage('error');
          }
          setBusy(false);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(
          error instanceof Error ? error.message : 'Не удалось восстановить визуализацию.',
        );
        setStage('error');
        setBusy(false);
      }
    }
    void restore();
    return () => controller.abort();
  }, [initialJob]);

  function setLocalPreview(image: PreparedWindowImage) {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    const url = URL.createObjectURL(image.blob);
    previewObjectUrl.current = url;
    setPreparedImage(image);
    setInputUrl(url);
    setConsent(false);
    setMessage('');
  }

  async function selectFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage('Подготавливаем фотографию…');
    try {
      setLocalPreview(await prepareWindowImage(file));
    } catch (error) {
      setPreparedImage(null);
      setInputUrl(null);
      setMessage(error instanceof Error ? error.message : 'Не удалось обработать фотографию.');
    } finally {
      setBusy(false);
    }
  }

  async function loadResult(reference: string, controller: AbortController) {
    const urls = await jsonRequest<ResultUrls>(`/api/ai-visualizations/${reference}/result`, {
      signal: controller.signal,
    });
    setInputUrl(urls.inputUrl);
    setResultUrl(urls.resultUrl);
    setStage('result');
    setBusy(false);
  }

  async function followJob(reference: string) {
    activePoll.current?.abort();
    const controller = new AbortController();
    activePoll.current = controller;
    try {
      const job = await pollUntilFinal(reference, controller.signal, (attempt) => {
        setLoadingText(attempt < 2 ? 'Создаём визуализацию' : 'Обрабатываем результат');
      });
      setJobStatus(job.status);
      if (job.status === 'SUCCEEDED') {
        await loadResult(job.publicReference, controller);
      } else {
        setMessage(job.errorMessage ?? 'Не удалось создать визуализацию.');
        setStage('error');
        setBusy(false);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error ? error.message : 'Не удалось получить результат.');
      setStage('error');
      setBusy(false);
    }
  }

  async function generate() {
    if (!consent) {
      setMessage('Подтвердите согласие на обработку фотографии.');
      return;
    }
    if (!preparedImage && jobStatus !== 'READY') {
      setMessage('Выберите фотографию окна.');
      setStage('photo');
      return;
    }
    if (generationLock.current) return;
    generationLock.current = true;
    setBusy(true);
    setStage('generating');
    setLoadingText('Подготавливаем фотографию');
    setMessage('');
    try {
      let reference = publicReference;
      if (!reference || jobStatus !== 'READY') {
        const selectedDimensions = dimensions(width, height);
        const created = await jsonRequest<JobResponse & { publicReference: string }>(
          '/api/ai-visualizations/jobs',
          {
            body: JSON.stringify({
              idempotencyKey: randomKey(),
              materialSlug: material.slug,
              ...(selectedDimensions ? { productMetadata: selectedDimensions } : {}),
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          },
        );
        reference = created.publicReference;
        setPublicReference(reference);
        setJobStatus(created.status);
        window.history.replaceState(null, '', `/visualizer/${reference}`);
        if (!preparedImage) throw new ClientImageError('Выберите фотографию окна.');
        const uploadKey = randomKey();
        await uploadWindowImageDirectly(reference, preparedImage, uploadKey);
        setJobStatus('READY');
      }
      setLoadingText('Создаём визуализацию');
      const started = await jsonRequest<JobResponse>(
        `/api/ai-visualizations/${reference}/generate`,
        {
          body: JSON.stringify({ consent: true, idempotencyKey: randomKey(), website: '' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      setPublicReference(started.publicReference);
      setJobStatus(started.status);
      if (started.reused)
        setMessage('Использован уже готовый вариант без нового платного запуска.');
      if (started.status === 'SUCCEEDED') {
        const controller = new AbortController();
        activePoll.current = controller;
        await loadResult(started.publicReference, controller);
      } else {
        await followJob(started.publicReference);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось запустить визуализацию.');
      setStage('error');
      setBusy(false);
    } finally {
      generationLock.current = false;
    }
  }

  async function createAnotherVariant() {
    if (!publicReference || busy || generationLock.current) return;
    generationLock.current = true;
    setBusy(true);
    setStage('generating');
    setLoadingText('Создаём визуализацию');
    setMessage('');
    try {
      const started = await jsonRequest<JobResponse>(
        `/api/ai-visualizations/${publicReference}/retry`,
        {
          body: JSON.stringify({ consent: true, idempotencyKey: randomKey(), website: '' }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        },
      );
      setPublicReference(started.publicReference);
      setJobStatus(started.status);
      window.history.replaceState(null, '', `/visualizer/${started.publicReference}`);
      if (started.reused) {
        setMessage('Готовый вариант ещё актуален — новый платный запуск не потребовался.');
      }
      if (started.status === 'SUCCEEDED') {
        const controller = new AbortController();
        activePoll.current = controller;
        await loadResult(started.publicReference, controller);
      } else {
        await followJob(started.publicReference);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось создать ещё один вариант.');
      setStage('error');
      setBusy(false);
    } finally {
      generationLock.current = false;
    }
  }

  async function deleteVisualization() {
    if (busy) return;
    setBusy(true);
    try {
      if (publicReference) {
        const response = await fetch(`/api/ai-visualizations/${publicReference}`, {
          credentials: 'same-origin',
          method: 'DELETE',
        });
        if (!response.ok) {
          const payload = await responsePayload(response);
          throw new ClientImageError(errorMessage(payload, 'Не удалось удалить фотографию.'));
        }
      }
      activePoll.current?.abort();
      if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = null;
      setPreparedImage(null);
      setInputUrl(null);
      setResultUrl(null);
      setPublicReference(null);
      setJobStatus('DELETED');
      setStage('deleted');
      setMessage('Фотография и результат удалены.');
      window.history.replaceState(
        null,
        '',
        `/visualizer?material=${encodeURIComponent(material.slug)}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось удалить фотографию.');
    } finally {
      setBusy(false);
    }
  }

  function replaceLocalPhoto() {
    if (previewObjectUrl.current) URL.revokeObjectURL(previewObjectUrl.current);
    previewObjectUrl.current = null;
    setPreparedImage(null);
    setInputUrl(null);
    setConsent(false);
    setMessage('');
  }

  function addToCart() {
    const selectedDimensions = dimensions(width, height);
    const parsed = cartItemSchema.safeParse({
      heightMm: selectedDimensions?.heightMm,
      ...(publicReference ? { aiVisualizationPublicReference: publicReference } : {}),
      materialSlug: material.slug,
      quantity: 1,
      widthMm: selectedDimensions?.widthMm,
    });
    if (!parsed.success) {
      setMessage('Укажите ширину и высоту изделия для добавления в корзину.');
      return;
    }
    const stored = writeCart([...readCart(), parsed.data]);
    setMessage(
      stored ? 'Материал добавлен в корзину.' : 'В корзине может быть не больше 50 позиций.',
    );
  }

  const selectedDimensions = dimensions(width, height);
  const calculatorHref = selectedDimensions
    ? `/calculator?material=${encodeURIComponent(material.slug)}&width=${selectedDimensions.widthMm}&height=${selectedDimensions.heightMm}`
    : `/calculator?material=${encodeURIComponent(material.slug)}`;
  const currentStep =
    stage === 'material'
      ? 0
      : stage === 'photo'
        ? 1
        : stage === 'consent'
          ? 2
          : stage === 'generating'
            ? 3
            : 4;

  return (
    <section className="shell visualizer-shell">
      <Breadcrumbs
        items={[
          { href: '/', label: 'Главная' },
          { href: `/catalog/${material.slug}`, label: material.name },
          { label: 'AI-визуализация' },
        ]}
      />
      <header className="visualizer-hero">
        <div>
          <p className="eyebrow">Интерьерная примерка</p>
          <h1>Посмотрите материал на своём окне</h1>
          <p className="visualizer-lead">
            Загрузите фотографию и получите ознакомительный вариант, не выходя из выбранного
            материала.
          </p>
        </div>
        <div className="visualizer-trust" aria-label="Как мы работаем с фотографией">
          <span>
            <strong>Приватно</strong>
            Закрытое хранилище
          </span>
          <span>
            <strong>Без метаданных</strong>
            EXIF удаляется до загрузки
          </span>
          <span>
            <strong>Временно</strong>
            Хранение до {retentionHours} ч
          </span>
        </div>
      </header>

      <ol className="visualizer-steps" aria-label="Этапы визуализации">
        {['Материал', 'Фото', 'Согласие', 'Генерация', 'Результат'].map((label, index) => {
          return (
            <li
              aria-current={index === currentStep ? 'step' : undefined}
              className={
                index === currentStep ? 'current' : index < currentStep ? 'complete' : undefined
              }
              key={label}
            >
              <span className="visualizer-step-number">{index + 1}</span>
              <span className="visualizer-step-label">{label}</span>
            </li>
          );
        })}
      </ol>

      <div className="visualizer-frame">
        {stage === 'material' && (
          <div className="visualizer-panel">
            <div className="visualizer-stage-heading">
              <span aria-hidden="true">01</span>
              <div>
                <p className="eyebrow">Выбранный материал</p>
                <h2>Проверьте выбор перед примеркой</h2>
                <p>Цвет и фактура берутся из опубликованной карточки каталога.</p>
              </div>
            </div>
            <div className="selected-material">
              <div className="selected-material-media">
                <img src={material.imageUrl} alt={material.name} />
                <span>Материал из каталога</span>
              </div>
              <div className="selected-material-copy">
                <span className="badge">{material.availability}</span>
                <p className="eyebrow">{material.categoryName}</p>
                <h2>{material.name}</h2>
                <dl className="material-facts">
                  <div>
                    <dt>Артикул</dt>
                    <dd>{material.article}</dd>
                  </div>
                  <div>
                    <dt>Цвет</dt>
                    <dd>{material.color ?? 'Смотрите изображение материала'}</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="visualizer-dimensions">
              <p>
                <strong>Размеры изделия</strong>
                <span>Необязательно для примерки, но пригодится для корзины и расчёта.</span>
              </p>
              <label>
                Ширина, мм
                <input
                  inputMode="numeric"
                  max="10000"
                  min="100"
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </label>
              <label>
                Высота, мм
                <input
                  inputMode="numeric"
                  max="10000"
                  min="100"
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </label>
            </div>
            {!aiEnabled && (
              <div className="visualizer-disabled" role="status">
                <span aria-hidden="true">AI</span>
                <div>
                  <strong>Примерка временно недоступна</strong>
                  <p>Материал по-прежнему можно рассчитать и заказать без визуализации.</p>
                </div>
                <Link className="button secondary" href={calculatorHref}>
                  Рассчитать без AI
                </Link>
              </div>
            )}
            <div className="visualizer-cta">
              <button disabled={!aiEnabled} onClick={() => setStage('photo')}>
                Загрузить фото окна
              </button>
              <Link className="button secondary" href="/catalog">
                Выбрать другой материал
              </Link>
            </div>
          </div>
        )}

        {stage === 'photo' && (
          <div className="visualizer-panel">
            <div className="visualizer-stage-heading">
              <span aria-hidden="true">02</span>
              <div>
                <p className="eyebrow">Исходное изображение</p>
                <h2>Добавьте фотографию окна</h2>
                <p>Чёткий прямой кадр помогает точнее сохранить перспективу интерьера.</p>
              </div>
            </div>
            <ul className="photo-tips" aria-label="Советы для хорошего результата">
              <li>Окно должно быть полностью видно, включая раму.</li>
              <li>Снимайте прямо перед окном и включите освещение.</li>
              <li>Не закрывайте окно людьми и уберите лишние предметы, если возможно.</li>
              <li>Избегайте размытия и не используйте скриншот вместо фотографии.</li>
            </ul>
            {inputUrl ? (
              <div className="photo-preview">
                <img src={inputUrl} alt="Выбранная фотография окна" />
                <button className="secondary" disabled={busy} onClick={replaceLocalPhoto}>
                  Заменить фото
                </button>
              </div>
            ) : (
              <div className="photo-picker">
                <span className="photo-picker-mark" aria-hidden="true">
                  +
                </span>
                <div className="photo-picker-copy">
                  <strong>Перетащите внимание на окно</strong>
                  <span>Выберите готовый кадр или сделайте новый</span>
                </div>
                <input
                  accept="image/*"
                  capture="environment"
                  id={cameraInputId}
                  type="file"
                  onChange={(event) => {
                    void selectFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
                <label className="button" htmlFor={cameraInputId}>
                  Сфотографировать окно
                </label>
                <input
                  accept="image/*"
                  id={fileInputId}
                  type="file"
                  onChange={(event) => {
                    void selectFile(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
                <label className="button secondary" htmlFor={fileInputId}>
                  Выбрать фотографию
                </label>
                <p className="muted">
                  JPEG, PNG или WebP · до 4 МБ после обработки · максимум 2048 px
                </p>
              </div>
            )}
            <p className="visualizer-inline-privacy">
              <span aria-hidden="true">✓</span>
              Метаданные удаляются на устройстве. Фото отправится только после вашего согласия.
            </p>
            {message && (
              <p className={preparedImage ? 'notice' : 'error'} aria-live="polite">
                {message}
              </p>
            )}
            <div className="visualizer-cta">
              <button disabled={!preparedImage || busy} onClick={() => setStage('consent')}>
                Продолжить
              </button>
              <button className="secondary" disabled={busy} onClick={() => setStage('material')}>
                Назад
              </button>
            </div>
          </div>
        )}

        {stage === 'consent' && (
          <div className="visualizer-panel consent-panel">
            <div className="visualizer-stage-heading">
              <span aria-hidden="true">03</span>
              <div>
                <p className="eyebrow">Контроль данных</p>
                <h2>Разрешите обработку фотографии</h2>
                <p>Перед отправкой покажем, куда и зачем передаётся изображение.</p>
              </div>
            </div>
            <div className="consent-facts">
              <article>
                <span aria-hidden="true">01</span>
                <strong>Назначение</strong>
                <p>Только создание ознакомительной визуализации выбранного материала.</p>
              </article>
              <article>
                <span aria-hidden="true">02</span>
                <strong>Обработка</strong>
                <p>Gemini через серверный адаптер Polza AI; ключи не попадают в браузер.</p>
              </article>
              <article>
                <span aria-hidden="true">03</span>
                <strong>Хранение</strong>
                <p>Приватные файлы автоматически удаляются в пределах {retentionHours} ч.</p>
              </article>
            </div>
            <p className="visualizer-disclaimer">
              Результат создаётся автоматически и может изменить отдельные детали, оттенок или
              пропорции фотографии.
            </p>
            <label className="consent-check" htmlFor={consentId}>
              <input
                checked={consent}
                id={consentId}
                type="checkbox"
                onChange={(event) => {
                  setConsent(event.target.checked);
                  setMessage('');
                }}
              />
              <span>
                <strong>Я согласен на обработку фотографии</strong>
                <small>для создания этой визуализации на условиях выше</small>
              </span>
            </label>
            {message && (
              <p className="error" aria-live="polite">
                {message}
              </p>
            )}
            <div className="visualizer-cta">
              <button disabled={!consent || busy} onClick={() => void generate()}>
                Создать визуализацию
              </button>
              <button className="secondary" disabled={busy} onClick={() => setStage('photo')}>
                Назад к фотографии
              </button>
            </div>
          </div>
        )}

        {stage === 'generating' && (
          <div className="visualizer-loading" aria-live="polite" aria-busy="true">
            <div className="visualizer-orbit" aria-hidden="true">
              <span className="visualizer-spinner" />
              <img src={material.imageUrl} alt="" />
            </div>
            <p className="eyebrow">Этап 4 из 5</p>
            <h2>{loadingText}</h2>
            <p>
              Сохраняем перспективу окна и переносим выбранный материал. Обычно это занимает
              несколько минут.
            </p>
            <div className="visualizer-pulse" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className="visualizer-loading-note">Страницу можно оставить открытой.</p>
          </div>
        )}

        {stage === 'result' && inputUrl && resultUrl && (
          <div className="visualizer-panel result-panel">
            <div className="result-heading">
              <span className="result-ready-mark" aria-hidden="true">
                ✓
              </span>
              <div>
                <p className="eyebrow">Визуализация готова</p>
                <h2>Материал «{material.name}» в вашем интерьере</h2>
                <p>Артикул {material.article} · двигайте разделитель, чтобы сравнить кадры</p>
              </div>
            </div>
            <BeforeAfter afterUrl={resultUrl} beforeUrl={inputUrl} />
            <div className="visualizer-disclaimer" role="note">
              <strong>Ознакомительный результат</strong>
              <p>
                Оттенок, пропорции и внешний вид могут отличаться от реального изделия. Для заказа
                ориентируйтесь на карточку материала и консультацию менеджера.
              </p>
            </div>
            <div className="visualizer-dimensions result-dimensions">
              <label>
                Ширина, мм
                <input
                  inputMode="numeric"
                  max="10000"
                  min="100"
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(event.target.value)}
                />
              </label>
              <label>
                Высота, мм
                <input
                  inputMode="numeric"
                  max="10000"
                  min="100"
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(event.target.value)}
                />
              </label>
            </div>
            {message && (
              <p className="notice" aria-live="polite">
                {message}
              </p>
            )}
            <div className="visualizer-actions result-actions">
              <button disabled={busy} onClick={addToCart}>
                Добавить в корзину
              </button>
              <Link className="button secondary" href={calculatorHref}>
                Рассчитать стоимость
              </Link>
              <button
                className="quiet"
                disabled={busy || !aiEnabled}
                onClick={() => void createAnotherVariant()}
              >
                Создать ещё вариант
              </button>
              <Link className="button quiet" href="/catalog">
                Другой материал
              </Link>
              <button
                className="danger quiet"
                disabled={busy}
                onClick={() => void deleteVisualization()}
              >
                Удалить фотографию
              </button>
            </div>
          </div>
        )}

        {stage === 'error' && (
          <div className="visualizer-panel error-panel">
            <div className="result-heading">
              <span className="result-ready-mark result-error-mark" aria-hidden="true">
                !
              </span>
              <div>
                <p className="eyebrow">Нужна ещё одна попытка</p>
                <h2>Визуализацию не удалось завершить</h2>
                <p>Исходная фотография остаётся под вашим контролем.</p>
              </div>
            </div>
            <p className="notice" aria-live="assertive">
              {message || 'Возникла временная ошибка.'}
            </p>
            <div className="visualizer-actions">
              {publicReference && jobStatus === 'PROCESSING' && (
                <button disabled={busy} onClick={() => void followJob(publicReference)}>
                  Проверить статус
                </button>
              )}
              {publicReference && ['FAILED', 'REJECTED'].includes(jobStatus ?? '') && (
                <button disabled={busy || !aiEnabled} onClick={() => void createAnotherVariant()}>
                  Повторить генерацию
                </button>
              )}
              <Link
                className="button secondary"
                href={`/visualizer?material=${encodeURIComponent(material.slug)}`}
              >
                Выбрать другое фото
              </Link>
              <Link className="button secondary" href={calculatorHref}>
                Рассчитать без AI
              </Link>
              {publicReference && (
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() => void deleteVisualization()}
                >
                  Удалить фотографию
                </button>
              )}
            </div>
          </div>
        )}

        {stage === 'deleted' && (
          <div className="visualizer-panel deleted-panel">
            <div className="result-heading">
              <span className="result-ready-mark" aria-hidden="true">
                ✓
              </span>
              <div>
                <p className="eyebrow">Данные удалены</p>
                <h2>Фотография и результат больше недоступны</h2>
                <p>{message}</p>
              </div>
            </div>
            <div className="visualizer-actions">
              <button
                disabled={!aiEnabled}
                onClick={() => {
                  setJobStatus(null);
                  setStage('photo');
                }}
              >
                Загрузить новое фото
              </button>
              <Link className="button secondary" href="/catalog">
                Выбрать другой материал
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
