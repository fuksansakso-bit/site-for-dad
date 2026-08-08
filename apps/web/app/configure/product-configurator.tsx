'use client';

import type {
  ConfiguratorBootstrapResponse,
  PricingCalculationResponse,
  PricingSelectionContract,
  QuoteSnapshotResponse,
} from '@project-name/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Result = PricingCalculationResponse['result'];

interface PersistedConfiguratorSelection {
  readonly additionalOptionIds: readonly string[];
  readonly catalogVersionId: string;
  readonly categoryId: string;
  readonly controlTypeId: string;
  readonly familyId: string;
  readonly hardwareOptionId: string;
  readonly heightMm: number;
  readonly materialVariantId: string;
  readonly modelId: string;
  readonly mountingTypeId: string;
  readonly quantity: number;
  readonly step: number;
  readonly systemId: string;
  readonly version: 1;
  readonly widthMm: number;
}

const configuratorSessionKey = 'project-name:configurator-selection:v1';

const steps = [
  'Семейство',
  'Категория',
  'Система',
  'Модель',
  'Монтаж',
  'Размер',
  'Материал и цвет',
  'Фурнитура',
  'Управление и опции',
  'Количество',
  'Итог',
] as const;

function requestId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function money(minor: number | null): string {
  if (minor === null) return '—';
  const whole = Math.trunc(minor / 100).toLocaleString('ru-RU');
  const fraction = String(minor % 100).padStart(2, '0');
  return `${whole},${fraction} ₽`;
}

function unique<T>(items: readonly T[], key: (item: T) => string): T[] {
  const values = new Map<string, T>();
  for (const item of items) values.set(key(item), item);
  return [...values.values()];
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const value: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof value === 'object' && value !== null && 'error' in value
        ? String((value as { error?: { message?: string } }).error?.message ?? 'REQUEST_FAILED')
        : 'REQUEST_FAILED';
    throw new Error(message);
  }
  return value as T;
}

function persistedSelection(catalogVersionId: string): PersistedConfiguratorSelection | null {
  try {
    const raw = globalThis.sessionStorage.getItem(configuratorSessionKey);
    if (raw === null || raw.length > 16_384) return null;
    const value = JSON.parse(raw) as Partial<PersistedConfiguratorSelection>;
    const stringFields = [
      'categoryId',
      'controlTypeId',
      'familyId',
      'hardwareOptionId',
      'materialVariantId',
      'modelId',
      'mountingTypeId',
      'systemId',
    ] as const;
    if (
      value.version !== 1 ||
      value.catalogVersionId !== catalogVersionId ||
      stringFields.some(
        (field) => typeof value[field] !== 'string' || (value[field]?.length ?? 0) > 96,
      ) ||
      !Number.isSafeInteger(value.widthMm) ||
      !Number.isSafeInteger(value.heightMm) ||
      !Number.isSafeInteger(value.quantity) ||
      !Number.isSafeInteger(value.step) ||
      !Array.isArray(value.additionalOptionIds) ||
      value.additionalOptionIds.some((id) => typeof id !== 'string' || id.length > 96)
    ) {
      return null;
    }
    return value as PersistedConfiguratorSelection;
  } catch {
    return null;
  }
}

