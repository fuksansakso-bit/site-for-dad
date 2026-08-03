'use client';

import type { CatalogAdminDifference, CatalogAdminRelease } from '@project-name/catalog';
import { useState } from 'react';

import { reviewCatalogDifferences } from './actions';

interface DifferenceReviewPanelProps {
  readonly differences: readonly CatalogAdminDifference[];
  readonly release: CatalogAdminRelease;
  readonly scope: 'CATALOG' | 'PRICE';
}

function formatMinor(amount: number | null, currency: string | null): string {
  if (amount === null) return '—';
  const resolvedCurrency = currency ?? 'RUB';
  return `${(amount / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${resolvedCurrency}`;
}

export function DifferenceReviewPanel({
  differences,
  release,
  scope,
}: DifferenceReviewPanelProps): React.JSX.Element {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const count = selected.size;
  const allOnPageSelected = differences.length > 0 && count === differences.length;

  function toggle(id: string): void {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage(): void {
    setSelected(allOnPageSelected ? new Set() : new Set(differences.map((item) => item.id)));
  }

  return (
    <form action={reviewCatalogDifferences} className="difference-review-form">
      <input
        name="catalogDifferenceChecksum"
        type="hidden"
        value={release.catalogDifferenceChecksum ?? ''}
      />
      <input name="catalogSourceId" type="hidden" value={release.catalogSourceId} />
      <input name="catalogVersionId" type="hidden" value={release.catalogVersionId ?? ''} />
      <input name="expectedCount" type="hidden" value={count} />
      <input name="expectedVariantCount" type="hidden" value={release.variantCount} />
      <input
        name="priceDifferenceChecksum"
        type="hidden"
        value={release.priceDifferenceChecksum ?? ''}
      />
      <input name="priceVersionId" type="hidden" value={release.priceVersionId ?? ''} />
      <input name="scope" type="hidden" value={scope} />
      <input name="selectionMode" type="hidden" value="SELECTED" />
      <input name="syncRunId" type="hidden" value={release.syncRunId} />

      <div className="difference-toolbar">
        <button className="text-button" onClick={togglePage} type="button">
          {allOnPageSelected ? 'Снять выбор страницы' : 'Выбрать страницу'}
        </button>
        <span aria-live="polite">Выбрано: {count}</span>
      </div>

      <div className="difference-list">
        {differences.map((difference) => (
          <article className="difference-row" key={difference.id}>
            <label className="difference-check">
              <input
                checked={selected.has(difference.id)}
                name="differenceId"
                onChange={() => toggle(difference.id)}
                type="checkbox"
                value={difference.id}
              />
              <span className="sr-only">Выбрать {difference.entityName}</span>
            </label>
            <div className="difference-main">
              <div className="difference-title">
                <strong>{difference.entityName}</strong>
                <span className="status status-quiet">{difference.type}</span>
                <span
                  className={`status status-${difference.resolution === 'APPROVED' ? 'good' : 'warn'}`}
                >
                  {difference.resolution}
                </span>
              </div>
              <p>
                {difference.entityType} · source {difference.sourceId ?? 'без ID'}
                {difference.sourceUrl === null ? null : (
                  <>
                    {' · '}
                    <a href={difference.sourceUrl} rel="noreferrer" target="_blank">
                      сравнить с источником
                    </a>
                  </>
                )}
              </p>
              {difference.type === 'PRICE_CHANGED' ? (
                <p className="difference-values">
                  {formatMinor(difference.oldPriceMinor, difference.currency)} →{' '}
                  {formatMinor(difference.newPriceMinor, difference.currency)}
                </p>
              ) : (
                <p className="difference-values">
                  {difference.beforeSummary ?? 'новая запись'} →{' '}
                  {difference.afterSummary ?? 'удалено из источника'}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>

      <fieldset className="difference-decision" disabled={count === 0}>
        <legend>Решение для точного выбора</legend>
        <label>
          Решение
          <select defaultValue="APPROVED" name="resolution">
            <option value="APPROVED">Принять</option>
            <option value="DEFERRED">Отложить</option>
            <option value="REJECTED">Отклонить</option>
          </select>
        </label>
        <label>
          Причина
          <input
            defaultValue="Проверено по локальному источнику и публикационным правилам."
            name="reason"
            required
          />
        </label>
        <label>
          Точная фраза
          <input
            autoComplete="off"
            name="confirmation"
            placeholder={`ПРОВЕРИТЬ ${count}`}
            required
          />
        </label>
        <button className="button button-brass" type="submit">
          Записать решение для {count}
        </button>
      </fieldset>
    </form>
  );
}
