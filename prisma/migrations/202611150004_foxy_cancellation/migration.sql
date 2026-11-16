ALTER TABLE foxy_turns DROP CONSTRAINT foxy_turns_state_check,
  ADD CONSTRAINT foxy_turns_state_check CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','STALE','CANCELLED'));

ALTER TABLE foxy_visual_jobs DROP CONSTRAINT foxy_visual_jobs_state_check,
  ADD CONSTRAINT foxy_visual_jobs_state_check CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','CANCELLED'));
CREATE OR REPLACE FUNCTION guard_foxy_visual_job() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'visual job deletion forbidden'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'QUEUED' OR NEW.revision<>0 OR NEW.dispatch_count<>0 OR NEW.lease_nonce IS NOT NULL OR NEW.reserved_microusd<>0 THEN RAISE EXCEPTION 'invalid new visual job'; END IF;
  RETURN NEW;
 END IF;
 IF (NEW.id,NEW.owner_id,NEW.conversation_id,NEW.request_id,NEW.asset_id,NEW.input_hash,NEW.prompt,NEW.kind,NEW.aspect_ratio,NEW.selection,NEW.snapshot,NEW.profile,NEW.conversation_revision,NEW.created_at)
 IS DISTINCT FROM (OLD.id,OLD.owner_id,OLD.conversation_id,OLD.request_id,OLD.asset_id,OLD.input_hash,OLD.prompt,OLD.kind,OLD.aspect_ratio,OLD.selection,OLD.snapshot,OLD.profile,OLD.conversation_revision,OLD.created_at) THEN RAISE EXCEPTION 'immutable visual job identity'; END IF;
 IF NEW.revision<OLD.revision OR NEW.dispatch_count<OLD.dispatch_count OR (OLD.dispatch_started_at IS NOT NULL AND NEW.dispatch_started_at IS DISTINCT FROM OLD.dispatch_started_at) THEN RAISE EXCEPTION 'immutable visual job progress'; END IF;
 IF OLD.lease_nonce IS NOT NULL AND OLD.lease_until>clock_timestamp() AND NEW.state='RUNNING' AND (NEW.lease_nonce IS DISTINCT FROM OLD.lease_nonce OR NEW.lease_until IS NULL OR NEW.lease_until<OLD.lease_until) THEN RAISE EXCEPTION 'live visual job lease'; END IF;
 IF NEW.state<>OLD.state AND NOT ((OLD.state='QUEUED' AND NEW.state IN ('RUNNING','FAILED','CANCELLED')) OR (OLD.state='RUNNING' AND NEW.state IN ('READY','FAILED','CANCELLED'))) THEN RAISE EXCEPTION 'invalid visual job transition'; END IF;
 RETURN NEW;
END $$;

