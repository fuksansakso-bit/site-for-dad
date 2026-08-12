import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPOSITORY_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);
export const ARTIFACT_ROOT = path.join(REPOSITORY_ROOT, '.local', 'phase-2a-migration');
export const EXPORT_ROOT = path.join(ARTIFACT_ROOT, 'export');
export const TRANSFORM_ROOT = path.join(ARTIFACT_ROOT, 'transform');
export const FORMAT_VERSION = 'phase-2a-etl-v1';
export const OWNER_EXCLUSION_REASON = 'OWNER_EXCLUDED_NOT_OFFERED';
export const MINIMUM_PRICE_KOPECKS = 150_000;

// These identities were resolved from active legacy CatalogVersion 2. Names are
// validated too, but sourceId + sourceSlug are the stable selection boundary.
export const OWNER_CATEGORY_EXCLUSIONS = Object.freeze(
  [
    {
      ownerLabel: 'ZIP системы для террас',
      name: 'ZIP системы для террас',
      sourceId: 'category:path:outdoor-rulonnye-shtory',
      sourceSlug: 'amigo-category-outdoor-rulonnye-shtory',
    },
    {
      ownerLabel: 'Интерьерные ставни. Шаттерсы',
      name: 'Интерьерные ставни',
      sourceId: 'category:path:interernye-stavni',
      sourceSlug: 'amigo-category-interernye-stavni',
    },
    {
      ownerLabel: 'Шторы Портьеры',
      name: 'Шторы: Классические портьеры',
      sourceId: 'category:path:shtory-klassicheskie-portery',
      sourceSlug: 'amigo-category-shtory-klassicheskie-portery',
    },
    {
      ownerLabel: 'Шторы гофре на пластиковые окна',
      name: 'Шторы и жалюзи гофре на пластиковые окна',
      sourceId: 'category:path:shtory-gofre',
      sourceSlug: 'amigo-category-shtory-gofre',
    },
    {
      ownerLabel: 'Моторизованные шторы',
      name: 'Моторизованные шторы',
      sourceId: 'category:path:motorizatsiya-shtory',
      sourceSlug: 'amigo-category-motorizatsiya-shtory',
    },
  ].sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en')),
);

export const TECHNICAL_EXCLUSIONS = Object.freeze([
  ['source_snapshot', 'RAW_SOURCE_SNAPSHOT'],
  ['catalog_sync_run', 'SYNC_DIAGNOSTIC'],
  ['catalog_sync_checkpoint', 'SYNC_DIAGNOSTIC'],
  ['standard_preview_state', 'LEGACY_PREVIEW_OR_AI_ASSET'],
  ['guest_cart_session', 'EXPIRED_OR_LEGACY_SESSION'],
  ['guest_cart', 'LEGACY_BROWSER_CART'],
  ['cart_item', 'LEGACY_BROWSER_CART'],
  ['cart_item_revision', 'LEGACY_BROWSER_CART'],
  ['background_job', 'LEGACY_WORKER_JOB'],
  ['audit_event', 'DEVELOPMENT_AUDIT_NOISE'],
  ['synthetic_session', 'LEGACY_STAFF_SESSION'],
]);
