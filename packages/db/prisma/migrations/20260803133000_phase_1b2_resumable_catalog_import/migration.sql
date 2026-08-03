-- PLAN-1B2 migration risk: MEDIUM; add append-only capture identities, durable checkpoints,
-- cancellation markers and a sealed full-import manifest without changing active catalog pointers.
-- Recovery: keep all captured evidence, disable the catalog source, and supersede this schema in
-- a forward migration; no source snapshot, version, media or business-overlay data is deleted.
-- PostgreSQL requires a newly added enum value to commit before it is referenced by constraints.
ALTER TYPE "catalog_sync_status" ADD VALUE 'CANCELLED';

BEGIN;

CREATE TYPE "catalog_sync_checkpoint_status" AS ENUM (
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
);

CREATE TYPE "catalog_import_manifest_status" AS ENUM (
    'COMPLETE',
    'PARTIAL_FAILED',
    'CANCELLED'
);

DROP TRIGGER "source_snapshot_append_only" ON "source_snapshot";
ALTER TABLE "source_snapshot" ADD COLUMN "capture_key" VARCHAR(512);
UPDATE "source_snapshot"
SET "capture_key" = 'legacy:' || "id"::text
WHERE "capture_key" IS NULL;
ALTER TABLE "source_snapshot" ALTER COLUMN "capture_key" SET NOT NULL;
DROP INDEX "source_snapshot_run_url_key";
CREATE UNIQUE INDEX "source_snapshot_run_capture_key"
    ON "source_snapshot"("sync_run_id", "capture_key");
CREATE TRIGGER "source_snapshot_append_only"
    BEFORE UPDATE OR DELETE ON "source_snapshot"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

ALTER TABLE "product_model"
    ALTER COLUMN "system_id" DROP NOT NULL,
    ADD COLUMN "category_id" UUID;
CREATE INDEX "product_model_category_idx" ON "product_model"("category_id");
ALTER TABLE "product_model"
    ADD CONSTRAINT "product_model_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "product_category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "catalog_sync_run"
    ADD COLUMN "cancel_requested_at" TIMESTAMPTZ(6),
    ADD COLUMN "cancel_requested_by_actor_id" UUID,
    ADD COLUMN "cancellation_reason" VARCHAR(512),
    ADD COLUMN "cancelled_at" TIMESTAMPTZ(6),
    ADD CONSTRAINT "catalog_sync_run_cancellation_check" CHECK (
        (
            "cancel_requested_at" IS NULL
            AND "cancel_requested_by_actor_id" IS NULL
            AND "cancellation_reason" IS NULL
            AND "cancelled_at" IS NULL
            AND "status" <> 'CANCELLED'
        )
        OR (
            "cancel_requested_at" IS NOT NULL
            AND "cancel_requested_by_actor_id" IS NOT NULL
            AND "cancellation_reason" IS NOT NULL
            AND (
                ("status" = 'CANCELLED' AND "cancelled_at" IS NOT NULL)
                OR ("status" <> 'CANCELLED' AND "cancelled_at" IS NULL)
            )
        )
    );

CREATE TABLE "catalog_sync_checkpoint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_run_id" UUID NOT NULL,
    "stage" VARCHAR(64) NOT NULL,
    "partition_key" VARCHAR(255) NOT NULL,
    "status" "catalog_sync_checkpoint_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "expected_count" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "resume_count" INTEGER NOT NULL DEFAULT 0,
    "safe_cursor" JSONB NOT NULL,
    "checksum" CHAR(64),
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_sync_checkpoint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_sync_checkpoint_counts_check" CHECK (
        "expected_count" >= 0
        AND "processed_count" >= 0
        AND "error_count" >= 0
        AND "resume_count" >= 0
        AND "processed_count" + "error_count" <= "expected_count"
        AND "resume_count" <= "processed_count"
    ),
    CONSTRAINT "catalog_sync_checkpoint_checksum_check" CHECK (
        "checksum" IS NULL OR "checksum" ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT "catalog_sync_checkpoint_completion_check" CHECK (
        ("status" = 'IN_PROGRESS' AND "completed_at" IS NULL)
        OR ("status" <> 'IN_PROGRESS' AND "completed_at" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "catalog_sync_checkpoint_identity_key"
    ON "catalog_sync_checkpoint"("sync_run_id", "stage", "partition_key");
CREATE INDEX "catalog_sync_checkpoint_status_idx"
    ON "catalog_sync_checkpoint"("sync_run_id", "status");
ALTER TABLE "catalog_sync_checkpoint"
    ADD CONSTRAINT "catalog_sync_checkpoint_sync_run_id_fkey"
    FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "catalog_import_manifest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_run_id" UUID NOT NULL,
    "status" "catalog_import_manifest_status" NOT NULL,
    "complete" BOOLEAN NOT NULL,
    "safe_manifest" JSONB NOT NULL,
    "manifest_checksum" CHAR(64) NOT NULL,
    "sealed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_import_manifest_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "catalog_import_manifest_checksum_check" CHECK (
        "manifest_checksum" ~ '^[0-9a-f]{64}$'
    ),
    CONSTRAINT "catalog_import_manifest_complete_check" CHECK (
        ("complete" AND "status" = 'COMPLETE')
        OR (NOT "complete" AND "status" <> 'COMPLETE')
    )
);

CREATE UNIQUE INDEX "catalog_import_manifest_run_key"
    ON "catalog_import_manifest"("sync_run_id");
CREATE INDEX "catalog_import_manifest_status_idx"
    ON "catalog_import_manifest"("status", "sealed_at");
ALTER TABLE "catalog_import_manifest"
    ADD CONSTRAINT "catalog_import_manifest_sync_run_id_fkey"
    FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TRIGGER "catalog_import_manifest_append_only"
    BEFORE UPDATE OR DELETE ON "catalog_import_manifest"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

UPDATE "supplier_relationship"
SET "permission_scope" = "permission_scope" || '{
      "phase": "1B.2",
      "pilotOnly": false,
      "fullCatalogImportAuthorized": true,
      "fullImportRequiresPilotGate": false
    }'::jsonb,
    "optional_evidence_reference" = 'OWNER-DECISION-012'
WHERE "id" = '00000000-0000-4000-8000-000000000102'::uuid;

UPDATE "catalog_source"
SET "name" = 'AMIGO authorized public full catalog',
    "parser_version" = 'amigo-public-html/2.0.0',
    "mapping_version" = 'amigo-public-full-catalog-mapping/2.0.0',
    "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = '00000000-0000-4000-8000-000000000103'::uuid;

COMMIT;
