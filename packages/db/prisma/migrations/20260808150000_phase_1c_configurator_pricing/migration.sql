-- Phase 1C configurator/pricing append-only rule, calculation and quote records.
-- Recovery uses forward compensation; no Phase 1B.2 source, overlay or media row is rewritten.

BEGIN;

CREATE TYPE "pricing_rule_kind" AS ENUM ('EXACT_LOOKUP', 'AREA_MINIMUM');
CREATE TYPE "pricing_rule_verification_status" AS ENUM ('CANDIDATE', 'VERIFIED', 'REJECTED');
CREATE TYPE "pricing_parity_status" AS ENUM ('PENDING', 'PASSED', 'FAILED');
CREATE TYPE "pricing_calculation_status" AS ENUM (
    'CALCULATED',
    'PRICE_ON_REQUEST',
    'MANUAL_REVIEW_REQUIRED',
    'CONFIGURATION_INVALID',
    'SOURCE_DATA_STALE',
    'PRICE_VERSION_INACTIVE',
    'DEPENDENCY_UNAVAILABLE'
);
CREATE TYPE "pricing_version_decision_action" AS ENUM ('ACTIVATE', 'REJECT', 'PARITY_VERIFY');

CREATE TABLE "pricing_rule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_version_id" UUID NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "rule_key" VARCHAR(128) NOT NULL,
    "kind" "pricing_rule_kind" NOT NULL,
    "verification_status" "pricing_rule_verification_status" NOT NULL,
    "parity_status" "pricing_parity_status" NOT NULL,
    "product_family_id" UUID NOT NULL,
    "product_system_id" UUID NOT NULL,
    "configurator_model_id" UUID NOT NULL,
    "product_model_source_id" VARCHAR(64) NOT NULL,
    "product_model_code" VARCHAR(64) NOT NULL,
    "product_model_name" VARCHAR(255) NOT NULL,
    "material_variant_id" UUID NOT NULL,
    "source_reference" VARCHAR(255) NOT NULL,
    "source_version" VARCHAR(160) NOT NULL,
    "source_captured_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6) NOT NULL,
    "source_price_category" VARCHAR(64),
    "currency" CHAR(3) NOT NULL,
    "base_price_minor" INTEGER,
    "rounding_rule" VARCHAR(64) NOT NULL,
    "minimum_width_mm" INTEGER NOT NULL,
    "maximum_width_mm" INTEGER NOT NULL,
    "minimum_height_mm" INTEGER NOT NULL,
    "maximum_height_mm" INTEGER NOT NULL,
    "rule_data" JSONB NOT NULL,
    "option_data" JSONB NOT NULL,
    "test_examples" JSONB NOT NULL,
    "fixture_count" INTEGER NOT NULL,
    "maximum_deviation_minor" INTEGER NOT NULL,
    "safe_explanation" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_rule_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pricing_rule_amount_check" CHECK ("base_price_minor" IS NULL OR "base_price_minor" >= 0),
    CONSTRAINT "pricing_rule_dimension_check" CHECK (
        "minimum_width_mm" > 0 AND "maximum_width_mm" >= "minimum_width_mm"
        AND "minimum_height_mm" > 0 AND "maximum_height_mm" >= "minimum_height_mm"
    ),
    CONSTRAINT "pricing_rule_fixture_check" CHECK (
        "fixture_count" >= 10 AND "maximum_deviation_minor" >= 0
        AND jsonb_typeof("test_examples") = 'array'
        AND jsonb_array_length("test_examples") = "fixture_count"
    ),
    CONSTRAINT "pricing_rule_json_check" CHECK (
        jsonb_typeof("rule_data") = 'object' AND jsonb_typeof("option_data") = 'object'
    )
);
CREATE UNIQUE INDEX "pricing_rule_version_key" ON "pricing_rule"("price_version_id", "rule_key");
CREATE INDEX "pricing_rule_version_parity_idx" ON "pricing_rule"("price_version_id", "parity_status");
CREATE INDEX "pricing_rule_configuration_idx" ON "pricing_rule"("product_family_id", "product_system_id", "material_variant_id");
ALTER TABLE "pricing_rule"
    ADD CONSTRAINT "pricing_rule_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_rule_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_rule_product_family_id_fkey" FOREIGN KEY ("product_family_id") REFERENCES "product_family"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_rule_product_system_id_fkey" FOREIGN KEY ("product_system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_rule_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pricing_parity_run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_version_id" UUID NOT NULL,
    "status" "pricing_parity_status" NOT NULL,
    "source_version" VARCHAR(160) NOT NULL,
    "fixture_count" INTEGER NOT NULL,
    "passed_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "maximum_deviation_minor" INTEGER NOT NULL,
    "safe_details" JSONB NOT NULL,
    "run_by_actor_id" UUID,
    "correlation_id" VARCHAR(128) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_parity_run_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pricing_parity_counts_check" CHECK (
        "fixture_count" >= 0 AND "passed_count" >= 0 AND "failed_count" >= 0
        AND "fixture_count" = "passed_count" + "failed_count"
        AND "maximum_deviation_minor" >= 0
    ),
    CONSTRAINT "pricing_parity_details_check" CHECK (jsonb_typeof("safe_details") = 'object')
);
CREATE UNIQUE INDEX "pricing_parity_run_idempotency_key" ON "pricing_parity_run"("idempotency_key");
CREATE INDEX "pricing_parity_run_version_time_idx" ON "pricing_parity_run"("price_version_id", "created_at");
ALTER TABLE "pricing_parity_run"
    ADD CONSTRAINT "pricing_parity_run_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_parity_run_actor_id_fkey" FOREIGN KEY ("run_by_actor_id") REFERENCES "actor_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pricing_calculation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_token" VARCHAR(64) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "request_digest" CHAR(64) NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "price_version_id" UUID,
    "status" "pricing_calculation_status" NOT NULL,
    "input_snapshot" JSONB NOT NULL,
    "result_snapshot" JSONB NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_calculation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pricing_calculation_digest_check" CHECK ("request_digest" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "pricing_calculation_json_check" CHECK (jsonb_typeof("input_snapshot") = 'object' AND jsonb_typeof("result_snapshot") = 'object')
);
CREATE UNIQUE INDEX "pricing_calculation_public_token_key" ON "pricing_calculation"("public_token");
CREATE UNIQUE INDEX "pricing_calculation_idempotency_key" ON "pricing_calculation"("idempotency_key");
CREATE INDEX "pricing_calculation_created_idx" ON "pricing_calculation"("created_at");
ALTER TABLE "pricing_calculation"
    ADD CONSTRAINT "pricing_calculation_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_calculation_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "quote_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_token" VARCHAR(64) NOT NULL,
    "calculation_id" UUID NOT NULL,
    "save_idempotency_key" VARCHAR(255) NOT NULL,
    "status" "pricing_calculation_status" NOT NULL,
    "catalog_version_id" UUID NOT NULL,
    "price_version_id" UUID,
    "source_version" VARCHAR(160),
    "configuration_snapshot" JSONB NOT NULL,
    "breakdown_snapshot" JSONB NOT NULL,
    "grand_total_minor" INTEGER,
    "correlation_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_snapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "quote_snapshot_total_check" CHECK ("grand_total_minor" IS NULL OR "grand_total_minor" >= 0),
    CONSTRAINT "quote_snapshot_json_check" CHECK (jsonb_typeof("configuration_snapshot") = 'object' AND jsonb_typeof("breakdown_snapshot") = 'object')
);
CREATE UNIQUE INDEX "quote_snapshot_public_token_key" ON "quote_snapshot"("public_token");
CREATE UNIQUE INDEX "quote_snapshot_calculation_key" ON "quote_snapshot"("calculation_id");
CREATE UNIQUE INDEX "quote_snapshot_save_idempotency_key" ON "quote_snapshot"("save_idempotency_key");
CREATE INDEX "quote_snapshot_created_idx" ON "quote_snapshot"("created_at");
ALTER TABLE "quote_snapshot"
    ADD CONSTRAINT "quote_snapshot_calculation_id_fkey" FOREIGN KEY ("calculation_id") REFERENCES "pricing_calculation"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "quote_snapshot_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "quote_snapshot_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "pricing_version_decision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_version_id" UUID NOT NULL,
    "action" "pricing_version_decision_action" NOT NULL,
    "actor_id" UUID NOT NULL,
    "before_state" JSONB NOT NULL,
    "after_state" JSONB NOT NULL,
    "safe_reason" VARCHAR(512) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pricing_version_decision_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pricing_version_decision_reason_check" CHECK (char_length(btrim("safe_reason")) BETWEEN 3 AND 512),
    CONSTRAINT "pricing_version_decision_json_check" CHECK (jsonb_typeof("before_state") = 'object' AND jsonb_typeof("after_state") = 'object')
);
CREATE UNIQUE INDEX "pricing_version_decision_idempotency_key" ON "pricing_version_decision"("idempotency_key");
CREATE INDEX "pricing_version_decision_version_time_idx" ON "pricing_version_decision"("price_version_id", "created_at");
ALTER TABLE "pricing_version_decision"
    ADD CONSTRAINT "pricing_version_decision_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT "pricing_version_decision_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "actor_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TRIGGER "pricing_rule_append_only" BEFORE UPDATE OR DELETE ON "pricing_rule" FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "pricing_parity_run_append_only" BEFORE UPDATE OR DELETE ON "pricing_parity_run" FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "pricing_calculation_append_only" BEFORE UPDATE OR DELETE ON "pricing_calculation" FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "quote_snapshot_append_only" BEFORE UPDATE OR DELETE ON "quote_snapshot" FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "pricing_version_decision_append_only" BEFORE UPDATE OR DELETE ON "pricing_version_decision" FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

COMMIT;
