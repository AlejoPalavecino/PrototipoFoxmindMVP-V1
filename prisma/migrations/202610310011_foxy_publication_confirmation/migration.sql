ALTER TABLE foxy_publications DROP CONSTRAINT foxy_publications_state_check;
ALTER TABLE foxy_publications ADD COLUMN material_id uuid UNIQUE,
  ADD CONSTRAINT foxy_publications_material_fkey FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT foxy_publications_id_owner_key UNIQUE (id,owner_id),
  ADD CONSTRAINT foxy_publications_state_check CHECK (state IN ('PREPARING','READY','FAILED','PUBLISHED')),
  ADD CONSTRAINT foxy_publications_published_check CHECK ((state='PUBLISHED') = (material_id IS NOT NULL)
    AND (state<>'PUBLISHED' OR (file_id IS NOT NULL AND lease_nonce IS NULL AND lease_until IS NULL AND error_code IS NULL)));
CREATE TABLE foxy_publication_confirm_requests (
  owner_id uuid NOT NULL, request_id uuid NOT NULL, publication_id uuid NOT NULL, input_hash text NOT NULL, material_id uuid NOT NULL,
  publication_revision bigint NOT NULL, classroom_revision bigint NOT NULL, created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (owner_id,request_id), CONSTRAINT foxy_confirm_publication_owner_key UNIQUE (publication_id,owner_id),
  CONSTRAINT foxy_confirm_publication_fkey FOREIGN KEY (publication_id,owner_id) REFERENCES foxy_publications(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_confirm_material_fkey FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_confirm_hash_check CHECK (input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT foxy_confirm_revision_check CHECK (publication_revision >= 0 AND classroom_revision >= 0)
);
