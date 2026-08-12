-- PLAN-1B2 migration risk: LOW; advance the registered full-catalog mapping after preserving
-- the four already-published pilot family identities. Recovery is a forward mapping supersession.
BEGIN;

DO $$
BEGIN
  UPDATE "catalog_source"
  SET
    "mapping_version" = 'amigo-public-full-catalog-mapping/2.0.1',
    "updated_at" = NOW()
  WHERE "id" = '00000000-0000-4000-8000-000000000103'::uuid
    AND "mapping_version" = 'amigo-public-full-catalog-mapping/2.0.0';

  IF NOT EXISTS (
    SELECT 1
    FROM "catalog_source"
    WHERE "id" = '00000000-0000-4000-8000-000000000103'::uuid
      AND "mapping_version" = 'amigo-public-full-catalog-mapping/2.0.1'
  ) THEN
    RAISE EXCEPTION 'AMIGO catalog source mapping version is not the expected Phase 1B.2 predecessor';
  END IF;
END
$$;

COMMIT;
