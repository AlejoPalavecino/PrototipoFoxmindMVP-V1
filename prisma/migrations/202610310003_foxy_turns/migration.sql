CREATE TABLE foxy_turns (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  request_id UUID NOT NULL,
  input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  sequence INTEGER NOT NULL CHECK (sequence > 0),
  state TEXT NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','STALE')),
  purpose TEXT NOT NULL CHECK (purpose IN ('CHAT','STUDY_MATERIAL','REVIEW','SUMMARY','ACTIVITY_IDEAS','LESSON_PLAN')),
  message_text TEXT NOT NULL CHECK (length(btrim(message_text)) BETWEEN 1 AND 5000),
  snapshot JSONB NOT NULL,
  metadata JSONB NOT NULL,
  conversation_revision BIGINT NOT NULL CHECK (conversation_revision > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (owner_id, request_id),
  UNIQUE (conversation_id, sequence),
  FOREIGN KEY (conversation_id, owner_id) REFERENCES foxy_conversations(id, owner_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX foxy_turns_one_active ON foxy_turns (conversation_id) WHERE state IN ('QUEUED','RUNNING');
