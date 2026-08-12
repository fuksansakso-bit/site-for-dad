-- Phase 1B.2 review batches make every selected/all diff decision durable and
-- bind it to the exact candidate checksum before approval or activation.
-- PLAN-1B2 migration risk: MEDIUM — enum extension and a new append-only audit table.
-- Recovery: restore the database backup if deployment fails; the migration
-- does not rewrite source snapshots, version entries, overlays, or active pointers.

BEGIN;

ALTER TYPE "catalog_difference_resolution"
    ADD VALUE IF NOT EXISTS 'DEFERRED' AFTER 'PENDING';

CREATE TYPE "catalog_difference_review_scope" AS ENUM ('CATALOG', 'PRICE');
CREATE TYPE "catalog_difference_selection_mode" AS ENUM ('ALL', 'SELECTED');

CREATE TABLE "catalog_difference_review_batch" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_run_id" UUID NOT NULL,
    "catalog_version_id" UUID,
    "price_version_id" UUID,
    "scope" "catalog_difference_review_scope" NOT NULL,
    "resolution" "catalog_difference_resolution" NOT NULL,
    "selection_mode" "catalog_difference_selection_mode" NOT NULL,
    "selected_difference_ids" JSONB NOT NULL,
    "selection_checksum" CHAR(64) NOT NULL,
    "request_checksum" CHAR(64) NOT NULL,
    "expected_difference_checksum" CHAR(64) NOT NULL,
    "affected_count" INTEGER NOT NULL,
    "reviewed_by_actor_id" UUID NOT NULL,
    "safe_reason" VARCHAR(512) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_difference_review_batch_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_difference_review_exact_target_check" CHECK (
        ("scope" = 'CATALOG' AND "catalog_version_id" IS NOT NULL
            AND "price_version_id" IS NULL)
        OR
        ("scope" = 'PRICE' AND "price_version_id" IS NOT NULL
            AND "catalog_version_id" IS NULL)
    ),
    CONSTRAINT "catalog_difference_review_selection_check" CHECK (
        jsonb_typeof("selected_difference_ids") = 'array'
        AND (
            ("selection_mode" = 'ALL'
                AND jsonb_array_length("selected_difference_ids") = 0)
            OR
            ("selection_mode" = 'SELECTED'
                AND jsonb_array_length("selected_difference_ids") BETWEEN 1 AND 500)
        )
    ),
    CONSTRAINT "catalog_difference_review_hashes_check" CHECK (
        "selection_checksum" ~ '^[0-9a-f]{64}$'
        AND "request_checksum" ~ '^[0-9a-f]{64}$'
        AND "expected_difference_checksum" ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT "catalog_difference_review_affected_count_check"
        CHECK ("affected_count" > 0),
    CONSTRAINT "catalog_difference_review_reason_check"
        CHECK (char_length(btrim("safe_reason")) BETWEEN 3 AND 512)
);

CREATE UNIQUE INDEX "catalog_difference_review_idempotency_key"
    ON "catalog_difference_review_batch"("idempotency_key");
CREATE INDEX "catalog_difference_review_run_scope_idx"
    ON "catalog_difference_review_batch"("sync_run_id", "scope", "created_at");

ALTER TABLE "catalog_difference_review_batch"
    ADD CONSTRAINT "catalog_difference_review_batch_sync_run_id_fkey"
    FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_difference_review_batch_catalog_version_id_fkey"
    FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_difference_review_batch_price_version_id_fkey"
    FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "catalog_difference_review_batch_reviewed_by_actor_id_fkey"
    FOREIGN KEY ("reviewed_by_actor_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "catalog_difference_review_batch_append_only"
    BEFORE UPDATE OR DELETE ON "catalog_difference_review_batch"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

COMMIT;
