-- A private document has one immutable object and independent conversation custodians.
ALTER TABLE chat_attachments ADD COLUMN cleanup_claimed_at timestamptz;
ALTER TABLE chat_attachments ADD CONSTRAINT chat_attachments_id_owner_key UNIQUE(id,owner_id);

CREATE TABLE foxy_chat_attachment_links (
  conversation_id uuid NOT NULL,
  attachment_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  removed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(conversation_id,attachment_id),
  FOREIGN KEY(conversation_id,owner_id) REFERENCES foxy_conversations(id,owner_id) ON DELETE RESTRICT,
  FOREIGN KEY(attachment_id,owner_id) REFERENCES chat_attachments(id,owner_id) ON DELETE RESTRICT
);
CREATE INDEX foxy_chat_attachment_links_custody_idx ON foxy_chat_attachment_links(attachment_id) WHERE removed_at IS NULL;

INSERT INTO foxy_chat_attachment_links(conversation_id,attachment_id,owner_id,removed_at,created_at)
SELECT a.conversation_id,a.id,a.owner_id,a.removed_at,a.created_at FROM chat_attachments a
JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id
WHERE a.folder_id IS NULL;
