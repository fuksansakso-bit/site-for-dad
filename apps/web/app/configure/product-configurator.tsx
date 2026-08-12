'use client';

import type {
  CartItemEditSourceResponse,
  ConfiguratorBootstrapResponse,
  ConfiguratorMaterialSearchResponse,
  GuestCartResponse,
  PricingCalculationResponse,
  PricingSelectionContract,
  QuoteSnapshotResponse,
} from '@project-name/contracts';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type Result = PricingCalculationResponse['result'];
type MaterialResult = ConfiguratorMaterialSearchResponse['items'][number];

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

export function ProductConfigurator({
  commercialTerms,
  editReference,
}: {
  readonly commercialTerms: {
    readonly manufacturingLeadTime: string;
    readonly warranty: string;
  };
  readonly editReference: string | null;
}): React.JSX.Element {
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
  const [materialQuery, setMaterialQuery] = useState('');
  const [materialResults, setMaterialResults] = useState<MaterialResult[]>([]);
  const [materialCursor, setMaterialCursor] = useState<string | null>(null);
  const [materialTotal, setMaterialTotal] = useState(0);
  const [materialPending, setMaterialPending] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialResult | null>(null);
  const [hardwareOptionId, setHardwareOptionId] = useState('');
  const [controlTypeId, setControlTypeId] = useState('');
  const [additionalOptionIds, setAdditionalOptionIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [result, setResult] = useState<Result | null>(null);
  const [calculationToken, setCalculationToken] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteSnapshotResponse | null>(null);
  const [editItemRevision, setEditItemRevision] = useState<number | null>(null);
  const [cartAdded, setCartAdded] = useState(false);
  const [cartCount, setCartCount] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [selectionRestored, setSelectionRestored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await jsonRequest<ConfiguratorBootstrapResponse>('/api/v1/configurator');
        if (!active) return;
        setBootstrap(loaded);
        if (editReference !== null) {
          const source = await jsonRequest<CartItemEditSourceResponse>(
            `/api/v1/cart/items/${editReference}/edit-source`,
          );
          if (!active) return;
          const selection = source.selection;
          setEditItemRevision(source.itemRevision);
          setFamilyId(selection.productFamilyId);
          setQuantity(selection.quantity);
          if ('requestOnly' in selection) {
            setStep(9);
          } else {
            const selectedProfile = loaded.profiles.find(
              (profile) =>
                profile.configuratorModelId === selection.configuratorModelId &&
                profile.materialVariantId === selection.materialVariantId &&
                profile.productSystemId === selection.productSystemId,
            );
            if (selectedProfile === undefined) throw new Error('EDIT_SOURCE_STALE');
            setAdditionalOptionIds([...selection.additionalOptionIds]);
            setCategoryId(selectedProfile.optionData.categoryId);
            setControlTypeId(selection.controlTypeId);
            setHardwareOptionId(selection.hardwareOptionId);
            setHeightMm(selection.heightMm);
            setMaterialVariantId(selection.materialVariantId);
            setModelId(selection.configuratorModelId);
            setMountingTypeId(selection.mountingTypeId);
            setSystemId(selection.productSystemId);
            setWidthMm(selection.widthMm);
            setStep(9);
          }
          setSelectionRestored(true);
          return;
        }
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
      } catch {
        if (!active) return;
        setError(
          editReference === null
            ? 'Конфигуратор временно недоступен. Попробуйте обновить страницу.'
            : 'Не удалось загрузить позицию корзины. Откройте корзину и повторите попытку.',
        );
      }
    })();
    return () => {
      active = false;
    };
  }, [editReference]);

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
    try {
      globalThis.sessionStorage.setItem(configuratorSessionKey, JSON.stringify(saved));
    } catch {
      // The configurator remains usable when session storage is disabled or full.
    }
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

  useEffect(() => {
    if (bootstrap === null || step < 6 || familyId === '' || categoryId === '' || systemId === '') {
      return;
    }
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => {
      void (async () => {
        setMaterialPending(true);
        try {
          const parameters = new URLSearchParams({
            category: categoryId,
            family: familyId,
            limit: '24',
            q: materialQuery,
            system: systemId,
          });
          if (materialVariantId !== '' && selectedMaterial === null && materialQuery === '') {
            parameters.set('selected', materialVariantId);
          }
          const page = await jsonRequest<ConfiguratorMaterialSearchResponse>(
            `/api/v1/configurator/materials?${parameters.toString()}`,
            { signal: controller.signal },
          );
          setMaterialResults([...page.items]);
          setMaterialCursor(page.nextCursor);
          setMaterialTotal(page.total);
          if (materialVariantId !== '' && selectedMaterial === null) {
            setSelectedMaterial(page.items.find((item) => item.id === materialVariantId) ?? null);
          }
        } catch (loadError) {
          if (!controller.signal.aborted) {
            setError('Не удалось загрузить материалы. Повторите поиск.');
          }
        } finally {
          if (!controller.signal.aborted) setMaterialPending(false);
        }
      })();
    }, 200);
    return () => {
      globalThis.clearTimeout(timeout);
      controller.abort();
    };
  }, [
    bootstrap,
    categoryId,
    familyId,
    materialQuery,
    materialVariantId,
    selectedMaterial,
    step,
    systemId,
  ]);

  const family = bootstrap?.families.find((item) => item.id === familyId);
  const familySystems = useMemo(
    () => bootstrap?.systems.filter((system) => system.familyId === familyId) ?? [],
    [bootstrap, familyId],
  );
  const categorySystems = familySystems.filter((system) => system.categoryId === categoryId);
  const systemProfiles =
    bootstrap?.profiles.filter((profile) => profile.productSystemId === systemId) ?? [];
  const modelProfiles = systemProfiles.filter((profile) => profile.configuratorModelId === modelId);
  const automaticProfile = bootstrap?.profiles.find(
    (item) => item.productSystemId === systemId && item.materialVariantId === materialVariantId,
  );
  const profile = automaticProfile ?? modelProfiles[0] ?? systemProfiles[0] ?? null;

  const resetAfterFamily = (id: string) => {
    setFamilyId(id);
    setCategoryId('');
    setSystemId('');
    setModelId('');
    setMountingTypeId('');
    setMaterialVariantId('');
    setSelectedMaterial(null);
    setMaterialQuery('');
    setMaterialResults([]);
    setMaterialCursor(null);
    setMaterialTotal(0);
    setHardwareOptionId('');
    setControlTypeId('');
    setAdditionalOptionIds([]);
    setResult(null);
    setCalculationToken(null);
    setQuote(null);
    setCartAdded(false);
    setError(null);
  };

  const advance = () => {
    setError(null);
    setStep((current) => Math.min(10, current + 1));
  };

  const selectCategory = (id: string) => {
    setCategoryId(id);
    setSystemId('');
    setModelId('');
    setMaterialVariantId('');
    setSelectedMaterial(null);
    setMaterialResults([]);
    setMaterialCursor(null);
  };

  const selectSystem = (id: string) => {
    setSystemId(id);
    const firstProfile = bootstrap?.profiles.find((item) => item.productSystemId === id);
    setModelId(firstProfile?.configuratorModelId ?? '');
    setMaterialVariantId('');
    setSelectedMaterial(null);
    setMaterialResults([]);
    setMaterialCursor(null);
  };

  const selectMaterial = (item: MaterialResult) => {
    if (!item.selectable) return;
    setMaterialVariantId(item.id);
    setSelectedMaterial(item);
    const exactProfile = bootstrap?.profiles.find(
      (candidate) =>
        candidate.productSystemId === systemId && candidate.materialVariantId === item.id,
    );
    if (exactProfile !== undefined) setModelId(exactProfile.configuratorModelId);
    setResult(null);
    setCalculationToken(null);
    setQuote(null);
    setCartAdded(false);
    setCartCount(null);
  };

  const loadMoreMaterials = async () => {
    if (materialCursor === null || bootstrap === null) return;
    setMaterialPending(true);
    setError(null);
    try {
      const parameters = new URLSearchParams({
        category: categoryId,
        cursor: materialCursor,
        family: familyId,
        limit: '24',
        q: materialQuery,
        system: systemId,
      });
      const page = await jsonRequest<ConfiguratorMaterialSearchResponse>(
        `/api/v1/configurator/materials?${parameters.toString()}`,
      );
      setMaterialResults((current) => [...current, ...page.items]);
      setMaterialCursor(page.nextCursor);
      setMaterialTotal(page.total);
    } catch {
      setError('Не удалось загрузить следующую страницу материалов. Повторите попытку.');
    } finally {
      setMaterialPending(false);
    }
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
    if (bootstrap === null) return;
    if (selectedMaterial === null || materialVariantId === '') {
      setError('Выберите доступный материал перед расчётом.');
      setStep(6);
      return;
    }
    setPending(true);
    setError(null);
    setQuote(null);
    setCartAdded(false);
    try {
      const requestOnly =
        selectedMaterial?.pricing !== 'AUTOMATIC' || automaticProfile === undefined;
      if (!requestOnly && input === null) return;
      const response = await jsonRequest<PricingCalculationResponse>(
        requestOnly ? '/api/v1/pricing/request-price' : '/api/v1/pricing/calculate',
        {
          body: JSON.stringify(
            requestOnly
              ? {
                  catalogVersionId: bootstrap.catalogVersionId,
                  categoryId,
                  heightMm,
                  materialVariantId,
                  productFamilyId: familyId,
                  productSystemId: systemId,
                  quantity,
                  widthMm,
                }
              : input,
          ),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': requestId(requestOnly ? 'request-price' : 'calc'),
            'X-CSRF-Token': bootstrap.csrfToken,
          },
          method: 'POST',
        },
      );
      setResult(response.result);
      setCalculationToken(response.calculationToken);
      setStep(10);
    } catch {
      setError('Не удалось выполнить расчёт. Проверьте параметры и повторите попытку.');
    } finally {
      setPending(false);
    }
  };

  const ensureQuote = async (): Promise<QuoteSnapshotResponse> => {
    if (quote !== null) return quote;
    if (bootstrap === null || calculationToken === null) throw new Error('QUOTE_SOURCE_REQUIRED');
    const saved = await jsonRequest<QuoteSnapshotResponse>('/api/v1/quotes', {
      body: JSON.stringify({ calculationToken }),
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `quote-${calculationToken}`,
        'X-CSRF-Token': bootstrap.csrfToken,
      },
      method: 'POST',
    });
    setQuote(saved);
    return saved;
  };

  const saveQuote = async () => {
    setPending(true);
    setError(null);
    try {
      await ensureQuote();
    } catch {
      setError('Не удалось сохранить расчёт. Повторите попытку.');
    } finally {
      setPending(false);
    }
  };

  const addToCart = async () => {
    if (bootstrap === null) return;
    setPending(true);
    setError(null);
    try {
      const saved = await ensureQuote();
      const cart = await jsonRequest<GuestCartResponse>(
        editReference === null ? '/api/v1/cart/items' : `/api/v1/cart/items/${editReference}`,
        {
          body: JSON.stringify({
            ...(editReference === null ? {} : { expectedItemRevision: editItemRevision }),
            quoteToken: saved.quoteToken,
          }),
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key':
              editReference === null
                ? `cart-add-${saved.quoteToken}`
                : `cart-replace-${editReference}-${saved.quoteToken}`,
            'X-CSRF-Token': bootstrap.csrfToken,
          },
          method: editReference === null ? 'POST' : 'PATCH',
        },
      );
      setCartAdded(true);
      setCartCount(cart.summary.totalItemCount);
    } catch {
      setError('Не удалось добавить изделие в корзину. Обновите страницу и повторите попытку.');
    } finally {
      setPending(false);
    }
  };

  const openPreview = async () => {
    if (bootstrap === null || calculationToken === null) return;
    setPreviewPending(true);
    setError(null);
    try {
      const saved = await ensureQuote();
      const response = await jsonRequest<{ readonly href: string }>('/api/v1/previews', {
        body: JSON.stringify({ quoteToken: saved.quoteToken }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `preview-${saved.quoteToken}`,
          'X-CSRF-Token': bootstrap.csrfToken,
        },
        method: 'POST',
      });
      if (!/^\/preview\?state=[A-Za-z0-9_-]{32}$/u.test(response.href)) {
        throw new Error('PREVIEW_HREF_INVALID');
      }
      globalThis.location.assign(`${response.href}&quote=${saved.quoteToken}`);
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

  const categories = unique(familySystems, (item) => item.categoryId);
  const systems = unique(categorySystems, (item) => item.id);
  const models = unique(systemProfiles, (item) => item.configuratorModelId);
  const canContinue =
    [
      familyId !== '',
      categoryId !== '',
      systemId !== '',
      models.length === 0 || modelId !== '',
      profile === null || mountingTypeId !== '',
      Number.isSafeInteger(widthMm) &&
        widthMm > 0 &&
        Number.isSafeInteger(heightMm) &&
        heightMm > 0,
      materialVariantId !== '' && selectedMaterial?.selectable === true,
      profile === null || selectedMaterial?.pricing === 'MANUAL' || hardwareOptionId !== '',
      profile === null || selectedMaterial?.pricing === 'MANUAL' || controlTypeId !== '',
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
              id: item.categoryId,
              label: item.categoryName,
            }))}
            onChange={selectCategory}
            value={categoryId}
          />
        ) : null}
        {step === 2 ? (
          <ChoiceGrid
            items={systems.map((item) => ({
              id: item.id,
              label: item.name,
            }))}
            onChange={selectSystem}
            value={systemId}
          />
        ) : null}
        {step === 3 ? (
          models.length === 0 ? (
            <div className="configurator-manual-note">
              <strong>Модель подтвердит менеджер</strong>
              <p>
                Для этой системы нет проверенной автоматической модели. Материал всё равно можно
                выбрать для ручного расчёта.
              </p>
            </div>
          ) : (
            <ChoiceGrid
              items={models.map((item) => ({
                id: item.configuratorModelId,
                label: item.productModelName,
                meta: item.productModelCode,
              }))}
              onChange={setModelId}
              value={modelId}
            />
          )
        ) : null}
        {step === 4 ? (
          profile === null ? (
            <div className="configurator-manual-note">
              <strong>Способ монтажа уточнит мастер</strong>
              <p>Мы не подставляем неподтверждённую комплектацию.</p>
            </div>
          ) : (
            <ChoiceGrid
              items={profile.optionData.mountingTypes.map((item) => ({
                id: item.id,
                label: item.name,
              }))}
              onChange={setMountingTypeId}
              value={mountingTypeId}
            />
          )
        ) : null}
        {step === 5 ? (
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
                {profile === null
                  ? 'Размер проверит мастер перед подтверждением.'
                  : `Проверенный диапазон: ${profile.minimumWidthMm}–${profile.maximumWidthMm} мм`}
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
                {profile === null
                  ? 'Размер проверит мастер перед подтверждением.'
                  : `Проверенный диапазон: ${profile.minimumHeightMm}–${profile.maximumHeightMm} мм`}
              </small>
            </label>
          </div>
        ) : null}
        {step === 6 ? (
          <MaterialSearch
            cursor={materialCursor}
            items={materialResults}
            loadMore={loadMoreMaterials}
            onQueryChange={setMaterialQuery}
            onSelect={selectMaterial}
            pending={materialPending}
            query={materialQuery}
            selected={selectedMaterial}
            total={materialTotal}
          />
        ) : null}
        {step === 7 ? (
          profile === null || selectedMaterial?.pricing === 'MANUAL' ? (
            <div className="configurator-manual-note">
              <strong>Фурнитуру подберёт менеджер</strong>
              <p>Стоимость и совместимость комплектации будут подтверждены вручную.</p>
            </div>
          ) : (
            <ChoiceGrid
              items={profile.optionData.hardwareOptions.map((item) => ({
                id: item.id,
                label: item.name,
                meta: item.amountMinor === 0 ? 'Включено' : `+ ${money(item.amountMinor)}`,
              }))}
              onChange={setHardwareOptionId}
              value={hardwareOptionId}
            />
          )
        ) : null}
        {step === 8 && profile !== null && selectedMaterial?.pricing !== 'MANUAL' ? (
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
        ) : step === 8 ? (
          <div className="configurator-manual-note">
            <strong>Управление и опции проверит менеджер</strong>
            <p>Неподтверждённые опции не влияют на предварительный результат.</p>
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
            addToCart={addToCart}
            cartAdded={cartAdded}
            cartCount={cartCount}
            changeParameters={() => {
              setStep(5);
              setResult(null);
              setCalculationToken(null);
              setQuote(null);
              setCartAdded(false);
              setCartCount(null);
            }}
            openPreview={openPreview}
            pending={pending}
            previewAvailable={
              calculationToken !== null &&
              automaticProfile !== undefined &&
              (result.status === 'CALCULATED' || result.status === 'SOURCE_DATA_STALE')
            }
            previewPending={previewPending}
            quote={quote}
            restart={() => {
              globalThis.sessionStorage.removeItem(configuratorSessionKey);
              globalThis.location.assign('/configure');
            }}
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
              setCartAdded(false);
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
              systems.find((item) => item.id === systemId)?.name ??
              '—'}
          </dd>
          <dt>Модель</dt>
          <dd>{profile?.productModelName ?? 'Уточнит менеджер'}</dd>
          <dt>Материал</dt>
          <dd>{selectedMaterial?.name ?? '—'}</dd>
          <dt>Размер</dt>
          <dd>
            {widthMm} × {heightMm} мм
          </dd>
          <dt>Количество</dt>
          <dd>{quantity}</dd>
        </dl>
        <small>
          Срок изготовления {commercialTerms.manufacturingLeadTime} · гарантия{' '}
          {commercialTerms.warranty}.
        </small>
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

function MaterialSearch({
  cursor,
  items,
  loadMore,
  onQueryChange,
  onSelect,
  pending,
  query,
  selected,
  total,
}: {
  readonly cursor: string | null;
  readonly items: readonly MaterialResult[];
  readonly loadMore: () => Promise<void>;
  readonly onQueryChange: (value: string) => void;
  readonly onSelect: (item: MaterialResult) => void;
  readonly pending: boolean;
  readonly query: string;
  readonly selected: MaterialResult | null;
  readonly total: number;
}): React.JSX.Element {
  return (
    <div className="configurator-material-search">
      <label className="material-search-field">
        Найти по названию, артикулу или цвету
        <input
          autoComplete="off"
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Например, 5992 или серый"
          type="search"
          value={query}
        />
      </label>
      {selected === null ? null : (
        <p className="material-selected" role="status">
          Выбрано: <strong>{selected.name}</strong>, арт. {selected.article}
        </p>
      )}
      <p className="material-search-count" aria-live="polite">
        {pending && items.length === 0 ? 'Ищем материалы…' : `Найдено материалов: ${total}`}
      </p>
      {!pending && items.length === 0 ? (
        <div className="configurator-empty-state">
          <strong>Материалы не найдены</strong>
          <p>Измените запрос или вернитесь к выбору системы.</p>
        </div>
      ) : (
        <div className="configurator-material-grid">
          {items.map((item) => (
            <button
              aria-pressed={selected?.id === item.id}
              className={selected?.id === item.id ? 'is-selected' : ''}
              disabled={!item.selectable}
              key={item.id}
              onClick={() => onSelect(item)}
              type="button"
            >
              <span className="configurator-material-image">
                {item.image === null ? (
                  <span aria-hidden="true" className="material-image-placeholder">
                    Фото уточняется
                  </span>
                ) : (
                  <Image
                    alt=""
                    height={item.image.height}
                    sizes="(max-width: 560px) 42vw, 180px"
                    src={item.image.url}
                    width={item.image.width}
                  />
                )}
              </span>
              <strong>{item.name}</strong>
              <span>Арт. {item.article}</span>
              <span>{item.color}</span>
              <span>{item.category}</span>
              <span>{item.system}</span>
              <span>{item.availabilityLabel}</span>
              <span>{item.calculationLabel}</span>
            </button>
          ))}
        </div>
      )}
      {cursor === null ? null : (
        <button
          className="material-load-more"
          disabled={pending}
          onClick={() => void loadMore()}
          type="button"
        >
          {pending ? 'Загружаем…' : 'Показать ещё'}
        </button>
      )}
    </div>
  );
}

function ResultPanel({
  addToCart,
  cartAdded,
  cartCount,
  changeParameters,
  openPreview,
  pending,
  previewAvailable,
  previewPending,
  quote,
  restart,
  result,
  saveQuote,
}: {
  readonly addToCart: () => Promise<void>;
  readonly cartAdded: boolean;
  readonly cartCount: number | null;
  readonly changeParameters: () => void;
  readonly openPreview: () => Promise<void>;
  readonly pending: boolean;
  readonly previewAvailable: boolean;
  readonly previewPending: boolean;
  readonly quote: QuoteSnapshotResponse | null;
  readonly restart: () => void;
  readonly result: Result;
  readonly saveQuote: () => Promise<void>;
}): React.JSX.Element {
  const calculated = result.status === 'CALCULATED' || result.status === 'SOURCE_DATA_STALE';
  const addable = [
    'CALCULATED',
    'SOURCE_DATA_STALE',
    'PRICE_ON_REQUEST',
    'MANUAL_REVIEW_REQUIRED',
  ].includes(result.status);
  const statusLabel = calculated
    ? 'Стоимость рассчитана'
    : result.status === 'PRICE_ON_REQUEST'
      ? 'Стоимость уточнит менеджер'
      : result.status === 'MANUAL_REVIEW_REQUIRED'
        ? 'Размер требует проверки'
        : 'Конфигурацию нужно проверить';
  return (
    <div className="pricing-result" aria-live="polite">
      <p className={`pricing-status pricing-status-${result.status.toLowerCase()}`}>
        {statusLabel}
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
      {addable ? (
        <div className="cart-add-panel">
          <button
            className="cart-primary-action"
            disabled={pending || cartAdded}
            onClick={() => void addToCart()}
            type="button"
          >
            {pending ? 'Добавляем…' : cartAdded ? 'Добавлено в корзину' : 'Добавить в корзину'}
          </button>
          {cartAdded ? (
            <p className="cart-add-confirmation" role="status">
              Изделие сохранено по этому расчёту
              {cartCount === null ? '.' : `. В корзине: ${cartCount}.`}{' '}
              <Link href="/cart">Открыть корзину →</Link>
            </p>
          ) : null}
        </div>
      ) : (
        <p className="configurator-error">Эту конфигурацию нельзя добавить в корзину.</p>
      )}
      <div className="configurator-result-actions">
        <button onClick={changeParameters} type="button">
          Изменить параметры
        </button>
        <button onClick={restart} type="button">
          Рассчитать ещё одно окно
        </button>
      </div>
    </div>
  );
}
