-- PLAN-1B2 migration risk: LOW; real full-catalog evidence proves that an AMIGO article is a
-- descriptive fact, not a unique variant identity. SourceEntity remains the stable unique key.
-- Recovery is a forward reintroduction only if a later verified source contract proves uniqueness.
BEGIN;

DROP INDEX IF EXISTS "material_variant_material_article_key";
CREATE INDEX "material_variant_material_article_idx"
  ON "material_variant"("material_id", "article");

COMMIT;
