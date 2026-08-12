-- PLAN-1B2 migration risk: MEDIUM
-- Media expansion: extend the existing source-media relation to exact typed catalog
-- targets without changing immutable objects, rights/publication state or active versions.
-- Recovery: disable new media intake and supersede this additive mapping in a forward migration;
-- existing material mappings and object bytes remain valid and are never deleted by rollback.
BEGIN;

ALTER TABLE "source_media_asset"
    ALTER COLUMN "material_variant_id" DROP NOT NULL,
    ADD COLUMN "category_id" UUID,
    ADD COLUMN "system_id" UUID,
    ADD COLUMN "model_id" UUID,
    ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT "source_media_asset_exact_target_check" CHECK (
        num_nonnulls(
            "material_variant_id",
            "category_id",
            "system_id",
            "model_id"
        ) = 1
    ),
    ADD CONSTRAINT "source_media_asset_sort_order_check" CHECK ("sort_order" >= 0);

CREATE INDEX "source_media_asset_category_role_idx"
    ON "source_media_asset"("category_id", "role");
CREATE INDEX "source_media_asset_system_role_idx"
    ON "source_media_asset"("system_id", "role");
CREATE INDEX "source_media_asset_model_role_idx"
    ON "source_media_asset"("model_id", "role");

ALTER TABLE "source_media_asset"
    ADD CONSTRAINT "source_media_asset_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "product_category"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "source_media_asset_system_id_fkey"
    FOREIGN KEY ("system_id") REFERENCES "product_system"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "source_media_asset_model_id_fkey"
    FOREIGN KEY ("model_id") REFERENCES "product_model"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
