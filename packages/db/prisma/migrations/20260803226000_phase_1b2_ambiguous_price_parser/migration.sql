-- PLAN-1B2 migration risk: LOW; advance the parser version after real cards proved that one
-- display node may contain multiple context-dependent prices. Recovery is a forward parser
-- supersession; ambiguous values remain PRICE_ON_REQUEST and no source snapshot is rewritten.
BEGIN;

UPDATE "catalog_source"
SET
  "parser_version" = 'amigo-public-html/2.0.1',
  "updated_at" = NOW()
WHERE "id" = '00000000-0000-4000-8000-000000000103'::uuid
  AND "parser_version" = 'amigo-public-html/2.0.0';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "catalog_source"
    WHERE "id" = '00000000-0000-4000-8000-000000000103'::uuid
      AND "parser_version" = 'amigo-public-html/2.0.1'
  ) THEN
    RAISE EXCEPTION 'AMIGO catalog source parser version is not the expected Phase 1B.2 predecessor';
  END IF;
END
$$;

COMMIT;
