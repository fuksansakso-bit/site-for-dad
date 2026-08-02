-- PLAN-1B1 migration risk: MEDIUM; create-only catalog source, normalized, version, and overlay schema.
-- Recovery: before shared pilot use restore the approved Foundation backup; after shared pilot use
-- a reviewed forward-compensation migration. This migration intentionally performs no destructive DDL.
BEGIN;

-- CreateEnum
CREATE TYPE "catalog_source_type" AS ENUM ('PARTNER_API', 'PARTNER_EXPORT', 'PARTNER_FILE', 'PARTNER_PORTAL', 'AUTHORIZED_PUBLIC_WEB', 'MANUAL_MANIFEST', 'FIXTURE');

-- CreateEnum
CREATE TYPE "supplier_relationship_status" AS ENUM ('AUTHORIZED_PARTNER_SOURCE', 'REVOKED');

-- CreateEnum
CREATE TYPE "source_snapshot_status" AS ENUM ('CAPTURED', 'NOT_MODIFIED', 'FAILED');

-- CreateEnum
CREATE TYPE "source_entity_type" AS ENUM ('CATEGORY', 'FAMILY', 'SYSTEM', 'MODEL', 'MATERIAL', 'MATERIAL_VARIANT', 'COLOR', 'PROPERTY', 'MEDIA', 'PRICE');

-- CreateEnum
CREATE TYPE "source_entity_status" AS ENUM ('ACTIVE', 'SOURCE_REMOVED', 'PARSE_ERROR');

-- CreateEnum
CREATE TYPE "catalog_sync_trigger" AS ENUM ('AUTOMATIC', 'MANUAL', 'TEST');

