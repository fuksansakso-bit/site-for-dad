-- PLAN-1A migration risk: LOW. Metadata-only constraint replacement on an empty Foundation table.
-- Forward recovery: restore the previous constraint only if workload actor attribution is rolled back
-- before shared data; after shared data, compensate forward with a new reviewed constraint migration.
BEGIN;

ALTER TABLE "audit_event"
    DROP CONSTRAINT "audit_event_actor_context_check";

ALTER TABLE "audit_event"
    ADD CONSTRAINT "audit_event_actor_context_check" CHECK (
        ("actor_type" = 'ANONYMOUS' AND "actor_identity_id" IS NULL)
        OR ("actor_type" = 'IDENTITY' AND "actor_identity_id" IS NOT NULL)
        OR ("actor_type" = 'SYSTEM_WORKER')
    );

COMMIT;
