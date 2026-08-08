CREATE TYPE "preview_asset_quality" AS ENUM (
  'EXACT_SWATCH',
  'PRODUCT_IMAGE_CROP',
  'NORMALIZED_COLOR_ONLY',
  'PREVIEW_UNAVAILABLE'
);

CREATE TABLE "standard_preview_state" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "public_token" VARCHAR(64) NOT NULL,
  "owner_token_hash" CHAR(64) NOT NULL,
  "idempotency_key" VARCHAR(255) NOT NULL,
  "request_digest" CHAR(64) NOT NULL,
  "state_version" SMALLINT NOT NULL DEFAULT 1,
  "source_calculation_id" UUID NOT NULL,
  "quote_snapshot_id" UUID,
  "catalog_version_id" UUID NOT NULL,
  "price_version_id" UUID,
  "product_family_id" UUID NOT NULL,
  "product_system_id" UUID NOT NULL,
  "material_variant_id" UUID NOT NULL,
  "material_asset_id" UUID,
  "scene_id" VARCHAR(64) NOT NULL,
  "renderer_version" VARCHAR(64) NOT NULL,
  "family_code" VARCHAR(64) NOT NULL,
  "configuration_snapshot" JSONB NOT NULL,
  "asset_quality" "preview_asset_quality" NOT NULL,
  "normalized_color" CHAR(7),
  "opening_position" SMALLINT NOT NULL,
  "controls" JSONB NOT NULL,
  "family_parameters" JSONB NOT NULL,
  "hardware_color" CHAR(7) NOT NULL,
  "state_checksum" CHAR(64) NOT NULL,
  "correlation_id" VARCHAR(128) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "standard_preview_state_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "standard_preview_state_public_token_key" UNIQUE ("public_token"),
  CONSTRAINT "standard_preview_state_idempotency_key" UNIQUE ("idempotency_key"),
  CONSTRAINT "standard_preview_state_owner_hash_check" CHECK ("owner_token_hash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "standard_preview_state_request_digest_check" CHECK ("request_digest" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "standard_preview_state_checksum_check" CHECK ("state_checksum" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "standard_preview_state_version_check" CHECK ("state_version" = 1),
  CONSTRAINT "standard_preview_state_scene_check" CHECK ("scene_id" IN ('WINDOW_CLOSEUP', 'ROOM_WINDOW')),
  CONSTRAINT "standard_preview_state_opening_check" CHECK ("opening_position" BETWEEN 0 AND 100),
  CONSTRAINT "standard_preview_state_color_check" CHECK (
    "normalized_color" IS NULL OR "normalized_color" ~ '^#[0-9A-F]{6}$'
  ),
  CONSTRAINT "standard_preview_state_hardware_color_check" CHECK ("hardware_color" ~ '^#[0-9A-F]{6}$'),
  CONSTRAINT "standard_preview_state_source_calculation_fkey" FOREIGN KEY ("source_calculation_id") REFERENCES "pricing_calculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_quote_snapshot_fkey" FOREIGN KEY ("quote_snapshot_id") REFERENCES "quote_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_catalog_version_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_price_version_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_product_family_fkey" FOREIGN KEY ("product_family_id") REFERENCES "product_family"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_product_system_fkey" FOREIGN KEY ("product_system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_material_variant_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "standard_preview_state_material_asset_fkey" FOREIGN KEY ("material_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "standard_preview_state_owner_updated_idx" ON "standard_preview_state"("owner_token_hash", "updated_at");
CREATE INDEX "standard_preview_state_expiry_idx" ON "standard_preview_state"("expires_at");
CREATE INDEX "standard_preview_state_material_quality_idx" ON "standard_preview_state"("material_variant_id", "asset_quality");
