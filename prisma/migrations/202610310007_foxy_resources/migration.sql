ALTER TABLE foxy_turns ADD CONSTRAINT foxy_turns_id_conversation_id_owner_id_key UNIQUE (id, conversation_id, owner_id);
CREATE TABLE foxy_resources (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, conversation_id uuid NOT NULL, source_turn_id uuid NOT NULL UNIQUE,
  title text NOT NULL, markdown text NOT NULL, revision bigint NOT NULL DEFAULT 0,
  created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT foxy_resources_id_owner_id_key UNIQUE (id,owner_id),
  CONSTRAINT foxy_resources_source_turn_id_conversation_id_owner_id_key UNIQUE (source_turn_id,conversation_id,owner_id),
  CONSTRAINT foxy_resources_turn_fkey FOREIGN KEY (source_turn_id,conversation_id,owner_id)
    REFERENCES foxy_turns(id,conversation_id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_resources_revision_check CHECK (revision >= 0),
  CONSTRAINT foxy_resources_title_check CHECK (char_length(title) BETWEEN 1 AND 200 AND length(btrim(title)) > 0),
  CONSTRAINT foxy_resources_markdown_check CHECK (char_length(markdown) BETWEEN 1 AND 50000 AND length(btrim(markdown)) > 0)
);
CREATE TABLE foxy_resource_requests (
  owner_id uuid NOT NULL, request_id uuid NOT NULL, resource_id uuid NOT NULL, input_hash text NOT NULL, result jsonb NOT NULL,
  created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (owner_id,request_id),
  CONSTRAINT foxy_resource_requests_resource_fkey FOREIGN KEY (resource_id,owner_id)
    REFERENCES foxy_resources(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_resource_requests_hash_check CHECK (input_hash ~ '^[a-f0-9]{64}$')
);
