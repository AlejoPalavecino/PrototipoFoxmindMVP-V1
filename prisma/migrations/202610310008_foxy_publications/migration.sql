CREATE TABLE foxy_publications (
  id uuid PRIMARY KEY, owner_id uuid NOT NULL, request_id uuid NOT NULL, input_hash text NOT NULL,
  resource_id uuid NOT NULL, resource_revision bigint NOT NULL, snapshot_title text NOT NULL, snapshot_markdown text NOT NULL,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  unit_id uuid, topic_id uuid, title text NOT NULL, state text NOT NULL DEFAULT 'PREPARING', revision bigint NOT NULL DEFAULT 0,
  created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT foxy_publications_request_key UNIQUE(owner_id,request_id),
  CONSTRAINT foxy_publications_resource_fkey FOREIGN KEY(resource_id,owner_id) REFERENCES foxy_resources(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_publications_hierarchy_check CHECK(topic_id IS NULL OR unit_id IS NOT NULL),
  CONSTRAINT foxy_publications_revision_check CHECK(revision >= 0 AND resource_revision >= 0),
  CONSTRAINT foxy_publications_hash_check CHECK(input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT foxy_publications_state_check CHECK(state IN ('PREPARING'))
);