-- CreateEnum
CREATE TYPE "catalog_sync_status" AS ENUM ('QUEUED', 'DISCOVERING', 'CAPTURING', 'NORMALIZING', 'IMPORTING_MEDIA', 'BUILDING_DIFF', 'AWAITING_APPROVAL', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED');

-- CreateEnum
CREATE TYPE "catalog_sync_item_status" AS ENUM ('PENDING', 'UNCHANGED', 'CREATED', 'UPDATED', 'SOURCE_REMOVED', 'PARSE_ERROR', 'MEDIA_ERROR', 'FAILED');

-- CreateEnum
CREATE TYPE "catalog_difference_type" AS ENUM ('NEW_CATEGORY', 'NEW_SYSTEM', 'NEW_MODEL', 'NEW_MATERIAL', 'ARTICLE_CHANGED', 'COLOR_CHANGED', 'PROPERTY_CHANGED', 'NEW_MEDIA', 'PRICE_CHANGED', 'SOURCE_REMOVED', 'PARSE_ERROR');

-- CreateEnum
CREATE TYPE "catalog_difference_resolution" AS ENUM ('PENDING', 'KEEP', 'HIDE', 'ARCHIVE', 'REPLACE', 'RESTORE', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "catalog_version_status" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "catalog_entity_type" AS ENUM ('CATEGORY', 'SYSTEM', 'MATERIAL_VARIANT');

-- CreateEnum
CREATE TYPE "catalog_visibility" AS ENUM ('VISIBLE', 'HIDDEN');

-- CreateEnum
CREATE TYPE "availability_status" AS ENUM ('UNREVIEWED', 'AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY', 'HIDDEN');

-- CreateEnum
CREATE TYPE "publication_status" AS ENUM ('UNREVIEWED', 'DRAFT', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "manual_review_status" AS ENUM ('UNREVIEWED', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "media_asset_role" AS ENUM ('PRIMARY', 'DETAIL', 'SWATCH', 'SYSTEM');

-- CreateEnum
CREATE TYPE "media_rights_status" AS ENUM ('REFERENCE_ONLY', 'PERMISSION_PENDING', 'PARTNER_LICENSE', 'OWNER_CREATED', 'CLIENT_CONSENT', 'PUBLICATION_BLOCKED');

-- CreateEnum
CREATE TYPE "media_publication_status" AS ENUM ('PENDING', 'PUBLICATION_APPROVED', 'PUBLICATION_BLOCKED');

-- CreateEnum
CREATE TYPE "price_status" AS ENUM ('AVAILABLE', 'PRICE_ON_REQUEST');

-- CreateEnum
CREATE TYPE "price_record_kind" AS ENUM ('FROM', 'BASE');

-- CreateEnum
CREATE TYPE "price_version_status" AS ENUM ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "local_price_override_status" AS ENUM ('ACTIVE', 'REMOVED', 'SCHEDULED', 'EXPIRED');

-- CreateTable
CREATE TABLE "supplier" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(96) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_relationship" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "supplier_relationship_status" NOT NULL,
    "partner_name" VARCHAR(255) NOT NULL,
    "partner_region" VARCHAR(255),
    "partner_badge_asset_id" UUID,
    "permission_scope" JSONB NOT NULL,
    "permission_confirmed_by_owner" BOOLEAN NOT NULL,
    "permission_recorded_at" TIMESTAMPTZ(6) NOT NULL,
    "optional_evidence_reference" VARCHAR(512),
    "brand_usage_notes" TEXT,
    "effective_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_source" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "supplier_id" UUID NOT NULL,
    "supplier_relationship_id" UUID NOT NULL,
    "source_type" "catalog_source_type" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "base_url" VARCHAR(512) NOT NULL,
    "parser_version" VARCHAR(64) NOT NULL,
    "mapping_version" VARCHAR(64) NOT NULL,
    "maximum_concurrency" SMALLINT NOT NULL DEFAULT 1,
    "minimum_delay_ms" INTEGER NOT NULL DEFAULT 1000,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_checked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "sync_run_id" UUID NOT NULL,
    "source_entity_id" UUID,
    "source_url" VARCHAR(1024) NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "source_snapshot_status" NOT NULL,
    "http_status" SMALLINT,
    "content_hash" CHAR(64) NOT NULL,
    "safe_payload" JSONB NOT NULL,
    "parser_version" VARCHAR(64) NOT NULL,
    "mapping_version" VARCHAR(64) NOT NULL,
    "source_version" VARCHAR(160),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_entity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "source_type" "source_entity_type" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "source_slug" VARCHAR(255) NOT NULL,
    "source_url" VARCHAR(1024) NOT NULL,
    "source_category" VARCHAR(255),
    "source_hash" CHAR(64) NOT NULL,
    "source_captured_at" TIMESTAMPTZ(6) NOT NULL,
    "source_last_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "source_entity_status" NOT NULL DEFAULT 'ACTIVE',
    "safe_source_data" JSONB NOT NULL,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_run" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "trigger" "catalog_sync_trigger" NOT NULL,
    "status" "catalog_sync_status" NOT NULL DEFAULT 'QUEUED',
    "idempotency_key" VARCHAR(255) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "requested_by_actor_id" UUID,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "last_heartbeat_at" TIMESTAMPTZ(6),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "discovered_count" INTEGER NOT NULL DEFAULT 0,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "parser_version" VARCHAR(64) NOT NULL,
    "mapping_version" VARCHAR(64) NOT NULL,
    "source_version" VARCHAR(160),
    "error_code" VARCHAR(128),
    "audit_context" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_sync_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_run_id" UUID NOT NULL,
    "source_entity_id" UUID,
    "snapshot_id" UUID,
    "source_type" "source_entity_type" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "status" "catalog_sync_item_status" NOT NULL DEFAULT 'PENDING',
    "stage" VARCHAR(64) NOT NULL,
    "progress" SMALLINT NOT NULL DEFAULT 0,
    "before_hash" CHAR(64),
    "after_hash" CHAR(64),
    "error_code" VARCHAR(128),
    "safe_metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "catalog_sync_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_sync_difference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sync_run_id" UUID NOT NULL,
    "source_entity_id" UUID,
    "difference_key" VARCHAR(255) NOT NULL,
    "type" "catalog_difference_type" NOT NULL,
    "entity_type" "source_entity_type" NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "old_price_minor" INTEGER,
    "new_price_minor" INTEGER,
    "absolute_change_minor" INTEGER,
    "percentage_change" DECIMAL(9,4),
    "source_url" VARCHAR(1024),
    "source_captured_at" TIMESTAMPTZ(6),
    "resolution" "catalog_difference_resolution" NOT NULL DEFAULT 'PENDING',
    "resolved_by_actor_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "safe_resolution_comment" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_sync_difference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_number" INTEGER NOT NULL,
    "status" "catalog_version_status" NOT NULL DEFAULT 'DRAFT',
    "activation_key" VARCHAR(64),
    "sync_run_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "source_manifest" JSONB NOT NULL,
    "source_version" VARCHAR(160),
    "capture_checksum" CHAR(64) NOT NULL,
    "difference_checksum" CHAR(64) NOT NULL,
    "approved_by_actor_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "activated_by_actor_id" UUID,
    "activated_at" TIMESTAMPTZ(6),
    "predecessor_id" UUID,
    "rollback_target_id" UUID,
    "safe_notes" TEXT,

    CONSTRAINT "catalog_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_family" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "code" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "family_id" UUID NOT NULL,
    "parent_id" UUID,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_system" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "family_id" UUID NOT NULL,
    "category_id" UUID,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_system_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_model" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "system_id" UUID NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "family_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "slug" VARCHAR(128) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "normalized_hex" CHAR(7),
    "aliases" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_variant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,
    "color_id" UUID,
    "primary_system_id" UUID,
    "slug" VARCHAR(200) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "article" VARCHAR(128) NOT NULL,
    "width_mm" DECIMAL(10,2),
    "is_blackout" BOOLEAN NOT NULL DEFAULT false,
    "is_zebra" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "material_variant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_property" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "variant_id" UUID NOT NULL,
    "key" VARCHAR(96) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "value" VARCHAR(512) NOT NULL,
    "unit" VARCHAR(32),
    "source_owned" BOOLEAN NOT NULL DEFAULT true,
    "source_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "material_property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "file_hash" CHAR(64) NOT NULL,
    "storage_zone" VARCHAR(32) NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(128) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "rights_status" "media_rights_status" NOT NULL,
    "publication_status" "media_publication_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_media_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "source_entity_id" UUID NOT NULL,
    "material_variant_id" UUID NOT NULL,
    "media_asset_id" UUID,
    "source_type" "catalog_source_type" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "source_slug" VARCHAR(255) NOT NULL,
    "source_url" VARCHAR(1024) NOT NULL,
    "source_category" VARCHAR(255),
    "source_hash" CHAR(64) NOT NULL,
    "source_captured_at" TIMESTAMPTZ(6) NOT NULL,
    "source_last_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "role" "media_asset_role" NOT NULL,
    "content_type" VARCHAR(128),
    "content_length" INTEGER,
    "status" "source_entity_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "source_media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_media_asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "material_variant_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "source_media_asset_id" UUID,
    "role" "media_asset_role" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "material_media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compatibility_rule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "system_id" UUID NOT NULL,
    "model_id" UUID,
    "material_variant_id" UUID,
    "rule_type" VARCHAR(96) NOT NULL,
    "conditions" JSONB NOT NULL,
    "source_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compatibility_rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dimension_constraint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_entity_id" UUID,
    "system_id" UUID NOT NULL,
    "model_id" UUID,
    "material_variant_id" UUID,
    "dimension" VARCHAR(64) NOT NULL,
    "minimum_value" DECIMAL(12,3),
    "maximum_value" DECIMAL(12,3),
    "unit" VARCHAR(16) NOT NULL,
    "source_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dimension_constraint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "source_price_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_source_id" UUID NOT NULL,
    "source_entity_id" UUID NOT NULL,
    "material_variant_id" UUID NOT NULL,
    "source_type" "catalog_source_type" NOT NULL,
    "source_id" VARCHAR(255) NOT NULL,
    "source_slug" VARCHAR(255) NOT NULL,
    "source_url" VARCHAR(1024) NOT NULL,
    "source_category" VARCHAR(255),
    "source_hash" CHAR(64) NOT NULL,
    "source_captured_at" TIMESTAMPTZ(6) NOT NULL,
    "source_last_verified_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "price_status" NOT NULL,
    "kind" "price_record_kind" NOT NULL DEFAULT 'FROM',
    "amount_minor" INTEGER,
    "currency" CHAR(3) NOT NULL,
    "source_price_category" VARCHAR(64),
    "source_context" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_price_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_version" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "version_number" INTEGER NOT NULL,
    "status" "price_version_status" NOT NULL DEFAULT 'DRAFT',
    "activation_key" VARCHAR(64),
    "sync_run_id" UUID NOT NULL,
    "source_manifest" JSONB NOT NULL,
    "difference_checksum" CHAR(64) NOT NULL,
    "approved_by_actor_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "activated_by_actor_id" UUID,
    "activated_at" TIMESTAMPTZ(6),
    "predecessor_id" UUID,
    "rollback_target_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_version_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "price_version_id" UUID NOT NULL,
    "source_price_record_id" UUID NOT NULL,

    CONSTRAINT "price_version_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_catalog_entry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" "catalog_entity_type" NOT NULL,
    "category_id" UUID,
    "system_id" UUID,
    "material_variant_id" UUID,
    "visibility" "catalog_visibility" NOT NULL DEFAULT 'HIDDEN',
    "local_description" TEXT,
    "local_order" INTEGER NOT NULL DEFAULT 0,
    "manual_review_state" "manual_review_status" NOT NULL DEFAULT 'UNREVIEWED',
    "owner_notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "business_catalog_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_catalog_entry_id" UUID NOT NULL,
    "status" "availability_status" NOT NULL,
    "reason" VARCHAR(512),
    "decided_by_actor_id" UUID,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local_price_override" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_catalog_entry_id" UUID NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "local_price_override_status" NOT NULL DEFAULT 'ACTIVE',
    "reason" VARCHAR(512) NOT NULL,
    "decided_by_actor_id" UUID,
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "local_price_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "business_catalog_entry_id" UUID NOT NULL,
    "status" "publication_status" NOT NULL,
    "reason" VARCHAR(512),
    "decided_by_actor_id" UUID,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_version_entry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "catalog_version_id" UUID NOT NULL,
    "business_catalog_entry_id" UUID NOT NULL,
    "publication_record_id" UUID NOT NULL,
    "availability_record_id" UUID NOT NULL,
    "local_price_override_id" UUID,
    "source_price_record_id" UUID,
    "primary_media_asset_id" UUID,
    "source_entity_hash" CHAR(64) NOT NULL,
    "overlay_hash" CHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_version_entry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_slug_key" ON "supplier"("slug");
-- CreateIndex
CREATE INDEX "supplier_relationship_status_idx" ON "supplier_relationship"("supplier_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_relationship_supplier_version_key" ON "supplier_relationship"("supplier_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_source_identity_key" ON "catalog_source"("supplier_id", "source_type", "name");

-- CreateIndex
CREATE INDEX "catalog_source_relationship_idx" ON "catalog_source"("supplier_relationship_id");

-- CreateIndex
CREATE INDEX "source_snapshot_source_time_idx" ON "source_snapshot"("catalog_source_id", "captured_at");

-- CreateIndex
CREATE INDEX "source_snapshot_hash_idx" ON "source_snapshot"("content_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_snapshot_run_url_key" ON "source_snapshot"("sync_run_id", "source_url");

-- CreateIndex
CREATE INDEX "source_entity_status_idx" ON "source_entity"("catalog_source_id", "status");

-- CreateIndex
CREATE INDEX "source_entity_hash_idx" ON "source_entity"("source_hash");

-- CreateIndex
CREATE UNIQUE INDEX "source_entity_stable_identity_key" ON "source_entity"("catalog_source_id", "source_type", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sync_run_idempotency_key" ON "catalog_sync_run"("idempotency_key");

-- CreateIndex
CREATE INDEX "catalog_sync_run_source_time_idx" ON "catalog_sync_run"("catalog_source_id", "created_at");

-- CreateIndex
CREATE INDEX "catalog_sync_run_status_idx" ON "catalog_sync_run"("status", "created_at");

-- CreateIndex
CREATE INDEX "catalog_sync_item_status_idx" ON "catalog_sync_item"("sync_run_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sync_item_run_identity_key" ON "catalog_sync_item"("sync_run_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "catalog_sync_difference_review_idx" ON "catalog_sync_difference"("sync_run_id", "type", "resolution");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_sync_difference_run_key" ON "catalog_sync_difference"("sync_run_id", "difference_key");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_version_number_key" ON "catalog_version"("version_number");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_version_activation_key" ON "catalog_version"("activation_key");

-- CreateIndex
CREATE INDEX "catalog_version_status_idx" ON "catalog_version"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_family_source_entity_key" ON "product_family"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_family_code_key" ON "product_family"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_family_slug_key" ON "product_family"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_source_entity_key" ON "product_category"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_category_slug_key" ON "product_category"("slug");

-- CreateIndex
CREATE INDEX "product_category_family_order_idx" ON "product_category"("family_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_system_source_entity_key" ON "product_system"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_system_slug_key" ON "product_system"("slug");

-- CreateIndex
CREATE INDEX "product_system_family_order_idx" ON "product_system"("family_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_model_source_entity_key" ON "product_model"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_model_slug_key" ON "product_model"("slug");

-- CreateIndex
CREATE INDEX "product_model_system_idx" ON "product_model"("system_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_slug_key" ON "material"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "material_source_entity_key" ON "material"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_category_name_key" ON "material"("category_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "color_slug_key" ON "color"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "color_source_entity_key" ON "color"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_variant_source_entity_key" ON "material_variant"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_variant_slug_key" ON "material_variant"("slug");

-- CreateIndex
CREATE INDEX "material_variant_color_idx" ON "material_variant"("color_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_variant_material_article_key" ON "material_variant"("material_id", "article");

-- CreateIndex
CREATE UNIQUE INDEX "material_property_variant_key" ON "material_property"("variant_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "material_property_source_entity_key" ON "material_property"("source_entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_file_hash_key" ON "media_asset"("file_hash");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_object_key_key" ON "media_asset"("object_key");

-- CreateIndex
CREATE INDEX "media_asset_publication_idx" ON "media_asset"("publication_status");

-- CreateIndex
CREATE INDEX "source_media_asset_variant_role_idx" ON "source_media_asset"("material_variant_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "source_media_asset_identity_key" ON "source_media_asset"("catalog_source_id", "source_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_media_source_asset_key" ON "material_media_asset"("source_media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "material_media_variant_role_order_key" ON "material_media_asset"("material_variant_id", "role", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "compatibility_rule_source_entity_key" ON "compatibility_rule"("source_entity_id");

-- CreateIndex
CREATE INDEX "compatibility_rule_lookup_idx" ON "compatibility_rule"("system_id", "material_variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "dimension_constraint_source_entity_key" ON "dimension_constraint"("source_entity_id");

-- CreateIndex
CREATE INDEX "dimension_constraint_lookup_idx" ON "dimension_constraint"("system_id", "dimension");

-- CreateIndex
CREATE INDEX "source_price_record_variant_time_idx" ON "source_price_record"("material_variant_id", "source_captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "source_price_record_version_key" ON "source_price_record"("catalog_source_id", "source_id", "source_hash");

-- CreateIndex
CREATE UNIQUE INDEX "price_version_number_key" ON "price_version"("version_number");

-- CreateIndex
CREATE UNIQUE INDEX "price_version_activation_key" ON "price_version"("activation_key");

-- CreateIndex
CREATE INDEX "price_version_status_idx" ON "price_version"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "price_version_record_key" ON "price_version_record"("price_version_id", "source_price_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_catalog_entry_category_key" ON "business_catalog_entry"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_catalog_entry_system_key" ON "business_catalog_entry"("system_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_catalog_entry_variant_key" ON "business_catalog_entry"("material_variant_id");

-- CreateIndex
CREATE INDEX "business_catalog_entry_visibility_idx" ON "business_catalog_entry"("entity_type", "visibility");

-- CreateIndex
CREATE INDEX "availability_record_entry_time_idx" ON "availability_record"("business_catalog_entry_id", "effective_at");

-- CreateIndex
CREATE INDEX "local_price_override_active_idx" ON "local_price_override"("business_catalog_entry_id", "status", "effective_from");

-- CreateIndex
CREATE INDEX "publication_record_entry_time_idx" ON "publication_record"("business_catalog_entry_id", "effective_at");

-- CreateIndex
CREATE INDEX "catalog_version_entry_publication_idx" ON "catalog_version_entry"("catalog_version_id", "publication_record_id");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_version_entry_key" ON "catalog_version_entry"("catalog_version_id", "business_catalog_entry_id");

-- AddForeignKey
ALTER TABLE "supplier_relationship" ADD CONSTRAINT "supplier_relationship_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_relationship" ADD CONSTRAINT "supplier_relationship_partner_badge_asset_id_fkey" FOREIGN KEY ("partner_badge_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_source" ADD CONSTRAINT "catalog_source_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_source" ADD CONSTRAINT "catalog_source_supplier_relationship_id_fkey" FOREIGN KEY ("supplier_relationship_id") REFERENCES "supplier_relationship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_snapshot" ADD CONSTRAINT "source_snapshot_catalog_source_id_fkey" FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_snapshot" ADD CONSTRAINT "source_snapshot_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_snapshot" ADD CONSTRAINT "source_snapshot_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_entity" ADD CONSTRAINT "source_entity_catalog_source_id_fkey" FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_run" ADD CONSTRAINT "catalog_sync_run_catalog_source_id_fkey" FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_item" ADD CONSTRAINT "catalog_sync_item_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_item" ADD CONSTRAINT "catalog_sync_item_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_item" ADD CONSTRAINT "catalog_sync_item_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "source_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_difference" ADD CONSTRAINT "catalog_sync_difference_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_sync_difference" ADD CONSTRAINT "catalog_sync_difference_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version" ADD CONSTRAINT "catalog_version_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version" ADD CONSTRAINT "catalog_version_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version" ADD CONSTRAINT "catalog_version_rollback_target_id_fkey" FOREIGN KEY ("rollback_target_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_family" ADD CONSTRAINT "product_family_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_system" ADD CONSTRAINT "product_system_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_system" ADD CONSTRAINT "product_system_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_system" ADD CONSTRAINT "product_system_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_model" ADD CONSTRAINT "product_model_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_model" ADD CONSTRAINT "product_model_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "product_family"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material" ADD CONSTRAINT "material_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "color" ADD CONSTRAINT "color_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_variant" ADD CONSTRAINT "material_variant_primary_system_id_fkey" FOREIGN KEY ("primary_system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_property" ADD CONSTRAINT "material_property_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_property" ADD CONSTRAINT "material_property_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_media_asset" ADD CONSTRAINT "source_media_asset_catalog_source_id_fkey" FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_media_asset" ADD CONSTRAINT "source_media_asset_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_media_asset" ADD CONSTRAINT "source_media_asset_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_media_asset" ADD CONSTRAINT "source_media_asset_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_media_asset" ADD CONSTRAINT "material_media_asset_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_media_asset" ADD CONSTRAINT "material_media_asset_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_media_asset" ADD CONSTRAINT "material_media_asset_source_media_asset_id_fkey" FOREIGN KEY ("source_media_asset_id") REFERENCES "source_media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_rule" ADD CONSTRAINT "compatibility_rule_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_rule" ADD CONSTRAINT "compatibility_rule_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_rule" ADD CONSTRAINT "compatibility_rule_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "product_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compatibility_rule" ADD CONSTRAINT "compatibility_rule_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_constraint" ADD CONSTRAINT "dimension_constraint_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_constraint" ADD CONSTRAINT "dimension_constraint_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_constraint" ADD CONSTRAINT "dimension_constraint_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "product_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dimension_constraint" ADD CONSTRAINT "dimension_constraint_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_price_record" ADD CONSTRAINT "source_price_record_catalog_source_id_fkey" FOREIGN KEY ("catalog_source_id") REFERENCES "catalog_source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_price_record" ADD CONSTRAINT "source_price_record_source_entity_id_fkey" FOREIGN KEY ("source_entity_id") REFERENCES "source_entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_price_record" ADD CONSTRAINT "source_price_record_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_version" ADD CONSTRAINT "price_version_sync_run_id_fkey" FOREIGN KEY ("sync_run_id") REFERENCES "catalog_sync_run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_version" ADD CONSTRAINT "price_version_predecessor_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_version" ADD CONSTRAINT "price_version_rollback_target_id_fkey" FOREIGN KEY ("rollback_target_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_version_record" ADD CONSTRAINT "price_version_record_price_version_id_fkey" FOREIGN KEY ("price_version_id") REFERENCES "price_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_version_record" ADD CONSTRAINT "price_version_record_source_price_record_id_fkey" FOREIGN KEY ("source_price_record_id") REFERENCES "source_price_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_catalog_entry" ADD CONSTRAINT "business_catalog_entry_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_catalog_entry" ADD CONSTRAINT "business_catalog_entry_system_id_fkey" FOREIGN KEY ("system_id") REFERENCES "product_system"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_catalog_entry" ADD CONSTRAINT "business_catalog_entry_material_variant_id_fkey" FOREIGN KEY ("material_variant_id") REFERENCES "material_variant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_record" ADD CONSTRAINT "availability_record_business_catalog_entry_id_fkey" FOREIGN KEY ("business_catalog_entry_id") REFERENCES "business_catalog_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local_price_override" ADD CONSTRAINT "local_price_override_business_catalog_entry_id_fkey" FOREIGN KEY ("business_catalog_entry_id") REFERENCES "business_catalog_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_record" ADD CONSTRAINT "publication_record_business_catalog_entry_id_fkey" FOREIGN KEY ("business_catalog_entry_id") REFERENCES "business_catalog_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_catalog_version_id_fkey" FOREIGN KEY ("catalog_version_id") REFERENCES "catalog_version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_business_catalog_entry_id_fkey" FOREIGN KEY ("business_catalog_entry_id") REFERENCES "business_catalog_entry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_publication_record_id_fkey" FOREIGN KEY ("publication_record_id") REFERENCES "publication_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_availability_record_id_fkey" FOREIGN KEY ("availability_record_id") REFERENCES "availability_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_local_price_override_id_fkey" FOREIGN KEY ("local_price_override_id") REFERENCES "local_price_override"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_source_price_record_id_fkey" FOREIGN KEY ("source_price_record_id") REFERENCES "source_price_record"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_version_entry" ADD CONSTRAINT "catalog_version_entry_primary_media_asset_id_fkey" FOREIGN KEY ("primary_media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Source capture and synchronization safety invariants.
ALTER TABLE "supplier_relationship"
    ADD CONSTRAINT "supplier_relationship_authority_check" CHECK (
        ("status" = 'AUTHORIZED_PARTNER_SOURCE'
            AND "permission_confirmed_by_owner"
            AND "revoked_at" IS NULL)
        OR ("status" = 'REVOKED' AND "revoked_at" IS NOT NULL)
    ),
    ADD CONSTRAINT "supplier_relationship_effective_time_check"
        CHECK ("revoked_at" IS NULL OR "revoked_at" >= "effective_at");

ALTER TABLE "catalog_source"
    ADD CONSTRAINT "catalog_source_concurrency_check"
        CHECK ("maximum_concurrency" BETWEEN 1 AND 16),
    ADD CONSTRAINT "catalog_source_delay_check" CHECK ("minimum_delay_ms" >= 0);

ALTER TABLE "source_snapshot"
    ADD CONSTRAINT "source_snapshot_http_status_check"
        CHECK ("http_status" IS NULL OR "http_status" BETWEEN 100 AND 599),
    ADD CONSTRAINT "source_snapshot_hash_check"
        CHECK ("content_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "source_entity"
    ADD CONSTRAINT "source_entity_hash_check"
        CHECK ("source_hash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "source_entity_verification_time_check"
        CHECK ("source_last_verified_at" >= "source_captured_at"),
    ADD CONSTRAINT "source_entity_removal_check" CHECK (
        ("status" = 'SOURCE_REMOVED' AND "removed_at" IS NOT NULL)
        OR ("status" <> 'SOURCE_REMOVED' AND "removed_at" IS NULL)
    );

ALTER TABLE "catalog_sync_run"
    ADD CONSTRAINT "catalog_sync_run_attempt_check" CHECK ("attempt" >= 0),
    ADD CONSTRAINT "catalog_sync_run_counts_check" CHECK (
        "discovered_count" >= 0
        AND "processed_count" >= 0
        AND "error_count" >= 0
        AND "processed_count" <= "discovered_count"
    ),
    ADD CONSTRAINT "catalog_sync_run_time_check"
        CHECK ("completed_at" IS NULL OR "started_at" IS NOT NULL
            AND "completed_at" >= "started_at");

ALTER TABLE "catalog_sync_item"
    ADD CONSTRAINT "catalog_sync_item_progress_check" CHECK ("progress" BETWEEN 0 AND 100);

ALTER TABLE "catalog_sync_difference"
    ADD CONSTRAINT "catalog_sync_difference_resolution_check" CHECK (
        ("resolution" = 'PENDING' AND "resolved_at" IS NULL)
        OR ("resolution" <> 'PENDING' AND "resolved_at" IS NOT NULL)
    );

-- Version activation remains explicit and owner/admin-controlled in application policy.
ALTER TABLE "catalog_version"
    ADD CONSTRAINT "catalog_version_number_check" CHECK ("version_number" > 0),
    ADD CONSTRAINT "catalog_version_hashes_check" CHECK (
        "capture_checksum" ~ '^[0-9a-f]{64}$'
        AND "difference_checksum" ~ '^[0-9a-f]{64}$'
    ),
    ADD CONSTRAINT "catalog_version_approval_check" CHECK (
        "status" NOT IN ('APPROVED', 'ACTIVE', 'SUPERSEDED')
        OR ("approved_by_actor_id" IS NOT NULL AND "approved_at" IS NOT NULL)
    ),
    ADD CONSTRAINT "catalog_version_activation_check" CHECK (
        ("status" = 'ACTIVE'
            AND "activation_key" = 'PUBLIC'
            AND "activated_by_actor_id" IS NOT NULL
            AND "activated_at" IS NOT NULL)
        OR ("status" <> 'ACTIVE' AND "activation_key" IS NULL)
    );

ALTER TABLE "price_version"
    ADD CONSTRAINT "price_version_number_check" CHECK ("version_number" > 0),
    ADD CONSTRAINT "price_version_hash_check"
        CHECK ("difference_checksum" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "price_version_approval_check" CHECK (
        "status" NOT IN ('APPROVED', 'ACTIVE', 'SUPERSEDED')
        OR ("approved_by_actor_id" IS NOT NULL AND "approved_at" IS NOT NULL)
    ),
    ADD CONSTRAINT "price_version_activation_check" CHECK (
        ("status" = 'ACTIVE'
            AND "activation_key" = 'PUBLIC'
            AND "activated_by_actor_id" IS NOT NULL
            AND "activated_at" IS NOT NULL)
        OR ("status" <> 'ACTIVE' AND "activation_key" IS NULL)
    );

-- Normalized catalog invariants.
ALTER TABLE "color"
    ADD CONSTRAINT "color_hex_check"
        CHECK ("normalized_hex" IS NULL OR "normalized_hex" ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE "material_variant"
    ADD CONSTRAINT "material_variant_width_check"
        CHECK ("width_mm" IS NULL OR "width_mm" > 0);

ALTER TABLE "material_property"
    ADD CONSTRAINT "material_property_hash_check"
        CHECK ("source_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "media_asset"
    ADD CONSTRAINT "media_asset_hash_check"
        CHECK ("file_hash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "media_asset_dimensions_check"
        CHECK ("byte_size" > 0 AND "width" > 0 AND "height" > 0);

ALTER TABLE "source_media_asset"
    ADD CONSTRAINT "source_media_asset_hash_check"
        CHECK ("source_hash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "source_media_asset_verification_time_check"
        CHECK ("source_last_verified_at" >= "source_captured_at"),
    ADD CONSTRAINT "source_media_asset_content_length_check"
        CHECK ("content_length" IS NULL OR "content_length" > 0);

ALTER TABLE "dimension_constraint"
    ADD CONSTRAINT "dimension_constraint_range_check" CHECK (
        ("minimum_value" IS NULL OR "minimum_value" > 0)
        AND ("maximum_value" IS NULL OR "maximum_value" > 0)
        AND ("minimum_value" IS NULL OR "maximum_value" IS NULL
            OR "minimum_value" <= "maximum_value")
    );

ALTER TABLE "source_price_record"
    ADD CONSTRAINT "source_price_record_hash_check"
        CHECK ("source_hash" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "source_price_record_verification_time_check"
        CHECK ("source_last_verified_at" >= "source_captured_at"),
    ADD CONSTRAINT "source_price_record_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT "source_price_record_value_check" CHECK (
        ("status" = 'AVAILABLE' AND "amount_minor" IS NOT NULL AND "amount_minor" > 0)
        OR ("status" = 'PRICE_ON_REQUEST' AND "amount_minor" IS NULL)
    );

-- A business overlay targets exactly one normalized entity and never replaces source-owned data.
ALTER TABLE "business_catalog_entry"
    ADD CONSTRAINT "business_catalog_entry_target_check" CHECK (
        ("entity_type" = 'CATEGORY'
            AND "category_id" IS NOT NULL
            AND "system_id" IS NULL
            AND "material_variant_id" IS NULL)
        OR ("entity_type" = 'SYSTEM'
            AND "category_id" IS NULL
            AND "system_id" IS NOT NULL
            AND "material_variant_id" IS NULL)
        OR ("entity_type" = 'MATERIAL_VARIANT'
            AND "category_id" IS NULL
            AND "system_id" IS NULL
            AND "material_variant_id" IS NOT NULL)
    );

ALTER TABLE "availability_record"
    ADD CONSTRAINT "availability_record_time_check"
        CHECK ("ended_at" IS NULL OR "ended_at" >= "effective_at");

ALTER TABLE "local_price_override"
    ADD CONSTRAINT "local_price_override_amount_check" CHECK ("amount_minor" > 0),
    ADD CONSTRAINT "local_price_override_currency_check"
        CHECK ("currency" ~ '^[A-Z]{3}$'),
    ADD CONSTRAINT "local_price_override_time_check"
        CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from"),
    ADD CONSTRAINT "local_price_override_removal_check" CHECK (
        ("status" = 'REMOVED' AND "removed_at" IS NOT NULL)
        OR ("status" <> 'REMOVED' AND "removed_at" IS NULL)
    );

ALTER TABLE "publication_record"
    ADD CONSTRAINT "publication_record_time_check"
        CHECK ("ended_at" IS NULL OR "ended_at" >= "effective_at");

ALTER TABLE "catalog_version_entry"
    ADD CONSTRAINT "catalog_version_entry_hashes_check" CHECK (
        "source_entity_hash" ~ '^[0-9a-f]{64}$'
        AND "overlay_hash" ~ '^[0-9a-f]{64}$'
    );

-- Captured source facts and membership of approved versions are append-only.
CREATE FUNCTION prevent_catalog_immutable_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "source_snapshot_append_only"
    BEFORE UPDATE OR DELETE ON "source_snapshot"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "source_price_record_append_only"
    BEFORE UPDATE OR DELETE ON "source_price_record"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "price_version_record_append_only"
    BEFORE UPDATE OR DELETE ON "price_version_record"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();
CREATE TRIGGER "catalog_version_entry_append_only"
    BEFORE UPDATE OR DELETE ON "catalog_version_entry"
    FOR EACH ROW EXECUTE FUNCTION prevent_catalog_immutable_mutation();

COMMIT;
