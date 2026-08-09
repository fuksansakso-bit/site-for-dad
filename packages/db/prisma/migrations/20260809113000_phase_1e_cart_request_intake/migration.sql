-- Phase 1E migration risk: MEDIUM. Adds guest-cart/request intake records and no destructive catalog/price/media operation.
-- Forward compensation disables new routes, revokes public references and preserves immutable request/audit/outbox history.

BEGIN;

-- CreateEnum
CREATE TYPE "guest_cart_status" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'EXPIRED');

-- CreateEnum
CREATE TYPE "cart_item_revision_action" AS ENUM ('ADDED', 'REPLACED', 'DUPLICATED', 'REMOVED', 'CLEARED');

-- CreateEnum
CREATE TYPE "cart_pricing_status" AS ENUM ('FULLY_PRICED', 'PARTIALLY_PRICED', 'PRICE_ON_REQUEST');

-- CreateEnum
CREATE TYPE "order_inquiry_status" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "request_communication_event_type" AS ENUM ('REQUEST_CREATED', 'WHATSAPP_LINK_GENERATED', 'WHATSAPP_LINK_OPENED', 'MESSAGE_COPIED', 'STATUS_CHANGED');

-- CreateEnum
CREATE TYPE "request_source_channel" AS ENUM ('WEB_GUEST');

-- CreateTable
CREATE TABLE "guest_cart_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_cart_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_cart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "status" "guest_cart_status" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "checked_out_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "guest_cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "public_reference" VARCHAR(32) NOT NULL,
    "cart_id" UUID NOT NULL,
    "quote_snapshot_id" UUID NOT NULL,
    "preview_state_id" UUID,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "removed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item_revision" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cart_item_id" UUID NOT NULL,
    "action" "cart_item_revision_action" NOT NULL,
    "previous_quote_snapshot_id" UUID,
    "next_quote_snapshot_id" UUID,
    "previous_preview_state_id" UUID,
    "next_preview_state_id" UUID,
    "item_revision" INTEGER NOT NULL,
    "cart_revision" INTEGER NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_item_revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_inquiry" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_number" VARCHAR(32) NOT NULL,
    "guest_session_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "checkout_idempotency_key" VARCHAR(255) NOT NULL,
    "public_reference_hash" CHAR(64) NOT NULL,
    "public_reference_revoked_at" TIMESTAMPTZ(6),
    "contact_name" VARCHAR(120) NOT NULL,
    "contact_phone" VARCHAR(32) NOT NULL,
    "locality" VARCHAR(160) NOT NULL,
    "address" VARCHAR(500),
    "comment" VARCHAR(1000),
    "measurement_requested" BOOLEAN NOT NULL DEFAULT false,
    "installment_interest" BOOLEAN NOT NULL DEFAULT false,
    "consent_version" VARCHAR(64) NOT NULL,
    "consent_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "order_inquiry_status" NOT NULL DEFAULT 'NEW',
    "cart_snapshot" JSONB NOT NULL,
    "known_subtotal_minor" INTEGER NOT NULL,
    "pricing_status" "cart_pricing_status" NOT NULL,
    "catalog_version_ids" JSONB NOT NULL,
    "price_version_ids" JSONB NOT NULL,
    "source_channel" "request_source_channel" NOT NULL DEFAULT 'WEB_GUEST',
    "correlation_id" VARCHAR(128) NOT NULL,
    "audit_context" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "order_inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_item_snapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "quote_snapshot_id" UUID NOT NULL,
    "preview_state_id" UUID,
    "snapshot" JSONB NOT NULL,
    "pricing_status" "pricing_calculation_status" NOT NULL,
    "known_total_minor" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_item_snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_communication_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "type" "request_communication_event_type" NOT NULL,
    "actor_type" "audit_actor_type" NOT NULL,
    "actor_identity_id" UUID,
    "safe_metadata" JSONB NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_communication_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_internal_note" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "inquiry_id" UUID NOT NULL,
    "author_actor_id" UUID NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_internal_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "guest_cart_session_token_hash_key" ON "guest_cart_session"("token_hash");

ALTER TABLE "guest_cart_session"
  ADD CONSTRAINT "guest_cart_session_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "guest_cart_session_expiry_check" CHECK ("expires_at" > "created_at");

-- CreateIndex
CREATE INDEX "guest_cart_session_expiry_idx" ON "guest_cart_session"("expires_at");

-- CreateIndex
CREATE INDEX "guest_cart_session_status_idx" ON "guest_cart"("session_id", "status", "updated_at");

