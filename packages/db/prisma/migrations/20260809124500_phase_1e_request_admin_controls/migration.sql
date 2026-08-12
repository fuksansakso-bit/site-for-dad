-- Phase 1E migration risk: LOW. Adds encrypted-reference recovery and idempotent internal notes.
-- Forward compensation retains nullable encrypted references and note keys; admin routes can be disabled independently.
BEGIN;

ALTER TABLE "order_inquiry"
  ADD COLUMN "public_reference_sealed" VARCHAR(512);

ALTER TABLE "request_internal_note"
  ADD COLUMN "idempotency_key" VARCHAR(255);

UPDATE "request_internal_note"
SET "idempotency_key" = 'legacy:' || "id"::text
WHERE "idempotency_key" IS NULL;

ALTER TABLE "request_internal_note"
  ALTER COLUMN "idempotency_key" SET NOT NULL;

CREATE UNIQUE INDEX "request_internal_note_idempotency_key"
  ON "request_internal_note"("inquiry_id", "idempotency_key");

CREATE OR REPLACE FUNCTION protect_order_inquiry_snapshot() RETURNS trigger AS $$
BEGIN
  IF ROW(
    NEW."request_number", NEW."guest_session_id", NEW."cart_id", NEW."checkout_idempotency_key",
    NEW."public_reference_hash", NEW."public_reference_sealed", NEW."contact_name",
    NEW."contact_phone", NEW."locality", NEW."address", NEW."comment",
    NEW."measurement_requested", NEW."installment_interest", NEW."consent_version",
    NEW."consent_at", NEW."cart_snapshot", NEW."known_subtotal_minor", NEW."pricing_status",
    NEW."catalog_version_ids", NEW."price_version_ids", NEW."source_channel",
    NEW."correlation_id", NEW."audit_context", NEW."created_at"
  ) IS DISTINCT FROM ROW(
    OLD."request_number", OLD."guest_session_id", OLD."cart_id", OLD."checkout_idempotency_key",
    OLD."public_reference_hash", OLD."public_reference_sealed", OLD."contact_name",
    OLD."contact_phone", OLD."locality", OLD."address", OLD."comment",
    OLD."measurement_requested", OLD."installment_interest", OLD."consent_version",
    OLD."consent_at", OLD."cart_snapshot", OLD."known_subtotal_minor", OLD."pricing_status",
    OLD."catalog_version_ids", OLD."price_version_ids", OLD."source_channel",
    OLD."correlation_id", OLD."audit_context", OLD."created_at"
  ) THEN
    RAISE EXCEPTION 'ORDER_INQUIRY_SNAPSHOT_IMMUTABLE' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
