-- PLAN-1B2 migration risk: LOW; keep media-import joins bounded immediately after a full
-- normalization transaction, before PostgreSQL has had time to refresh table statistics.
-- Rollback may drop this non-unique performance index without changing catalog data.
BEGIN;

CREATE INDEX IF NOT EXISTS "source_media_asset_source_entity_idx"
ON "source_media_asset"("source_entity_id");

COMMIT;
