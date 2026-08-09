CREATE OR REPLACE FUNCTION project_name_protect_last_owner_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'OWNER' AND OLD.revoked_at IS NULL
     AND (TG_OP = 'DELETE' OR NEW.revoked_at IS NOT NULL)
     AND EXISTS (
       SELECT 1 FROM actor_identity
       WHERE id = OLD.actor_id AND provider = 'passwordless-email'
     ) THEN
    PERFORM pg_advisory_xact_lock(hashtext('project-name:last-owner'));
    IF (
      SELECT count(*)
      FROM role_grant grant_row
      JOIN actor_identity actor ON actor.id = grant_row.actor_id
      WHERE grant_row.role = 'OWNER'
        AND grant_row.revoked_at IS NULL
        AND actor.disabled_at IS NULL
        AND actor.provider = 'passwordless-email'
        AND grant_row.id <> OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'LAST_OWNER_PROTECTED' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION project_name_protect_last_owner_disable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.disabled_at IS NULL AND NEW.disabled_at IS NOT NULL
     AND OLD.provider = 'passwordless-email'
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
        AND actor.provider = 'passwordless-email'
        AND actor.id <> OLD.id
    ) = 0 THEN
      RAISE EXCEPTION 'LAST_OWNER_PROTECTED' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
