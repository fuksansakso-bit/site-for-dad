'use client';

import type {
  CatalogAdminCategoryFacet,
  CatalogAdminFacet,
  CatalogBusinessBulkPreview,
} from '@project-name/catalog';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState, useTransition } from 'react';

import {
  applyCatalogBusinessBulk,
  previewCatalogBusinessBulk,
  type CatalogBulkApplyActionState,
  type CatalogBulkPreviewActionState,
} from './actions';

interface BulkReleaseContext {
  readonly catalogDifferenceChecksum: string;
  readonly catalogSourceId: string;
  readonly catalogVersionId: string;
  readonly syncRunId: string;
}

interface BulkCommandPanelProps {
  readonly categories: readonly CatalogAdminCategoryFacet[];
  readonly release: BulkReleaseContext;
  readonly systems: readonly CatalogAdminFacet[];
  readonly variants: readonly BulkSelectableVariant[];
}

interface BulkSelectableVariant {
  readonly article: string;
  readonly businessCatalogEntryId: string | null;
  readonly id: string;
  readonly name: string;
}

const noticeMessages: Readonly<Record<string, string>> = {
  CATALOG_BULK_APPLIED: 'Массовое решение применено целиком и записано в историю.',
  CATALOG_BULK_PREVIEW_READY: 'Предпросмотр рассчитан по текущему состоянию кандидата.',
  CATALOG_MANAGEMENT_AUTHORIZATION: 'Эта команда доступна только роли OWNER.',
  CATALOG_MANAGEMENT_CONFLICT: 'Кандидат изменился. Обновите страницу и рассчитайте заново.',
  CATALOG_MANAGEMENT_NOT_FOUND: 'Один из выбранных объектов больше не входит в кандидат.',
  CATALOG_MANAGEMENT_NOT_READY: 'Сначала подготовьте публикационные записи кандидата.',
  CATALOG_MANAGEMENT_VALIDATION: 'Проверьте выбор, изменения и точную фразу подтверждения.',
};

function noticeText(code: string): string {
  return noticeMessages[code] ?? 'Команда не выполнена. Обновите состояние и повторите.';
}

function stateLine(state: CatalogBusinessBulkPreview['targets'][number]['before']): string {
  return [
    state.visibility,
    state.manualReviewState,
    state.availabilityStatus ?? 'без наличия',
    state.publicationStatus ?? 'без публикации',
  ].join(' · ');
}

