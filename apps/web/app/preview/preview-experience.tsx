'use client';

import type {
  GuestCartResponse,
  PreviewStateUpdate,
  StandardPreviewStateResponse,
} from '@project-name/contracts';
import type { PreviewControlPatch, PreviewSceneId } from '@project-name/preview';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { StandardPreviewRenderer } from './standard-preview-renderer';

interface SceneChoice {
  readonly description: string;
  readonly id: PreviewSceneId;
  readonly label: string;
}

interface PendingUpdate {
  controls?: PreviewControlPatch;
  sceneId?: PreviewSceneId;
}

function requestId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const value: unknown = await response.json();
  if (!response.ok) throw new Error('PREVIEW_REQUEST_FAILED');
  return value as T;
}

function mergePending(previous: PendingUpdate, next: PendingUpdate): PendingUpdate {
  return {
    ...(previous.controls === undefined && next.controls === undefined
      ? {}
      : { controls: { ...previous.controls, ...next.controls } }),
    ...(next.sceneId === undefined
      ? previous.sceneId === undefined
        ? {}
        : { sceneId: previous.sceneId }
      : { sceneId: next.sceneId }),
  };
}

function resetControls(state: StandardPreviewStateResponse): PendingUpdate {
  const common: PreviewControlPatch = { openingPosition: 100, zoom: 100 };
  const controls =
    state.family === 'ZEBRA'
      ? { ...common, zebraAlignment: 50 }
      : state.family === 'HORIZONTAL_ALUMINUM'
        ? { ...common, slatAngle: 0 }
        : state.family === 'VERTICAL'
          ? { slatAngle: 0, verticalSpread: 100, zoom: 100 }
          : common;
  return { controls, sceneId: 'WINDOW_CLOSEUP' };
}

function assetQualityLabel(quality: StandardPreviewStateResponse['asset']['quality']): string {
  switch (quality) {
    case 'EXACT_SWATCH':
      return 'Точная фактура материала';
    case 'PRODUCT_IMAGE_CROP':
      return 'Точный локальный слой изделия по артикулу';
    case 'NORMALIZED_COLOR_ONLY':
      return 'Только подтверждённый цвет';
    case 'PREVIEW_UNAVAILABLE':
      return 'Визуальный источник недоступен';
  }
}

function RangeControl({
  label,
  max,
  min,
  onChange,
  suffix = '%',
  value,
}: {
  readonly label: string;
  readonly max: number;
  readonly min: number;
  readonly onChange: (value: number) => void;
  readonly suffix?: string;
  readonly value: number;
}): React.JSX.Element {
  return (
    <label className="preview-range-control">
      <span>
        {label}{' '}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
        type="range"
        value={value}
      />
    </label>
  );
}

