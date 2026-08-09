-- Phase 1E migration risk: LOW. Adds an optional command key before WhatsApp handoff is enabled.
-- Forward compensation retains the nullable key and index; route rollback disables new communication writes.
BEGIN;

ALTER TABLE "request_communication_event"
  ADD COLUMN "idempotency_key" VARCHAR(255);

CREATE UNIQUE INDEX "request_communication_event_idempotency_key"
  ON "request_communication_event"("inquiry_id", "idempotency_key");

COMMIT;
