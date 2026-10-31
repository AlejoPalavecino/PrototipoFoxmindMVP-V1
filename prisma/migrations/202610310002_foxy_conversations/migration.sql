CREATE TABLE foxy_conversations (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  context_kind TEXT NOT NULL CHECK (context_kind IN ('GENERAL','CLASSROOM')),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  deleted_at TIMESTAMPTZ,
  CHECK ((context_kind = 'GENERAL' AND classroom_id IS NULL) OR (context_kind = 'CLASSROOM' AND classroom_id IS NOT NULL)),
  UNIQUE (id, owner_id)
);
CREATE INDEX foxy_conversations_owner_updated_idx ON foxy_conversations (owner_id, updated_at DESC, id DESC);
CREATE TABLE foxy_conversation_requests (
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  conversation_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (owner_id, request_id),
  FOREIGN KEY (conversation_id, owner_id) REFERENCES foxy_conversations(id, owner_id) ON DELETE RESTRICT
);
CREATE FUNCTION foxy_conversation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.context_kind IS DISTINCT FROM OLD.context_kind
      OR NEW.classroom_id IS DISTINCT FROM OLD.classroom_id OR OLD.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'foxy conversation ownership, context and deletion are immutable';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.owner_id AND account_role = 'teacher') THEN
    RAISE EXCEPTION 'foxy owner must be a teacher';
  END IF;
  IF NEW.classroom_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM classrooms WHERE id = NEW.classroom_id AND teacher_id = NEW.owner_id) THEN
    RAISE EXCEPTION 'foxy classroom owner mismatch';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER foxy_conversation_guard_trigger BEFORE INSERT OR UPDATE ON foxy_conversations
  FOR EACH ROW EXECUTE FUNCTION foxy_conversation_guard();
