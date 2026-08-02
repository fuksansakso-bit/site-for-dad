-- PLAN-1A migration risk: LOW; create-only infrastructure schema.
-- Recovery: before shared use restore an empty/approved backup; after success use reviewed forward compensation.
BEGIN;

CREATE TYPE "system_role" AS ENUM (
    'GUEST',
    'CUSTOMER',
    'MANAGER',
    'ADMIN',
    'OWNER',
    'SYSTEM_WORKER'
);

CREATE TYPE "audit_actor_type" AS ENUM ('ANONYMOUS', 'IDENTITY', 'SYSTEM_WORKER');
CREATE TYPE "audit_outcome" AS ENUM ('SUCCEEDED', 'DENIED', 'FAILED');

CREATE TABLE "actor_identity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(64) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "disabled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "actor_identity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_grant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "role" "system_role" NOT NULL,
    "granted_by_actor_id" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    CONSTRAINT "role_grant_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "role_grant_revocation_time_check"
        CHECK ("revoked_at" IS NULL OR "revoked_at" >= "granted_at")
);

CREATE TABLE "synthetic_session" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "synthetic_session_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "synthetic_session_expiry_check" CHECK ("expires_at" > "created_at"),
    CONSTRAINT "synthetic_session_revocation_time_check"
        CHECK ("revoked_at" IS NULL OR "revoked_at" >= "created_at")
);

CREATE TABLE "audit_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_type" "audit_actor_type" NOT NULL,
    "actor_identity_id" UUID,
    "action" VARCHAR(128) NOT NULL,
    "outcome" "audit_outcome" NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "request_id" VARCHAR(128),
    "target_type" VARCHAR(128),
    "target_id" VARCHAR(255),
    "reason_code" VARCHAR(128),
    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "audit_event_actor_context_check" CHECK (
        ("actor_type" = 'IDENTITY' AND "actor_identity_id" IS NOT NULL)
        OR ("actor_type" <> 'IDENTITY' AND "actor_identity_id" IS NULL)
    )
);

CREATE UNIQUE INDEX "actor_identity_provider_subject_key"
    ON "actor_identity"("provider", "subject");
CREATE UNIQUE INDEX "role_grant_actor_role_key" ON "role_grant"("actor_id", "role");
CREATE INDEX "role_grant_granter_idx" ON "role_grant"("granted_by_actor_id");
CREATE UNIQUE INDEX "synthetic_session_token_hash_key" ON "synthetic_session"("token_hash");
CREATE INDEX "synthetic_session_actor_expiry_idx"
    ON "synthetic_session"("actor_id", "expires_at");
CREATE INDEX "audit_event_actor_time_idx"
    ON "audit_event"("actor_identity_id", "occurred_at");
CREATE INDEX "audit_event_correlation_idx" ON "audit_event"("correlation_id");
CREATE INDEX "audit_event_action_time_idx" ON "audit_event"("action", "occurred_at");

ALTER TABLE "role_grant"
    ADD CONSTRAINT "role_grant_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_grant"
    ADD CONSTRAINT "role_grant_granted_by_actor_id_fkey"
    FOREIGN KEY ("granted_by_actor_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "synthetic_session"
    ADD CONSTRAINT "synthetic_session_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_event"
    ADD CONSTRAINT "audit_event_actor_identity_id_fkey"
    FOREIGN KEY ("actor_identity_id") REFERENCES "actor_identity"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION prevent_audit_event_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_event is append-only' USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_event_append_only"
    BEFORE UPDATE OR DELETE ON "audit_event"
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_event_mutation();

COMMIT;