export function BulkCommandPanel({
  categories,
  release,
  systems,
  variants,
}: BulkCommandPanelProps): React.JSX.Element {
  const router = useRouter();
  const [previewState, setPreviewState] = useState<CatalogBulkPreviewActionState | null>(null);
  const [applyState, setApplyState] = useState<CatalogBulkApplyActionState | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [previewPending, startPreview] = useTransition();
  const [applyPending, startApply] = useTransition();

  function preview(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setApplyState(null);
    setConfirmation('');
    startPreview(async () => {
      setPreviewState(await previewCatalogBusinessBulk(formData));
    });
  }

  function apply(): void {
    if (previewState?.status !== 'PREVIEW') return;
    startApply(async () => {
      const result = await applyCatalogBusinessBulk(previewState.applyToken, confirmation);
      setApplyState(result);
      if (result.status === 'APPLIED') router.refresh();
    });
  }

  return (
    <section className="bulk-panel" aria-labelledby="bulk-panel-title">
      <div className="bulk-panel-intro">
        <p className="section-number">МАССОВОЕ ЛОКАЛЬНОЕ РЕШЕНИЕ</p>
        <h4 id="bulk-panel-title">Сначала точный расчёт, затем применение</h4>
        <p>
          Команда меняет только видимость, проверку, наличие и публикацию. Данные AMIGO, исходная
          цена, описание и локальный ценовой override остаются нетронутыми.
        </p>
      </div>

      <form className="bulk-form" onSubmit={preview}>
        <input
          name="catalogDifferenceChecksum"
          type="hidden"
          value={release.catalogDifferenceChecksum}
        />
        <input name="catalogSourceId" type="hidden" value={release.catalogSourceId} />
        <input name="catalogVersionId" type="hidden" value={release.catalogVersionId} />
        <input name="syncRunId" type="hidden" value={release.syncRunId} />

        <fieldset>
          <legend>1. Точный набор</legend>
          <label>
            Способ выбора
            <select defaultValue="CATEGORY" name="selectorMode">
              <option value="CATEGORY">Категория и все вложенные</option>
              <option value="FILTER">Типизированный фильтр</option>
              <option value="SELECTED">Отмеченные на этой странице</option>
            </select>
          </label>
          <label>
            Категория
            <select defaultValue="" name="categoryId">
              <option value="">Выберите для режима «Категория»</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {'— '.repeat(category.depth)}
                  {category.label} · {category.count}
                </option>
              ))}
            </select>
          </label>
          <details className="bulk-filter-details">
            <summary>Поля типизированного фильтра</summary>
            <div className="bulk-filter-grid">
              <label>
                Категория
                <select defaultValue="" name="filterCategoryId">
                  <option value="">Любая</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.path}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Система
                <select defaultValue="" name="filterSystemId">
                  <option value="">Любая</option>
                  {systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.label} · {system.count}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Видимость
                <select defaultValue="" name="filterVisibility">
                  <option value="">Любая</option>
                  <option value="VISIBLE">VISIBLE</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
              <label>
                Проверка
                <select defaultValue="" name="filterReview">
                  <option value="">Любая</option>
                  <option value="UNREVIEWED">UNREVIEWED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </label>
              <label>
                Наличие
                <select defaultValue="" name="filterAvailability">
                  <option value="">Любое</option>
                  <option value="UNREVIEWED">UNREVIEWED</option>
                  <option value="INQUIRY_ONLY">INQUIRY_ONLY</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                  <option value="HIDDEN">HIDDEN</option>
                </select>
              </label>
              <label>
                Публикация
                <select defaultValue="" name="filterPublication">
                  <option value="">Любая</option>
                  <option value="UNREVIEWED">UNREVIEWED</option>
                  <option value="DRAFT">DRAFT</option>
                  <option value="PUBLISHED">PUBLISHED</option>
                  <option value="HIDDEN">HIDDEN</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </label>
              <label>
                Исходная цена
                <select defaultValue="" name="filterPrice">
                  <option value="">Любая</option>
                  <option value="AVAILABLE">Есть сумма</option>
                  <option value="PRICE_ON_REQUEST">По запросу</option>
                </select>
              </label>
            </div>
          </details>
          <details className="bulk-selection-details">
            <summary>Отметить записи с текущей страницы</summary>
            <div className="bulk-selection-list">
              {variants.map((variant) =>
                variant.businessCatalogEntryId === null ? null : (
                  <label key={variant.id}>
                    <input
                      name="selectedEntryId"
                      type="checkbox"
                      value={variant.businessCatalogEntryId}
                    />
                    <span>
                      {variant.name} · {variant.article}
                    </span>
                  </label>
                ),
              )}
            </div>
          </details>
        </fieldset>

        <fieldset>
          <legend>2. Новое локальное состояние</legend>
          <div className="bulk-patch-grid">
            <label>
              Видимость
              <select defaultValue="" name="patchVisibility">
                <option value="">Не менять</option>
                <option value="VISIBLE">VISIBLE</option>
                <option value="HIDDEN">HIDDEN</option>
              </select>
            </label>
            <label>
              Проверка
              <select defaultValue="" name="patchReview">
                <option value="">Не менять</option>
                <option value="UNREVIEWED">UNREVIEWED</option>
                <option value="APPROVED">APPROVED</option>
                <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </label>
            <label>
              Наличие
              <select defaultValue="" name="patchAvailability">
                <option value="">Не менять</option>
                <option value="INQUIRY_ONLY">INQUIRY_ONLY</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="UNREVIEWED">UNREVIEWED</option>
              </select>
            </label>
            <label>
              Публикация
              <select defaultValue="" name="patchPublication">
                <option value="">Не менять</option>
                <option value="PUBLISHED">PUBLISHED</option>
                <option value="DRAFT">DRAFT</option>
                <option value="HIDDEN">HIDDEN</option>
                <option value="ARCHIVED">ARCHIVED</option>
                <option value="UNREVIEWED">UNREVIEWED</option>
              </select>
            </label>
          </div>
          <label>
            Причина
            <input
              defaultValue="Подтверждённое локальное решение владельца каталога."
              name="reason"
              required
            />
          </label>
        </fieldset>

        <button className="button button-brass" disabled={previewPending} type="submit">
          {previewPending ? 'Считаем точный набор…' : 'Рассчитать влияние'}
        </button>
      </form>

      {previewState === null ? null : (
        <div
          className={`bulk-result ${previewState.status === 'ERROR' ? 'bulk-result-error' : ''}`}
          role="status"
        >
          <strong>{noticeText(previewState.notice)}</strong>
          {previewState.status === 'PREVIEW' ? (
            <>
              <dl className="bulk-result-metrics">
                <div>
                  <dt>Совпало</dt>
                  <dd>{previewState.preview.matchedCount}</dd>
                </div>
                <div>
                  <dt>Изменится</dt>
                  <dd>{previewState.preview.targetCount}</dd>
                </div>
                <div>
                  <dt>Отпечаток</dt>
                  <dd>
                    <code>{previewState.preview.selectionChecksum.slice(0, 12)}</code>
                  </dd>
                </div>
              </dl>
              <div className="bulk-target-preview">
                {previewState.preview.targets.slice(0, 12).map((target) => (
                  <article key={target.businessCatalogEntryId}>
                    <strong>{target.name}</strong>
                    <small>
                      {target.sourceId} · {target.businessCatalogEntryId}
                    </small>
                    <span>{stateLine(target.before)}</span>
                    <span aria-hidden="true">↓</span>
                    <span>{stateLine(target.after)}</span>
                  </article>
                ))}
              </div>
              <details className="bulk-exact-ids">
                <summary>Все точные ID ({previewState.preview.targetCount})</summary>
                <code>
                  {previewState.preview.targets
                    .map((target) => target.businessCatalogEntryId)
                    .join('\n')}
                </code>
              </details>
              <div className="bulk-confirmation">
                <label>
                  Введите точную фразу
                  <input
                    autoComplete="off"
                    onChange={(event) => setConfirmation(event.currentTarget.value)}
                    placeholder={previewState.preview.confirmation}
                    value={confirmation}
                  />
                </label>
                <button
                  className="button button-red"
                  disabled={applyPending || confirmation.length === 0}
                  onClick={apply}
                  type="button"
                >
                  {applyPending ? 'Применяем транзакцию…' : 'Применить точный набор'}
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {applyState === null ? null : (
        <p
          className={applyState.status === 'ERROR' ? 'notice notice-error' : 'notice'}
          role="status"
        >
          {noticeText(applyState.notice)}
          {applyState.status === 'APPLIED'
            ? ` Команда ${applyState.result.commandId.slice(0, 8)}; изменено ${applyState.result.targetCount}.`
            : ''}
        </p>
      )}
    </section>
  );
}
