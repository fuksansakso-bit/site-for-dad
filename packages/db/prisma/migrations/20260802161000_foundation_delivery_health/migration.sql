-- PLAN-1A migration risk: LOW; create-only delivery/idempotency/health infrastructure.
-- Recovery: before shared use restore an empty/approved backup; after success use reviewed forward compensation.
BEGIN;

CREATE TYPE "outbox_status" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED');
CREATE TYPE "idempotency_status" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'FAILED');
CREATE TYPE "service_health_status" AS ENUM ('READY', 'NOT_READY', 'STOPPING');

CREATE TABLE "outbox_event" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "topic" VARCHAR(128) NOT NULL,
    "schema_version" SMALLINT NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "correlation_id" VARCHAR(128) NOT NULL,
    "status" "outbox_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "last_error_code" VARCHAR(128),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outbox_event_schema_version_check" CHECK ("schema_version" > 0),
    CONSTRAINT "outbox_event_attempts_check" CHECK ("attempts" >= 0),
    CONSTRAINT "outbox_event_publication_check" CHECK (
        ("status" = 'PUBLISHED' AND "published_at" IS NOT NULL)
        OR ("status" <> 'PUBLISHED' AND "published_at" IS NULL)
    )
);

CREATE TABLE "idempotency_record" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scope" VARCHAR(128) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "payload_digest" CHAR(64) NOT NULL,
    "result_digest" CHAR(64),
    "status" "idempotency_status" NOT NULL DEFAULT 'IN_PROGRESS',
    "locked_until" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "idempotency_record_completion_check" CHECK (
        ("status" = 'IN_PROGRESS' AND "completed_at" IS NULL)
        OR ("status" <> 'IN_PROGRESS' AND "completed_at" IS NOT NULL)
    )
);

CREATE TABLE "service_heartbeat" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "service_name" VARCHAR(64) NOT NULL,
    "instance_id" VARCHAR(128) NOT NULL,
    "status" "service_health_status" NOT NULL,
    "observed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "service_heartbeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_event_idempotency_key_key" ON "outbox_event"("idempotency_key");
CREATE INDEX "outbox_event_delivery_idx" ON "outbox_event"("status", "available_at");
CREATE UNIQUE INDEX "idempotency_record_scope_key_key"
    ON "idempotency_record"("scope", "key");
CREATE INDEX "idempotency_record_lock_idx"
    ON "idempotency_record"("status", "locked_until");
CREATE UNIQUE INDEX "service_heartbeat_service_instance_key"
    ON "service_heartbeat"("service_name", "instance_id");
CREATE INDEX "service_heartbeat_status_time_idx"
    ON "service_heartbeat"("status", "observed_at");

COMMIT;
