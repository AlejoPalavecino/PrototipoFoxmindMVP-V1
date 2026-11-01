CREATE UNIQUE INDEX foxy_visual_assets_id_owner_id_conversation_id_key ON foxy_visual_assets(id,owner_id,conversation_id);
CREATE TABLE foxy_visual_jobs (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 conversation_id uuid NOT NULL, request_id uuid NOT NULL, asset_id uuid NOT NULL UNIQUE,
 input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'), prompt text NOT NULL CHECK (length(btrim(prompt)) BETWEEN 1 AND 5000),
 kind text NOT NULL CHECK (kind IN ('IMAGE','DIAGRAM')), aspect_ratio text NOT NULL CHECK (aspect_ratio IN ('1:1','4:3','3:4','16:9')),
 selection jsonb NOT NULL CHECK (jsonb_typeof(selection)='object'), snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
 profile jsonb NOT NULL CHECK (jsonb_typeof(profile)='object'), conversation_revision bigint NOT NULL CHECK (conversation_revision>=1),
 state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','READY','FAILED')),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision>=0), error_code text,
 lease_nonce uuid, lease_until timestamptz(6), dispatch_count integer NOT NULL DEFAULT 0 CHECK (dispatch_count BETWEEN 0 AND 1),
 dispatch_started_at timestamptz(6), reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd>=0),
 usage_day date, preflight_tokens bigint CHECK (preflight_tokens>=0), input_tokens bigint CHECK (input_tokens>=0), output_tokens bigint CHECK (output_tokens>=0),
 created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(owner_id,request_id), UNIQUE(asset_id,owner_id,conversation_id), FOREIGN KEY(conversation_id,owner_id) REFERENCES foxy_conversations(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 FOREIGN KEY(asset_id,owner_id,conversation_id) REFERENCES foxy_visual_assets(id,owner_id,conversation_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 CHECK ((lease_nonce IS NULL)=(lease_until IS NULL)), CHECK ((dispatch_count=0 AND dispatch_started_at IS NULL) OR (dispatch_count=1 AND dispatch_started_at IS NOT NULL)),
 CHECK (error_code IS NULL OR error_code IN ('AI_UNAVAILABLE','AI_INPUT_LIMIT','AI_BUDGET_EXCEEDED','CONFLICT','AI_RATE_LIMITED','AI_TIMEOUT','PROVIDER_OUTCOME_UNKNOWN','GENERATION_INTERRUPTED','INVALID_AI_OUTPUT','SERVICE_UNAVAILABLE','FORBIDDEN','INVALID_CONTENT','INFECTED'))
);
CREATE INDEX foxy_visual_jobs_conversation_created_idx ON foxy_visual_jobs(conversation_id,created_at DESC,id DESC);
CREATE INDEX foxy_visual_jobs_queue_idx ON foxy_visual_jobs(state,created_at,id);
CREATE FUNCTION guard_foxy_visual_job() RETURNS trigger LANGUAGE plpgsql AS $$
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
 IF NEW.state<>OLD.state AND NOT ((OLD.state='QUEUED' AND NEW.state IN ('RUNNING','FAILED')) OR (OLD.state='RUNNING' AND NEW.state IN ('READY','FAILED'))) THEN RAISE EXCEPTION 'invalid visual job transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_visual_jobs_guard BEFORE INSERT OR UPDATE OR DELETE ON foxy_visual_jobs FOR EACH ROW EXECUTE FUNCTION guard_foxy_visual_job();
