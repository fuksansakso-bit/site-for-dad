-- Phase 1E migration risk: LOW. Expands only request monetary snapshot columns before request intake is enabled.
-- Forward compensation keeps BIGINT because narrowing after writes could lose information; route rollback disables intake.
BEGIN;

ALTER TABLE "order_inquiry"
  ALTER COLUMN "known_subtotal_minor" TYPE BIGINT;

ALTER TABLE "request_item_snapshot"
  ALTER COLUMN "known_total_minor" TYPE BIGINT;

COMMIT;
