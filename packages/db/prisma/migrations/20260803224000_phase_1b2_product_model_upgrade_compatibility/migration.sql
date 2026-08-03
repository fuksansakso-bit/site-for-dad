-- PLAN-1B2 migration risk: LOW; forward-only compatibility for Phase 1B.1 databases that applied an early local copy of the
-- resumable-import migration before its product-model extension was frozen. Fresh databases
-- already contain this shape, so every statement below is intentionally idempotent.
BEGIN;

ALTER TABLE "product_model"
  ALTER COLUMN "system_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "category_id" UUID;

CREATE INDEX IF NOT EXISTS "product_model_category_idx"
  ON "product_model"("category_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_model_category_id_fkey'
      AND conrelid = 'product_model'::regclass
  ) THEN
    ALTER TABLE "product_model"
      ADD CONSTRAINT "product_model_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "product_category"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

COMMIT;