export function PreviewExperience({
  quoteToken,
  stateId,
}: {
  readonly quoteToken: string | null;
  readonly stateId: string | null;
}): React.JSX.Element {
  const [state, setState] = useState<StandardPreviewStateResponse | null>(null);
  const [scenes, setScenes] = useState<readonly SceneChoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [assetFailed, setAssetFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cartPending, setCartPending] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);
  const pendingRef = useRef<PendingUpdate>({});
  const inFlightRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef<StandardPreviewStateResponse | null>(null);
  const senderRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (stateId === null) return;
    let active = true;
    void Promise.all([
      jsonRequest<StandardPreviewStateResponse>(`/api/v1/previews/${stateId}`),
      jsonRequest<{ readonly scenes: readonly SceneChoice[] }>('/api/v1/previews/scenes'),
    ])
      .then(([loadedState, loadedScenes]) => {
        if (!active) return;
        setState(loadedState);
        setScenes(loadedScenes.scenes);
      })
      .catch(() => {
        if (active)
          setError('Не удалось открыть примерку. Вернитесь в конфигуратор и создайте её снова.');
      });
    return () => {
      active = false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [stateId]);

  const sendPending = async () => {
    const current = stateRef.current;
    if (stateId === null || current === null || inFlightRef.current) return;
    const payload = pendingRef.current;
    if (payload.controls === undefined && payload.sceneId === undefined) return;
    pendingRef.current = {};
    inFlightRef.current = true;
    setSaving(true);
    try {
      const remote = await jsonRequest<StandardPreviewStateResponse>(
        `/api/v1/previews/${stateId}`,
        {
          body: JSON.stringify(payload satisfies PreviewStateUpdate),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId('preview-update'),
            'X-CSRF-Token': current.csrfToken,
          },
          method: 'PATCH',
        },
      );
      setError(null);
      setState((local) => {
        const queued = pendingRef.current;
        return {
          ...remote,
          controls: { ...remote.controls, ...queued.controls },
          sceneId: queued.sceneId ?? local?.sceneId ?? remote.sceneId,
        };
      });
    } catch {
      setError('Изменение не сохранилось. Повторите попытку — выбранная конфигурация не потеряна.');
    } finally {
      inFlightRef.current = false;
      setSaving(false);
      if (pendingRef.current.controls !== undefined || pendingRef.current.sceneId !== undefined) {
        void senderRef.current();
      }
    }
  };
  useEffect(() => {
    senderRef.current = sendPending;
  });

  const queueUpdate = (update: PendingUpdate, immediate = false) => {
    pendingRef.current = mergePending(pendingRef.current, update);
    setState((current) => {
      if (current === null) return current;
      return {
        ...current,
        controls: { ...current.controls, ...update.controls },
        sceneId: update.sceneId ?? current.sceneId,
      };
    });
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void senderRef.current(), immediate ? 0 : 140);
  };

  const addToCart = async () => {
    if (quoteToken === null || stateId === null || state === null) return;
    setCartPending(true);
    setError(null);
    try {
      await jsonRequest<GuestCartResponse>('/api/v1/cart/items', {
        body: JSON.stringify({ previewStateId: stateId, quoteToken }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId('preview-cart-add'),
          'X-CSRF-Token': state.csrfToken,
        },
        method: 'POST',
      });
      setCartAdded(true);
    } catch {
      setError('Не удалось добавить изделие в корзину. Повторите попытку из конфигуратора.');
    } finally {
      setCartPending(false);
    }
  };

  if (stateId === null) {
    return (
      <section className="preview-empty-state">
        <p className="preview-kicker">Нет выбранной конфигурации</p>
        <h1>Сначала настройте жалюзи</h1>
        <p>Примерка открывается по безопасному идентификатору серверного расчёта.</p>
        <Link className="preview-primary-action" href="/configure">
          Перейти в конфигуратор
        </Link>
      </section>
    );
  }
  if (state === null) {
    return (
      <section className="preview-empty-state" aria-live="polite">
        <p>{error ?? 'Загружаем выбранный материал из локального хранилища…'}</p>
        {error === null ? null : (
          <Link href="/configure?resume=preview">Вернуться в конфигуратор</Link>
        )}
      </section>
    );
  }

  const previewAvailable =
    !assetFailed && state.eligibility.eligible && state.asset.quality !== 'PREVIEW_UNAVAILABLE';
  const openingControl = ['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM'].includes(state.family ?? '');
  return (
    <div className="preview-workspace">
      <section className="preview-stage" aria-labelledby="preview-title">
        <div className="preview-stage-heading">
          <div>
            <p className="preview-kicker">Реалистичная слоевая примерка</p>
            <h1 id="preview-title">{state.configuration.material.name}</h1>
          </div>
          <div className="preview-stage-status">
            <span className="preview-source-badge">{assetQualityLabel(state.asset.quality)}</span>
            <span className="preview-save-state" aria-live="polite">
              {saving ? 'Сохраняем…' : 'Изменения сохранены'}
            </span>
          </div>
        </div>
        {previewAvailable ? (
          <div className="preview-canvas-frame">
            <StandardPreviewRenderer onAssetError={() => setAssetFailed(true)} state={state} />
          </div>
        ) : (
          <div className="preview-unavailable" role="status">
            <strong>Для этого материала стандартная примерка пока недоступна</strong>
            <p>
              {assetFailed
                ? 'Локальный файл материала временно не загрузился. Попробуйте ещё раз.'
                : 'Мы не показываем случайную или неподтверждённую фактуру.'}
            </p>
            {assetFailed ? (
              <button className="preview-reset" onClick={() => setAssetFailed(false)} type="button">
                Повторить загрузку
              </button>
            ) : null}
          </div>
        )}
        <div className="preview-stage-notices">
          {state.asset.quality === 'NORMALIZED_COLOR_ONLY' ? (
            <p className="preview-quality-note">
              Предварительное отображение цвета без точной фактуры
            </p>
          ) : null}
          <p className="preview-disclaimer">
            Сцена демонстрационная: восприятие оттенка зависит от экрана и освещения, итоговый
            размер — от замера.
          </p>
          {state.eligibility.warnings.length === 0 ? null : (
            <p className="preview-warning">
              Конфигурация или версия цены изменилась. Вернитесь в конфигуратор для повторной
              проверки.
            </p>
          )}
          {error === null ? null : (
            <p className="preview-inline-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </section>

      <aside className="preview-side-panel" aria-label="Управление стандартной примеркой">
        <section className="preview-configuration-card">
          <p className="preview-kicker">Выбранная конфигурация</p>
          <h2>{state.configuration.family.name}</h2>
          <dl>
            <dt>Система</dt>
            <dd>{state.configuration.system.name}</dd>
            <dt>Модель</dt>
            <dd>{state.configuration.model.name}</dd>
            <dt>Материал</dt>
            <dd>
              {state.configuration.material.colorName} · арт. {state.configuration.material.article}
            </dd>
            <dt>Размер</dt>
            <dd>
              {state.configuration.dimensions.widthMm} × {state.configuration.dimensions.heightMm}{' '}
              мм
            </dd>
            <dt>Фурнитура</dt>
            <dd>
              <span
                className="preview-color-dot"
                style={{ backgroundColor: state.configuration.hardware.color }}
              />
              {state.configuration.hardware.label}
            </dd>
          </dl>
        </section>

        {previewAvailable ? (
          <section className="preview-controls-card">
            <div className="preview-scenes" role="group" aria-label="Демонстрационная сцена">
              {scenes.map((scene) => (
                <button
                  aria-pressed={state.sceneId === scene.id}
                  key={scene.id}
                  onClick={() => queueUpdate({ sceneId: scene.id }, true)}
                  title={scene.description}
                  type="button"
                >
                  {scene.label}
                </button>
              ))}
            </div>
            {openingControl ? (
              <>
                <RangeControl
                  label="Положение изделия"
                  min={0}
                  max={100}
                  onChange={(value) => queueUpdate({ controls: { openingPosition: value } })}
                  value={state.controls.openingPosition}
                />
                <div className="preview-preset-actions">
                  <button
                    onClick={() => queueUpdate({ controls: { openingPosition: 0 } }, true)}
                    type="button"
                  >
                    Открыть
                  </button>
                  <button
                    onClick={() => queueUpdate({ controls: { openingPosition: 100 } }, true)}
                    type="button"
                  >
                    Закрыть
                  </button>
                </div>
              </>
            ) : null}
            {state.family === 'ZEBRA' ? (
              <RangeControl
                label="Совмещение полос"
                min={0}
                max={100}
                onChange={(value) => queueUpdate({ controls: { zebraAlignment: value } })}
                value={state.controls.zebraAlignment}
              />
            ) : null}
            {state.family === 'HORIZONTAL_ALUMINUM' || state.family === 'VERTICAL' ? (
              <RangeControl
                label="Угол ламелей"
                min={-75}
                max={75}
                suffix="°"
                onChange={(value) => queueUpdate({ controls: { slatAngle: value } })}
                value={state.controls.slatAngle}
              />
            ) : null}
            {state.family === 'VERTICAL' ? (
              <RangeControl
                label="Степень раздвижения"
                min={0}
                max={100}
                onChange={(value) => queueUpdate({ controls: { verticalSpread: value } })}
                value={state.controls.verticalSpread}
              />
            ) : null}
            <RangeControl
              label="Увеличение окна"
              min={100}
              max={180}
              onChange={(value) => queueUpdate({ controls: { zoom: value } })}
              value={state.controls.zoom}
            />
            <button
              className="preview-reset"
              onClick={() => queueUpdate(resetControls(state), true)}
              type="button"
            >
              Сбросить примерку
            </button>
          </section>
        ) : null}
        {quoteToken === null ? null : (
          <section className="preview-cart-card">
            <button
              className="cart-primary-action"
              disabled={cartPending || cartAdded}
              onClick={() => void addToCart()}
              type="button"
            >
              {cartPending
                ? 'Добавляем…'
                : cartAdded
                  ? 'Добавлено в корзину'
                  : 'Добавить в корзину'}
            </button>
            {cartAdded ? (
              <p role="status">
                Изделие добавлено с текущей примеркой. <Link href="/cart">Открыть корзину →</Link>
              </p>
            ) : null}
          </section>
        )}
        <Link
          className="preview-primary-action preview-secondary-action"
          href="/configure?resume=preview"
        >
          ← Вернуться в конфигуратор
        </Link>
      </aside>
    </div>
  );
}
