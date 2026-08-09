-- Align the additive Phase 1F schema with Prisma's @updatedAt and relation defaults.
-- This forward migration also upgrades preserved local Phase 1F databases safely.

ALTER TABLE email_delivery ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE auth_rate_limit ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE staff_invitation ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE customer_contact ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE portfolio_item ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE portfolio_media ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE site_settings_pointer ALTER COLUMN updated_at DROP DEFAULT;

ALTER TABLE staff_session
  DROP CONSTRAINT staff_session_actor_id_fkey,
  ADD CONSTRAINT staff_session_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE email_delivery
  DROP CONSTRAINT email_delivery_challenge_id_fkey,
  ADD CONSTRAINT email_delivery_challenge_id_fkey
    FOREIGN KEY (challenge_id) REFERENCES one_time_code_challenge(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE staff_invitation
  DROP CONSTRAINT staff_invitation_invited_by_id_fkey,
  DROP CONSTRAINT staff_invitation_accepted_by_id_fkey,
  ADD CONSTRAINT staff_invitation_invited_by_id_fkey
    FOREIGN KEY (invited_by_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT staff_invitation_accepted_by_id_fkey
    FOREIGN KEY (accepted_by_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE customer_contact_request
  DROP CONSTRAINT customer_contact_request_customer_contact_id_fkey,
  DROP CONSTRAINT customer_contact_request_inquiry_id_fkey,
  ADD CONSTRAINT customer_contact_request_customer_contact_id_fkey
    FOREIGN KEY (customer_contact_id) REFERENCES customer_contact(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT customer_contact_request_inquiry_id_fkey
    FOREIGN KEY (inquiry_id) REFERENCES order_inquiry(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE customer_contact_note
  DROP CONSTRAINT customer_contact_note_customer_contact_id_fkey,
  DROP CONSTRAINT customer_contact_note_author_actor_id_fkey,
  ADD CONSTRAINT customer_contact_note_customer_contact_id_fkey
    FOREIGN KEY (customer_contact_id) REFERENCES customer_contact(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT customer_contact_note_author_actor_id_fkey
    FOREIGN KEY (author_actor_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE portfolio_item
  DROP CONSTRAINT portfolio_item_created_by_id_fkey,
  DROP CONSTRAINT portfolio_item_updated_by_id_fkey,
  ADD CONSTRAINT portfolio_item_created_by_id_fkey
    FOREIGN KEY (created_by_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT portfolio_item_updated_by_id_fkey
    FOREIGN KEY (updated_by_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE portfolio_media
  DROP CONSTRAINT portfolio_media_portfolio_item_id_fkey,
  DROP CONSTRAINT portfolio_media_original_asset_id_fkey,
  DROP CONSTRAINT portfolio_media_display_asset_id_fkey,
  DROP CONSTRAINT portfolio_media_thumbnail_asset_id_fkey,
  ADD CONSTRAINT portfolio_media_portfolio_item_id_fkey
    FOREIGN KEY (portfolio_item_id) REFERENCES portfolio_item(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT portfolio_media_original_asset_id_fkey
    FOREIGN KEY (original_asset_id) REFERENCES media_asset(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT portfolio_media_display_asset_id_fkey
    FOREIGN KEY (display_asset_id) REFERENCES media_asset(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT portfolio_media_thumbnail_asset_id_fkey
    FOREIGN KEY (thumbnail_asset_id) REFERENCES media_asset(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE site_settings_revision
  DROP CONSTRAINT site_settings_revision_authored_by_id_fkey,
  DROP CONSTRAINT site_settings_revision_supersedes_id_fkey,
  ADD CONSTRAINT site_settings_revision_authored_by_id_fkey
    FOREIGN KEY (authored_by_id) REFERENCES actor_identity(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT site_settings_revision_supersedes_id_fkey
    FOREIGN KEY (supersedes_id) REFERENCES site_settings_revision(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE site_settings_pointer
  DROP CONSTRAINT site_settings_pointer_revision_id_fkey,
  ADD CONSTRAINT site_settings_pointer_revision_id_fkey
    FOREIGN KEY (revision_id) REFERENCES site_settings_revision(id) ON DELETE RESTRICT ON UPDATE CASCADE;
