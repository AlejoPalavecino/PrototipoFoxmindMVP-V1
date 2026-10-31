ALTER TABLE foxy_publications DROP CONSTRAINT foxy_publications_state_check;
ALTER TABLE foxy_publications ADD COLUMN error_code text;
ALTER TABLE foxy_publications ADD CONSTRAINT foxy_publications_state_check CHECK(state IN ('PREPARING','READY','FAILED'));
