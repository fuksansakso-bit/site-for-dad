-- Phase 1B.2 bulk commands retain exact selector, target, before/after and idempotency evidence.
-- PLAN-1B2 migration risk: MEDIUM — one enum and one append-only governance table.
-- Recovery: restore the database backup if deployment fails; no source, overlay,
-- catalog-version entry or active pointer is rewritten by this migration.

BEGIN;

CREATE TYPE "catalog_bulk_selector_mode" AS ENUM ('CATEGORY', 'FILTER', 'SELECTED');

CREATE TABLE "catalog_bulk_command" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "sync_run_id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "selector_mode" "catalog_bulk_selector_mode" NOT NULL,
    "selector" JSONB NOT NULL,
    "patch" JSONB NOT NULL,
    "target_entry_ids" JSONB NOT NULL,
    "before_snapshot" JSONB NOT NULL,
    "after_snapshot" JSONB NOT NULL,
    "matched_count" INTEGER NOT NULL,
    "affected_count" INTEGER NOT NULL,
    "selection_checksum" CHAR(64) NOT NULL,
    "request_checksum" CHAR(64) NOT NULL,
    "expected_difference_checksum" CHAR(64) NOT NULL,
    "applied_by_actor_id" UUID NOT NULL,
    "safe_reason" VARCHAR(512) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_bulk_command_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_bulk_command_counts_check" CHECK (
        "affected_count" BETWEEN 1 AND 10000
        AND "matched_count" BETWEEN "affected_count" AND 10000
    ),
    CONSTRAINT "catalog_bulk_command_json_check" CHECK (
        jsonb_typeof("selector") = 'object'
        AND jsonb_typeof("patch") = 'object'
        AND jsonb_typeof("target_entry_ids") = 'array'
        AND jsonb_typeof("before_snapshot") = 'array'
        AND jsonb_typeof("after_snapshot") = 'array'
        AND jsonb_array_length("target_entry_ids") = "affected_count"
        AND jsonb_array_length("before_snapshot") = "affected_count"
        AND jsonb_array_length("after_snapshot") = "affected_count"
    ),
    CONSTRAINT "catalog_bulk_command_hashes_check" CHECK (
        "selection_checksum" ~ '^[0-9a-f]{64}$'
        AND "request_checksum" ~ '^[0-9a-f]{64}$'
        AND "expected_difference_checksum" ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT "catalog_bulk_command_reason_check" CHECK (
        char_length(btrim("safe_reason")) BETWEEN 3 AND 512
    )
);

CREATE UNIQUE INDEX "catalog_bulk_command_idempotency_key"
    ON "catalog_bulk_command"("idempotency_key");
CREATE INDEX "catalog_bulk_command_version_time_idx"
    ON "catalog_bulk_command"("catalog_version_id", "created_at");
CREATE INDEX "catalog_bulk_command_run_selector_idx"
    ON "catalog_bulk_command"("sync_run_id", "selector_mode", "created_at");

ALTER TABLE "catalog_bulk_command"
    ADD CONSTRAINT "catalog_bulk_command_catalog_source_id_fkey"
    FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_bulk_command_sync_run_id_fkey"
    FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_bulk_command_catalog_version_id_fkey"
    FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_bulk_command_applied_by_actor_id_fkey"
    FOREIGN KEY ("applied_by_actor_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "catalog_bulk_command_append_only"
    BEFORE UPDATE OR DELETE ON "catalog_bulk_command"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

COMMIT;
