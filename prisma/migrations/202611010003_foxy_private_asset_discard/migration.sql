CREATE TABLE foxy_private_asset_commands (
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 request_id uuid NOT NULL,
 asset_id uuid NOT NULL,
 action text NOT NULL CHECK (action = 'DISCARD'),
 input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
 asset_revision bigint NOT NULL CHECK (asset_revision >= 0),
 created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(owner_id,request_id),
 FOREIGN KEY(asset_id,owner_id) REFERENCES foxy_visual_assets(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE FUNCTION guard_foxy_private_asset_command() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'private asset command receipt is immutable'; END $$;
CREATE TRIGGER foxy_private_asset_commands_immutable BEFORE UPDATE OR DELETE ON foxy_private_asset_commands
 FOR EACH ROW EXECUTE FUNCTION guard_foxy_private_asset_command();
