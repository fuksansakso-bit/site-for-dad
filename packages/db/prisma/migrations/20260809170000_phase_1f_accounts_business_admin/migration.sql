-- Phase 1F additive named staff, request-contact administration, portfolio and settings schema.
-- Existing catalog, quote, preview and request records remain in place and immutable.

CREATE TYPE auth_challenge_purpose AS ENUM ('STAFF_LOGIN', 'STAFF_INVITATION');
CREATE TYPE email_delivery_kind AS ENUM ('LOGIN_CODE', 'STAFF_INVITATION', 'SECURITY_NOTICE');
CREATE TYPE email_delivery_status AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');
CREATE TYPE staff_invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE portfolio_item_status AS ENUM ('DRAFT', 'RIGHTS_REVIEW', 'READY_FOR_REVIEW', 'PUBLISHED', 'HIDDEN', 'ARCHIVED');
CREATE TYPE portfolio_media_status AS ENUM ('UPLOADED_PRIVATE', 'PROCESSING', 'READY_FOR_REVIEW', 'PUBLICATION_APPROVED', 'PUBLICATION_BLOCKED');
CREATE TYPE site_settings_revision_status AS ENUM ('DRAFT', 'ACTIVE', 'SUPERSEDED');

CREATE TABLE one_time_code_challenge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized varchar(254) NOT NULL,
  purpose auth_challenge_purpose NOT NULL,
  code_hash char(64) NOT NULL,
  attempt_count smallint NOT NULL DEFAULT 0,
  maximum_attempts smallint NOT NULL DEFAULT 5,
  request_bucket_hash char(64) NOT NULL,
  resend_available_at timestamptz(6) NOT NULL,
  expires_at timestamptz(6) NOT NULL,
  consumed_at timestamptz(6),
  invalidated_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT one_time_code_attempt_check CHECK (
    maximum_attempts = 5 AND attempt_count >= 0 AND attempt_count <= maximum_attempts
  ),
  CONSTRAINT one_time_code_time_check CHECK (expires_at > created_at AND resend_available_at > created_at)
);
CREATE INDEX one_time_code_email_purpose_idx ON one_time_code_challenge(email_normalized, purpose, created_at);
CREATE INDEX one_time_code_expiry_idx ON one_time_code_challenge(expires_at);

CREATE TABLE staff_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  token_hash char(64) NOT NULL,
  expires_at timestamptz(6) NOT NULL,
  rotation_due_at timestamptz(6) NOT NULL,
  revoked_at timestamptz(6),
  last_seen_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT staff_session_token_hash_key UNIQUE (token_hash),
  CONSTRAINT staff_session_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT staff_session_rotation_check CHECK (rotation_due_at > created_at AND rotation_due_at <= expires_at)
);
CREATE INDEX staff_session_actor_expiry_idx ON staff_session(actor_id, expires_at);
CREATE INDEX staff_session_expiry_idx ON staff_session(expires_at);

CREATE TABLE email_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid REFERENCES one_time_code_challenge(id) ON DELETE RESTRICT,
  kind email_delivery_kind NOT NULL,
  sealed_message text NOT NULL,
  status email_delivery_status NOT NULL DEFAULT 'PENDING',
  attempts smallint NOT NULL DEFAULT 0,
  available_at timestamptz(6) NOT NULL DEFAULT now(),
  sent_at timestamptz(6),
  last_error_code varchar(128),
  correlation_id varchar(128) NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT email_delivery_challenge_key UNIQUE (challenge_id),
  CONSTRAINT email_delivery_idempotency_key UNIQUE (idempotency_key),
  CONSTRAINT email_delivery_attempts_check CHECK (attempts >= 0 AND attempts <= 25)
);
CREATE INDEX email_delivery_pending_idx ON email_delivery(status, available_at);

CREATE TABLE auth_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket varchar(96) NOT NULL,
  subject_hash char(64) NOT NULL,
  window_start timestamptz(6) NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT auth_rate_limit_bucket_subject_key UNIQUE (bucket, subject_hash),
  CONSTRAINT auth_rate_limit_count_check CHECK (count >= 0)
);
CREATE INDEX auth_rate_limit_window_idx ON auth_rate_limit(window_start);

CREATE TABLE staff_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized varchar(254) NOT NULL,
  role system_role NOT NULL,
  token_hash char(64) NOT NULL,
  status staff_invitation_status NOT NULL DEFAULT 'PENDING',
  invited_by_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  accepted_by_id uuid REFERENCES actor_identity(id) ON DELETE RESTRICT,
  expires_at timestamptz(6) NOT NULL,
  accepted_at timestamptz(6),
  revoked_at timestamptz(6),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT staff_invitation_token_hash_key UNIQUE (token_hash),
  CONSTRAINT staff_invitation_role_check CHECK (role IN ('MANAGER', 'ADMIN', 'OWNER')),
  CONSTRAINT staff_invitation_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX staff_invitation_email_status_idx ON staff_invitation(email_normalized, status, expires_at);
CREATE INDEX staff_invitation_inviter_idx ON staff_invitation(invited_by_id, created_at);

CREATE TABLE customer_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name varchar(120) NOT NULL,
  phone_normalized varchar(32) NOT NULL,
  email_normalized varchar(254),
  locality varchar(160),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT customer_contact_phone_key UNIQUE (phone_normalized)
);
CREATE INDEX customer_contact_email_idx ON customer_contact(email_normalized);
CREATE INDEX customer_contact_updated_idx ON customer_contact(updated_at);

