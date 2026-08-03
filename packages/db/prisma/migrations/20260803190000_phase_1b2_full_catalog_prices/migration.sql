-- PLAN-1B2 migration risk: MEDIUM
-- Full price expansion: preserve immutable source-price revisions for both material variants
-- and product models, pinned to the semantic source version that produced each revision.
-- Recovery: stop new price capture and supersede this additive target/version mapping in a
-- forward migration; immutable source prices, PriceVersions and local overrides stay intact.
BEGIN;

DROP TRIGGER "source_price_record_append_only" ON "source_price_record";

ALTER TABLE "source_price_record"
    ALTER COLUMN "material_variant_id" DROP NOT NULL,
    ADD COLUMN "model_id" UUID,
    ADD COLUMN "source_version" VARCHAR(160);

UPDATE "source_price_record" AS price
SET "source_version" = (
    SELECT min(run."source_version")
    FROM "catalog_sync_item" AS item
    JOIN "catalog_sync_run" AS run ON run."id" = item."sync_run_id"
    WHERE item."source_entity_id" = price."source_entity_id"
      AND item."after_hash" = price."source_hash"
      AND run."source_version" IS NOT NULL
)
WHERE price."source_version" IS NULL;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "source_price_record" WHERE "source_version" IS NULL
    ) THEN
        RAISE EXCEPTION 'source price revision has no proven semantic source version';
    END IF;
END;
$$;

ALTER TABLE "source_price_record"
    ALTER COLUMN "source_version" SET NOT NULL,
    ADD CONSTRAINT "source_price_record_exact_target_check" CHECK (
        num_nonnulls("material_variant_id", "model_id") = 1
    ),
    ADD CONSTRAINT "source_price_record_model_id_fkey"
        FOREIGN KEY ("model_id") REFERENCES "product_model"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;

DROP INDEX "source_price_record_version_key";
CREATE UNIQUE INDEX "source_price_record_version_key"
    ON "source_price_record"("catalog_source_id", "source_id", "source_version");
CREATE INDEX "source_price_record_model_time_idx"
    ON "source_price_record"("model_id", "source_captured_at");

CREATE TRIGGER "source_price_record_append_only"
    BEFORE UPDATE OR DELETE ON "source_price_record"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

COMMIT;