CREATE UNIQUE INDEX "guest_cart_one_active_per_session_key"
  ON "guest_cart"("session_id") WHERE "status" = 'ACTIVE';

ALTER TABLE "guest_cart"
  ADD CONSTRAINT "guest_cart_revision_check" CHECK ("revision" >= 0),
  ADD CONSTRAINT "guest_cart_checkout_state_check" CHECK (
    ("status" = 'CHECKED_OUT' AND "checked_out_at" IS NOT NULL)
    OR ("status" <> 'CHECKED_OUT' AND "checked_out_at" IS NULL)
  );

-- CreateIndex
CREATE INDEX "guest_cart_expiry_idx" ON "guest_cart"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_public_reference_key" ON "cart_item"("public_reference");

ALTER TABLE "cart_item"
  ADD CONSTRAINT "cart_item_public_reference_check" CHECK ("public_reference" ~ '^[A-Za-z0-9_-]{32}$'),
  ADD CONSTRAINT "cart_item_revision_check" CHECK ("revision" > 0),
  ADD CONSTRAINT "cart_item_position_check" CHECK ("position" >= 0);

-- CreateIndex
CREATE INDEX "cart_item_active_position_idx" ON "cart_item"("cart_id", "removed_at", "position");

-- CreateIndex
CREATE INDEX "cart_item_quote_idx" ON "cart_item"("quote_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_revision_idempotency_key" ON "cart_item_revision"("idempotency_key");

ALTER TABLE "cart_item_revision"
  ADD CONSTRAINT "cart_item_revision_versions_check" CHECK ("item_revision" > 0 AND "cart_revision" > 0);

-- CreateIndex
CREATE INDEX "cart_item_revision_item_idx" ON "cart_item_revision"("cart_item_id", "item_revision");

-- CreateIndex
CREATE UNIQUE INDEX "order_inquiry_request_number_key" ON "order_inquiry"("request_number");

-- CreateIndex
CREATE UNIQUE INDEX "order_inquiry_cart_key" ON "order_inquiry"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_inquiry_checkout_idempotency_key" ON "order_inquiry"("checkout_idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "order_inquiry_public_reference_hash_key" ON "order_inquiry"("public_reference_hash");

ALTER TABLE "order_inquiry"
  ADD CONSTRAINT "order_inquiry_request_number_check" CHECK ("request_number" ~ '^REQ-[0-9]{6}-[A-Z2-9]{8}$'),
  ADD CONSTRAINT "order_inquiry_public_reference_hash_check" CHECK ("public_reference_hash" ~ '^[0-9a-f]{64}$'),
  ADD CONSTRAINT "order_inquiry_contact_phone_check" CHECK ("contact_phone" ~ '^\+[1-9][0-9]{7,14}$'),
  ADD CONSTRAINT "order_inquiry_known_subtotal_check" CHECK ("known_subtotal_minor" >= 0),
  ADD CONSTRAINT "order_inquiry_version_check" CHECK ("version" > 0);

-- CreateIndex
CREATE INDEX "order_inquiry_status_created_idx" ON "order_inquiry"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_inquiry_guest_created_idx" ON "order_inquiry"("guest_session_id", "created_at");

-- CreateIndex
CREATE INDEX "request_item_snapshot_quote_idx" ON "request_item_snapshot"("quote_snapshot_id");

-- CreateIndex
CREATE UNIQUE INDEX "request_item_snapshot_sequence_key" ON "request_item_snapshot"("inquiry_id", "sequence");

ALTER TABLE "request_item_snapshot"
  ADD CONSTRAINT "request_item_snapshot_sequence_check" CHECK ("sequence" > 0),
  ADD CONSTRAINT "request_item_snapshot_amount_check" CHECK (
    ("pricing_status" IN ('CALCULATED', 'SOURCE_DATA_STALE') AND "known_total_minor" IS NOT NULL AND "known_total_minor" >= 0)
    OR ("pricing_status" NOT IN ('CALCULATED', 'SOURCE_DATA_STALE') AND "known_total_minor" IS NULL)
  );

-- CreateIndex
CREATE INDEX "request_communication_event_inquiry_idx" ON "request_communication_event"("inquiry_id", "created_at");

-- CreateIndex
CREATE INDEX "request_internal_note_inquiry_idx" ON "request_internal_note"("inquiry_id", "created_at");

ALTER TABLE "request_internal_note"
  ADD CONSTRAINT "request_internal_note_body_check" CHECK (length(btrim("body")) BETWEEN 1 AND 1000);

-- AddForeignKey
ALTER TABLE "guest_cart" ADD CONSTRAINT "guest_cart_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "guest_cart_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "guest_cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_quote_snapshot_id_fkey" FOREIGN KEY ("quote_snapshot_id") REFERENCES "quote_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_preview_state_id_fkey" FOREIGN KEY ("preview_state_id") REFERENCES "standard_preview_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_revision" ADD CONSTRAINT "cart_item_revision_cart_item_id_fkey" FOREIGN KEY ("cart_item_id") REFERENCES "cart_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_revision" ADD CONSTRAINT "cart_item_revision_previous_quote_snapshot_id_fkey" FOREIGN KEY ("previous_quote_snapshot_id") REFERENCES "quote_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_revision" ADD CONSTRAINT "cart_item_revision_next_quote_snapshot_id_fkey" FOREIGN KEY ("next_quote_snapshot_id") REFERENCES "quote_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_revision" ADD CONSTRAINT "cart_item_revision_previous_preview_state_id_fkey" FOREIGN KEY ("previous_preview_state_id") REFERENCES "standard_preview_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item_revision" ADD CONSTRAINT "cart_item_revision_next_preview_state_id_fkey" FOREIGN KEY ("next_preview_state_id") REFERENCES "standard_preview_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inquiry" ADD CONSTRAINT "order_inquiry_guest_session_id_fkey" FOREIGN KEY ("guest_session_id") REFERENCES "guest_cart_session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inquiry" ADD CONSTRAINT "order_inquiry_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "guest_cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_item_snapshot" ADD CONSTRAINT "request_item_snapshot_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "order_inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_item_snapshot" ADD CONSTRAINT "request_item_snapshot_quote_snapshot_id_fkey" FOREIGN KEY ("quote_snapshot_id") REFERENCES "quote_snapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_item_snapshot" ADD CONSTRAINT "request_item_snapshot_preview_state_id_fkey" FOREIGN KEY ("preview_state_id") REFERENCES "standard_preview_state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_communication_event" ADD CONSTRAINT "request_communication_event_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "order_inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_communication_event" ADD CONSTRAINT "request_communication_event_actor_identity_id_fkey" FOREIGN KEY ("actor_identity_id") REFERENCES "actor_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_internal_note" ADD CONSTRAINT "request_internal_note_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "order_inquiry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_internal_note" ADD CONSTRAINT "request_internal_note_author_actor_id_fkey" FOREIGN KEY ("author_actor_id") REFERENCES "actor_identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_request_item_snapshot_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'REQUEST_ITEM_SNAPSHOT_IMMUTABLE' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER request_item_snapshot_immutable
BEFORE UPDATE OR DELETE ON "request_item_snapshot"
FOR EACH ROW EXECUTE FUNCTION reject_request_item_snapshot_mutation();

CREATE FUNCTION protect_order_inquiry_snapshot() RETURNS trigger AS $$
BEGIN
  IF ROW(
    NEW."request_number", NEW."guest_session_id", NEW."cart_id", NEW."checkout_idempotency_key",
    NEW."public_reference_hash", NEW."contact_name", NEW."contact_phone", NEW."locality",
    NEW."address", NEW."comment", NEW."measurement_requested", NEW."installment_interest",
    NEW."consent_version", NEW."consent_at", NEW."cart_snapshot", NEW."known_subtotal_minor",
    NEW."pricing_status", NEW."catalog_version_ids", NEW."price_version_ids", NEW."source_channel",
    NEW."correlation_id", NEW."audit_context", NEW."created_at"
  ) IS DISTINCT FROM ROW(
    OLD."request_number", OLD."guest_session_id", OLD."cart_id", OLD."checkout_idempotency_key",
    OLD."public_reference_hash", OLD."contact_name", OLD."contact_phone", OLD."locality",
    OLD."address", OLD."comment", OLD."measurement_requested", OLD."installment_interest",
    OLD."consent_version", OLD."consent_at", OLD."cart_snapshot", OLD."known_subtotal_minor",
    OLD."pricing_status", OLD."catalog_version_ids", OLD."price_version_ids", OLD."source_channel",
    OLD."correlation_id", OLD."audit_context", OLD."created_at"
  ) THEN
    RAISE EXCEPTION 'ORDER_INQUIRY_SNAPSHOT_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_inquiry_snapshot_immutable
BEFORE UPDATE ON "order_inquiry"
FOR EACH ROW EXECUTE FUNCTION protect_order_inquiry_snapshot();

COMMIT;