export function ProductConfigurator(): React.JSX.Element {
  const [bootstrap, setBootstrap] = useState<ConfiguratorBootstrapResponse | null>(null);
  const [step, setStep] = useState(0);
  const [familyId, setFamilyId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [systemId, setSystemId] = useState('');
  const [modelId, setModelId] = useState('');
  const [mountingTypeId, setMountingTypeId] = useState('');
  const [widthMm, setWidthMm] = useState(700);
  const [heightMm, setHeightMm] = useState(1100);
  const [materialVariantId, setMaterialVariantId] = useState('');
  const [hardwareOptionId, setHardwareOptionId] = useState('');
  const [controlTypeId, setControlTypeId] = useState('');
  const [additionalOptionIds, setAdditionalOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [calculationToken, setCalculationToken] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteSnapshotResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [selectionRestored, setSelectionRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void jsonRequest<ConfiguratorBootstrapResponse>('/api/v1/configurator')
      .then((loaded) => {
        setBootstrap(loaded);
        const saved = persistedSelection(loaded.catalogVersionId);
        if (saved !== null) {
          setAdditionalOptionIds([...saved.additionalOptionIds]);
          setCategoryId(saved.categoryId);
          setControlTypeId(saved.controlTypeId);
          setFamilyId(saved.familyId);
          setHardwareOptionId(saved.hardwareOptionId);
          setHeightMm(saved.heightMm);
          setMaterialVariantId(saved.materialVariantId);
          setModelId(saved.modelId);
          setMountingTypeId(saved.mountingTypeId);
          setQuantity(saved.quantity);
          setStep(Math.min(9, Math.max(0, saved.step)));
          setSystemId(saved.systemId);
          setWidthMm(saved.widthMm);
        }
        setSelectionRestored(true);
      })
      .catch(() => setError('Конфигуратор временно недоступен. Попробуйте обновить страницу.'));
  }, []);

  useEffect(() => {
    if (bootstrap === null || !selectionRestored) return;
    const saved: PersistedConfiguratorSelection = {
      additionalOptionIds,
      catalogVersionId: bootstrap.catalogVersionId,
      categoryId,
      controlTypeId,
      familyId,
      hardwareOptionId,
      heightMm,
      materialVariantId,
      modelId,
      mountingTypeId,
      quantity,
      step: Math.min(step, 9),
      systemId,
      version: 1,
      widthMm,
    };
    globalThis.sessionStorage.setItem(configuratorSessionKey, JSON.stringify(saved));
  }, [
    additionalOptionIds,
    bootstrap,
    categoryId,
    controlTypeId,
    familyId,
    hardwareOptionId,
    heightMm,
    materialVariantId,
    modelId,
    mountingTypeId,
    quantity,
    selectionRestored,
    step,
    systemId,
    widthMm,
  ]);

  const family = bootstrap?.families.find((item) => item.id === familyId);
  const familyProfiles = useMemo(
    () => bootstrap?.profiles.filter((profile) => profile.productFamilyId === familyId) ?? [],
    [bootstrap, familyId],
  );
  const categoryProfiles = familyProfiles.filter(
    (profile) => profile.optionData.categoryId === categoryId,
  );
  const systemProfiles = categoryProfiles.filter((profile) => profile.productSystemId === systemId);
  const modelProfiles = systemProfiles.filter((profile) => profile.configuratorModelId === modelId);
  const profile =
    modelProfiles.find((item) => item.materialVariantId === materialVariantId) ??
    modelProfiles[0] ??
    null;

  const resetAfterFamily = (id: string) => {
    setFamilyId(id);
    setCategoryId('');
    setSystemId('');
    setModelId('');
    setMountingTypeId('');
    setMaterialVariantId('');
    setHardwareOptionId('');
    setControlTypeId('');
    setAdditionalOptionIds([]);
    setResult(null);
    setCalculationToken(null);
    setQuote(null);
    setError(null);
  };

  const advance = () => {
    setError(null);
    if (step === 0 && family?.automaticPricing === false) {
      setResult({
        appliedOverrides: [],
        appliedRules: [],
        calculatedAt: new Date().toISOString(),
        currency: 'RUB',
        deliveryKopecks: 0,
        grandTotalKopecks: null,
        installationKopecks: 0,
        measurementKopecks: 0,
        minimumPriceApplied: false,
        minimumPriceKopecks: 150000,
        optionsTotalKopecks: null,
        priceVersionId: bootstrap?.priceVersionId ?? null,
        productsSubtotalKopecks: null,
        quantity,
        safeExplanation: 'Для этого семейства цена рассчитывается по запросу.',
        sourceVersion: null,
        status: 'PRICE_ON_REQUEST',
        unitBasePriceKopecks: null,
        unitFinalPriceKopecks: null,
        unitPriceBeforeMinimumKopecks: null,
        validationDetails: [],
        warnings: [],
      });
      setStep(10);
      return;
    }
    setStep((current) => Math.min(10, current + 1));
  };

  const selection = (): PricingSelectionContract | null => {
    if (bootstrap === null || profile === null) return null;
    return {
      additionalOptionIds,
      catalogVersionId: bootstrap.catalogVersionId,
      configuratorModelId: profile.configuratorModelId,
      controlTypeId,
      hardwareOptionId,
      heightMm,
      materialVariantId: profile.materialVariantId,
      mountingTypeId,
      productFamilyId: profile.productFamilyId,
      productSystemId: profile.productSystemId,
      quantity,
      widthMm,
    };
  };

  const calculate = async () => {
    const input = selection();
    if (bootstrap === null || input === null) return;
    setPending(true);
    setError(null);
    setQuote(null);
    try {
      const response = await jsonRequest<PricingCalculationResponse>('/api/v1/pricing/calculate', {
        body: JSON.stringify(input),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId('calc'),
          'X-CSRF-Token': bootstrap.csrfToken,
        },
        method: 'POST',
      });
      setResult(response.result);
      setCalculationToken(response.calculationToken);
      setStep(10);
    } catch {
      setError('Не удалось выполнить расчёт. Проверьте параметры и повторите попытку.');
    } finally {
      setPending(false);
    }
  };

  const saveQuote = async () => {
    if (bootstrap === null || calculationToken === null) return;
    setPending(true);
    setError(null);
    try {
      setQuote(
        await jsonRequest<QuoteSnapshotResponse>('/api/v1/quotes', {
          body: JSON.stringify({ calculationToken }),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId('quote'),
            'X-CSRF-Token': bootstrap.csrfToken,
          },
          method: 'POST',
        }),
      );
    } catch {
      setError('Не удалось сохранить расчёт. Повторите попытку.');
    } finally {
      setPending(false);
    }
  };

  const openPreview = async () => {
    if (bootstrap === null || calculationToken === null) return;
    setPreviewPending(true);
    setError(null);
    try {
      const response = await jsonRequest<{ readonly href: string }>('/api/v1/previews', {
        body: JSON.stringify({ calculationToken }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestId('preview'),
          'X-CSRF-Token': bootstrap.csrfToken,
        },
        method: 'POST',
      });
      if (!/^\/preview\?state=[A-Za-z0-9_-]{32}$/u.test(response.href)) {
        throw new Error('PREVIEW_HREF_INVALID');
      }
      globalThis.location.assign(response.href);
    } catch {
      setError('Не удалось открыть стандартную примерку. Повторите попытку.');
      setPreviewPending(false);
    }
  };

  if (bootstrap === null) {
    return (
      <section className="configurator-loading" aria-live="polite">
        {error ?? 'Загружаем активный каталог…'}
      </section>
    );
  }

  const categories = unique(familyProfiles, (item) => item.optionData.categoryId);
  const systems = unique(categoryProfiles, (item) => item.productSystemId);
  const models = unique(systemProfiles, (item) => item.configuratorModelId);
  const materials = unique(modelProfiles, (item) => item.materialVariantId);
  const canContinue =
    [
      familyId !== '',
      categoryId !== '',
      systemId !== '',
      modelId !== '',
      mountingTypeId !== '',
      Number.isSafeInteger(widthMm) &&
        widthMm > 0 &&
        Number.isSafeInteger(heightMm) &&
        heightMm > 0,
      materialVariantId !== '',
      hardwareOptionId !== '',
      controlTypeId !== '',
      Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 1000,
      true,
    ][step] ?? false;

  return (
    <div className="configurator-grid">
      <nav aria-label="Шаги конфигуратора" className="configurator-progress">
        <p>
          Шаг {Math.min(step + 1, steps.length)} из {steps.length}
        </p>
        <ol>
          {steps.map((label, index) => (
            <li
              aria-current={index === step ? 'step' : undefined}
              className={index <= step ? 'is-active' : ''}
              key={label}
            >
              <span>{index + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>

      <section className="configurator-stage" aria-labelledby="configurator-step-title">
        <p className="configurator-kicker">Версия цены #{bootstrap.priceVersionNumber}</p>
        <h1 id="configurator-step-title">{steps[step]}</h1>
        {error === null ? null : (
          <p className="configurator-error" role="alert">
            {error}
          </p>
        )}

        {step === 0 ? (
          <ChoiceGrid
            items={bootstrap.families.map((item) => ({
              id: item.id,
              label: item.name,
              meta: item.automaticPricing ? 'Точный автоматический расчёт' : 'Цена по запросу',
            }))}
            onChange={resetAfterFamily}
            value={familyId}
          />
        ) : null}
        {step === 1 ? (
          <ChoiceGrid
            items={categories.map((item) => ({
              id: item.optionData.categoryId,
              label: item.optionData.categoryName,
            }))}
            onChange={setCategoryId}
            value={categoryId}
          />
        ) : null}
        {step === 2 ? (
          <ChoiceGrid
            items={systems.map((item) => ({
              id: item.productSystemId,
              label: item.optionData.systemName,
            }))}
            onChange={setSystemId}
            value={systemId}
          />
        ) : null}
        {step === 3 ? (
          <ChoiceGrid
            items={models.map((item) => ({
              id: item.configuratorModelId,
              label: item.productModelName,
              meta: item.productModelCode,
            }))}
            onChange={setModelId}
            value={modelId}
          />
        ) : null}
        {step === 4 && profile !== null ? (
          <ChoiceGrid
            items={profile.optionData.mountingTypes.map((item) => ({
              id: item.id,
              label: item.name,
            }))}
            onChange={setMountingTypeId}
            value={mountingTypeId}
          />
        ) : null}
        {step === 5 && profile !== null ? (
          <div className="dimension-grid">
            <label>
              Ширина, мм
              <input
                inputMode="numeric"
                max={100000}
                min={1}
                onChange={(event) => setWidthMm(event.currentTarget.valueAsNumber)}
                type="number"
                value={widthMm}
              />
              <small>
                Проверенный диапазон: {profile.minimumWidthMm}–{profile.maximumWidthMm} мм
              </small>
            </label>
            <label>
              Высота, мм
              <input
                inputMode="numeric"
                max={100000}
                min={1}
                onChange={(event) => setHeightMm(event.currentTarget.valueAsNumber)}
                type="number"
                value={heightMm}
              />
              <small>
                Проверенный диапазон: {profile.minimumHeightMm}–{profile.maximumHeightMm} мм
              </small>
            </label>
          </div>
        ) : null}
        {step === 6 ? (
          <ChoiceGrid
            items={materials.map((item) => ({
              id: item.materialVariantId,
              label: item.optionData.materialName,
              meta: `${item.optionData.materialColor} · арт. ${item.optionData.materialArticle}`,
            }))}
            onChange={setMaterialVariantId}
            value={materialVariantId}
          />
        ) : null}
        {step === 7 && profile !== null ? (
          <ChoiceGrid
            items={profile.optionData.hardwareOptions.map((item) => ({
              id: item.id,
              label: item.name,
              meta: item.amountMinor === 0 ? 'Включено' : `+ ${money(item.amountMinor)}`,
            }))}
            onChange={setHardwareOptionId}
            value={hardwareOptionId}
          />
        ) : null}
        {step === 8 && profile !== null ? (
          <div className="option-stack">
            <ChoiceGrid
              items={profile.optionData.controlTypes.map((item) => ({
                id: item.id,
                label: item.name,
              }))}
              onChange={setControlTypeId}
              value={controlTypeId}
            />
            <fieldset>
              <legend>Дополнительные подтверждённые опции</legend>
              {profile.optionData.additionalOptions.length === 0 ? (
                <p>Для выбранной модели дополнительных опций нет.</p>
              ) : (
                profile.optionData.additionalOptions.map((item) => (
                  <label className="check-option" key={item.id}>
                    <input
                      checked={additionalOptionIds.includes(item.id)}
                      onChange={(event) =>
                        setAdditionalOptionIds((current) =>
                          event.currentTarget.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id),
                        )
                      }
                      type="checkbox"
                    />
                    {item.name}
                  </label>
                ))
              )}
            </fieldset>
          </div>
        ) : null}
        {step === 9 ? (
          <label className="quantity-field">
            Количество изделий
            <input
              inputMode="numeric"
              max={1000}
              min={1}
              onChange={(event) => setQuantity(event.currentTarget.valueAsNumber)}
              type="number"
              value={quantity}
            />
            <small>Минимальная стоимость применяется отдельно к каждому изделию.</small>
          </label>
        ) : null}
        {step === 10 && result !== null ? (
          <ResultPanel
            openPreview={openPreview}
            pending={pending}
            previewAvailable={calculationToken !== null}
            previewPending={previewPending}
            quote={quote}
            result={result}
            saveQuote={saveQuote}
          />
        ) : null}

        <div className="configurator-controls">
          <button
            className="configurator-back"
            disabled={step === 0 || pending}
            onClick={() => {
              setStep((current) => Math.max(0, current - 1));
              setResult(null);
              setQuote(null);
            }}
            type="button"
          >
            ← Назад
          </button>
          {step < 9 ? (
            <button
              className="configurator-next"
              disabled={!canContinue || pending}
              onClick={advance}
              type="button"
            >
              Продолжить →
            </button>
          ) : null}
          {step === 9 ? (
            <button
              className="configurator-next"
              disabled={!canContinue || pending}
              onClick={() => void calculate()}
              type="button"
            >
              {pending ? 'Считаем…' : 'Рассчитать на сервере'}
            </button>
          ) : null}
        </div>
      </section>

      <aside className="configurator-summary" aria-label="Краткое резюме">
        <p>Ваш выбор</p>
        <dl>
          <dt>Семейство</dt>
          <dd>{family?.name ?? '—'}</dd>
          <dt>Система</dt>
          <dd>
            {profile?.optionData.systemName ??
              systems.find((item) => item.productSystemId === systemId)?.optionData.systemName ??
              '—'}
          </dd>
          <dt>Модель</dt>
          <dd>{profile?.productModelName ?? '—'}</dd>
          <dt>Размер</dt>
          <dd>
            {widthMm} × {heightMm} мм
          </dd>
          <dt>Количество</dt>
          <dd>{quantity}</dd>
        </dl>
        <small>Срок изготовления 2–7 календарных дней · гарантия 12 месяцев.</small>
      </aside>
    </div>
  );
}

function ChoiceGrid({
  items,
  onChange,
  value,
}: {
  readonly items: readonly { id: string; label: string; meta?: string }[];
  readonly onChange: (id: string) => void;
  readonly value: string;
}): React.JSX.Element {
  return (
    <div className="configurator-choices">
      {items.map((item) => (
        <button
          aria-pressed={value === item.id}
          className={value === item.id ? 'is-selected' : ''}
          key={item.id}
          onClick={() => onChange(item.id)}
          type="button"
        >
          <strong>{item.label}</strong>
          {item.meta === undefined ? null : <span>{item.meta}</span>}
        </button>
      ))}
    </div>
  );
}

function ResultPanel({
  openPreview,
  pending,
  previewAvailable,
  previewPending,
  quote,
  result,
  saveQuote,
}: {
  readonly openPreview: () => Promise<void>;
  readonly pending: boolean;
  readonly previewAvailable: boolean;
  readonly previewPending: boolean;
  readonly quote: QuoteSnapshotResponse | null;
  readonly result: Result;
  readonly saveQuote: () => Promise<void>;
}): React.JSX.Element {
  const calculated = result.status === 'CALCULATED' || result.status === 'SOURCE_DATA_STALE';
  return (
    <div className="pricing-result" aria-live="polite">
      <p className={`pricing-status pricing-status-${result.status.toLowerCase()}`}>
        {result.status}
      </p>
      <h2>Предварительная стоимость</h2>
      {calculated ? (
        <>
          <strong className="pricing-total">{money(result.grandTotalKopecks)}</strong>
          <dl>
            <dt>Базовая цена за изделие</dt>
            <dd>{money(result.unitBasePriceKopecks)}</dd>
            <dt>Опции за изделие</dt>
            <dd>{money(result.optionsTotalKopecks)}</dd>
            <dt>До минимальной цены</dt>
            <dd>{money(result.unitPriceBeforeMinimumKopecks)}</dd>
            {result.minimumPriceApplied ? (
              <>
                <dt>Минимум за изделие</dt>
                <dd>{money(result.minimumPriceKopecks)}</dd>
              </>
            ) : null}
            <dt>Изделия × {result.quantity}</dt>
            <dd>{money(result.productsSubtotalKopecks)}</dd>
            <dt>Замер</dt>
            <dd>{money(result.measurementKopecks)}</dd>
            <dt>Доставка</dt>
            <dd>{money(result.deliveryKopecks)}</dd>
            <dt>Установка</dt>
            <dd>{money(result.installationKopecks)}</dd>
          </dl>
          <p>{result.safeExplanation}</p>
          {previewAvailable ? (
            <button
              className="preview-launch-button"
              disabled={pending || previewPending}
              onClick={() => void openPreview()}
              type="button"
            >
              {previewPending ? 'Открываем примерку…' : 'Посмотреть на окне'}
            </button>
          ) : null}
          {quote === null ? (
            <button
              className="configurator-next"
              disabled={pending}
              onClick={() => void saveQuote()}
              type="button"
            >
              {pending ? 'Сохраняем…' : 'Сохранить расчёт'}
            </button>
          ) : (
            <p className="quote-saved">
              Расчёт сохранён неизменяемым снимком.{' '}
              <Link href={`/quote/${quote.quoteToken}`}>Открыть ссылку →</Link>
            </p>
          )}
        </>
      ) : (
        <div className="pricing-request">
          <strong>Сумма не подставляется</strong>
          <p>{result.safeExplanation}</p>
          {result.status === 'MANUAL_REVIEW_REQUIRED' &&
          !result.safeExplanation.includes('Размер требует проверки мастером') ? (
            <p>Размер требует проверки мастером.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
