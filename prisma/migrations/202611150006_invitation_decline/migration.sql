BEGIN;
ALTER TABLE invitations ADD COLUMN declined_at timestamptz(6),
  ADD COLUMN declined_by_id uuid REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT invitation_decline_check CHECK (
    (declined_at IS NULL) = (declined_by_id IS NULL)
    AND (declined_at IS NULL OR (accepted_at IS NULL AND revoked_at IS NULL
      AND declined_at >= issued_at AND declined_at < expires_at))
  );
DROP INDEX invitations_one_pending;
CREATE UNIQUE INDEX invitations_one_pending ON invitations (classroom_id, recipient_email_normalized)
  WHERE accepted_at IS NULL AND revoked_at IS NULL AND declined_at IS NULL;
COMMIT;