CREATE TABLE customer_contact_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contact(id) ON DELETE RESTRICT,
  inquiry_id uuid NOT NULL REFERENCES order_inquiry(id) ON DELETE RESTRICT,
  linked_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT customer_contact_request_inquiry_key UNIQUE (inquiry_id)
);
CREATE INDEX customer_contact_request_contact_idx ON customer_contact_request(customer_contact_id, linked_at);

CREATE TABLE customer_contact_note (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_contact_id uuid NOT NULL REFERENCES customer_contact(id) ON DELETE RESTRICT,
  author_actor_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  body varchar(1000) NOT NULL,
  idempotency_key varchar(255) NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT customer_contact_note_idempotency_key UNIQUE (idempotency_key)
);
CREATE INDEX customer_contact_note_contact_idx ON customer_contact_note(customer_contact_id, created_at);

CREATE TABLE portfolio_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(180) NOT NULL,
  title varchar(180) NOT NULL,
  description varchar(2000) NOT NULL,
  locality varchar(160),
  category varchar(120) NOT NULL,
  completed_on date,
  status portfolio_item_status NOT NULL DEFAULT 'DRAFT',
  rights_evidence varchar(1000),
  publication_version integer NOT NULL DEFAULT 0,
  published_at timestamptz(6),
  created_by_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  updated_by_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_item_slug_key UNIQUE (slug),
  CONSTRAINT portfolio_item_publication_version_check CHECK (publication_version >= 0)
);
CREATE INDEX portfolio_item_status_updated_idx ON portfolio_item(status, updated_at);

CREATE TABLE portfolio_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_item_id uuid NOT NULL REFERENCES portfolio_item(id) ON DELETE RESTRICT,
  original_asset_id uuid NOT NULL REFERENCES media_asset(id) ON DELETE RESTRICT,
  display_asset_id uuid REFERENCES media_asset(id) ON DELETE RESTRICT,
  thumbnail_asset_id uuid REFERENCES media_asset(id) ON DELETE RESTRICT,
  source_class varchar(32) NOT NULL DEFAULT 'LOCAL_PORTFOLIO',
  safe_name varchar(180) NOT NULL,
  original_sha256 char(64) NOT NULL,
  detected_mime_type varchar(64) NOT NULL,
  width integer NOT NULL,
  height integer NOT NULL,
  exif_stripped boolean NOT NULL DEFAULT false,
  status portfolio_media_status NOT NULL DEFAULT 'UPLOADED_PRIVATE',
  rights_status media_rights_status NOT NULL DEFAULT 'OWNER_CREATED',
  publication_status media_publication_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT portfolio_media_source_class_check CHECK (source_class = 'LOCAL_PORTFOLIO'),
  CONSTRAINT portfolio_media_dimensions_check CHECK (width > 0 AND height > 0)
);
CREATE INDEX portfolio_media_item_status_idx ON portfolio_media(portfolio_item_id, status);

CREATE TABLE site_settings_revision (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  status site_settings_revision_status NOT NULL DEFAULT 'DRAFT',
  settings jsonb NOT NULL,
  safe_reason varchar(500) NOT NULL,
  authored_by_id uuid NOT NULL REFERENCES actor_identity(id) ON DELETE RESTRICT,
  supersedes_id uuid REFERENCES site_settings_revision(id) ON DELETE RESTRICT,
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  activated_at timestamptz(6),
  CONSTRAINT site_settings_revision_version_key UNIQUE (version),
  CONSTRAINT site_settings_revision_version_check CHECK (version > 0)
);
CREATE INDEX site_settings_revision_status_idx ON site_settings_revision(status, version);

CREATE TABLE site_settings_pointer (
  singleton_id smallint PRIMARY KEY DEFAULT 1,
  revision_id uuid NOT NULL REFERENCES site_settings_revision(id) ON DELETE RESTRICT,
  updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_pointer_revision_key UNIQUE (revision_id),
  CONSTRAINT site_settings_pointer_singleton_check CHECK (singleton_id = 1)
);

CREATE OR REPLACE FUNCTION project_name_protect_last_owner_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'OWNER' AND OLD.revoked_at IS NULL
     AND (TG_OP = 'DELETE' OR NEW.revoked_at IS NOT NULL) THEN
    PERFORM pg_advisory_xact_lock(hashtext('project-name:last-owner'));
    IF (
      SELECT count(*)
      FROM role_grant grant_row
      JOIN actor_identity actor ON actor.id = grant_row.actor_id
      WHERE grant_row.role = 'OWNER'
        AND grant_row.revoked_at IS NULL
        AND actor.disabled_at IS NULL
        AND grant_row.id <> OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'LAST_OWNER_PROTECTED' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER role_grant_protect_last_owner
BEFORE UPDATE OF revoked_at OR DELETE ON role_grant
FOR EACH ROW EXECUTE FUNCTION project_name_protect_last_owner_role();

CREATE OR REPLACE FUNCTION project_name_protect_last_owner_disable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.disabled_at IS NULL AND NEW.disabled_at IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM role_grant
       WHERE actor_id = OLD.id AND role = 'OWNER' AND revoked_at IS NULL
     ) THEN
    PERFORM pg_advisory_xact_lock(hashtext('project-name:last-owner'));
    IF (
      SELECT count(DISTINCT actor.id)
      FROM actor_identity actor
      JOIN role_grant grant_row ON grant_row.actor_id = actor.id
      WHERE grant_row.role = 'OWNER'
        AND grant_row.revoked_at IS NULL
        AND actor.disabled_at IS NULL
        AND actor.id <> OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'LAST_OWNER_PROTECTED' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER actor_identity_protect_last_owner
BEFORE UPDATE OF disabled_at ON actor_identity
FOR EACH ROW EXECUTE FUNCTION project_name_protect_last_owner_disable();
