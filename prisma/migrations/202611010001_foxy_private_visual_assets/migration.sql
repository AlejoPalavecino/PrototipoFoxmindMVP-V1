CREATE TABLE foxy_visual_assets (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 conversation_id uuid NOT NULL, request_id uuid NOT NULL, input_hash text NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
 conversation_revision bigint NOT NULL CHECK (conversation_revision >= 0), kind text NOT NULL CHECK (kind IN ('DIAGRAM','IMAGE')),
 aspect_ratio text NOT NULL CHECK (aspect_ratio IN ('1:1','4:3','3:4','16:9')),
 state text NOT NULL DEFAULT 'RESERVED' CHECK (state IN ('RESERVED','PROCESSING','READY','REJECTED','DISCARDED')),
 revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0), reserved_bytes bigint NOT NULL CHECK (reserved_bytes BETWEEN 1 AND 10485760),
 charge_bytes bigint NOT NULL CHECK (charge_bytes BETWEEN 0 AND reserved_bytes), storage_key text NOT NULL UNIQUE,
 digest text, size_bytes bigint, mime_type text, width integer, height integer, producer_version text,
 title text, description text, diagram jsonb, validated_digest text, scanned_digest text, validated_at timestamptz(6), scanned_at timestamptz(6),
 lease_nonce uuid, lease_until timestamptz(6), created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(), last_activity_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
 error_code text, discarded_at timestamptz(6), blob_deleted_at timestamptz(6), quota_released_at timestamptz(6),
 UNIQUE(owner_id,request_id), UNIQUE(id,owner_id),
 FOREIGN KEY(conversation_id,owner_id) REFERENCES foxy_conversations(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 CHECK (storage_key = 'foxy-assets/' || owner_id::text || '/' || id::text),
 CHECK ((lease_nonce IS NULL) = (lease_until IS NULL)),
 CHECK ((blob_deleted_at IS NULL) = (quota_released_at IS NULL)),
 CHECK ((state = 'DISCARDED') = (discarded_at IS NOT NULL)),
 CHECK (error_code IS NULL OR error_code IN ('INVALID_CONTENT','INFECTED','SERVICE_UNAVAILABLE','AI_INPUT_LIMIT')),
 CHECK ((digest IS NULL AND size_bytes IS NULL AND mime_type IS NULL AND width IS NULL AND height IS NULL AND producer_version IS NULL)
    OR (digest IS NOT NULL AND size_bytes IS NOT NULL AND mime_type IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL AND producer_version IS NOT NULL AND digest ~ '^[a-f0-9]{64}$' AND size_bytes BETWEEN 1 AND reserved_bytes AND mime_type IN ('image/png','image/jpeg')
       AND width BETWEEN 1 AND 4096 AND height BETWEEN 1 AND 4096 AND width::bigint*height <= 4000000
       AND ((kind='DIAGRAM' AND mime_type='image/png' AND producer_version='foxy-diagram-png-v1') OR (kind='IMAGE' AND producer_version='foxy-image-original-v1')))),
 CHECK ((digest IS NULL AND title IS NULL AND description IS NULL AND diagram IS NULL) OR (digest IS NOT NULL AND title IS NOT NULL AND description IS NOT NULL AND ((kind='DIAGRAM' AND diagram IS NOT NULL AND COALESCE(jsonb_typeof(diagram)='object' AND jsonb_typeof(diagram->'nodes')='array' AND CASE WHEN jsonb_typeof(diagram->'nodes')='array' THEN jsonb_array_length(diagram->'nodes') BETWEEN 1 AND 30 ELSE false END,false)) OR (kind='IMAGE' AND diagram IS NULL)))),
 CHECK (title IS NULL OR (length(btrim(title)) BETWEEN 1 AND 200)),
 CHECK (description IS NULL OR length(description)<=5000), CHECK (kind='DIAGRAM' OR diagram IS NULL),
 CHECK (state<>'READY' OR (digest IS NOT NULL AND validated_digest IS NOT NULL AND scanned_digest IS NOT NULL AND validated_digest=digest AND scanned_digest=digest AND validated_at IS NOT NULL AND scanned_at IS NOT NULL AND charge_bytes=size_bytes AND title IS NOT NULL AND (kind<>'DIAGRAM' OR diagram IS NOT NULL))),
 CHECK ((state IN ('RESERVED','PROCESSING','REJECTED') AND charge_bytes=reserved_bytes AND blob_deleted_at IS NULL)
   OR (state='READY' AND charge_bytes=size_bytes AND blob_deleted_at IS NULL)
   OR (state='DISCARDED' AND ((blob_deleted_at IS NULL AND charge_bytes>0) OR (blob_deleted_at IS NOT NULL AND charge_bytes=0))))
);
CREATE INDEX foxy_visual_assets_owner_created_idx ON foxy_visual_assets(owner_id,created_at DESC,id DESC);
CREATE INDEX foxy_visual_assets_cleanup_idx ON foxy_visual_assets(state,last_activity_at,id);
CREATE INDEX foxy_visual_assets_deletion_idx ON foxy_visual_assets(discarded_at,lease_until,id);
CREATE FUNCTION guard_foxy_visual_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.state <> 'RESERVED' OR NEW.revision <> 0 OR NEW.reserved_bytes <> 10485760 OR NEW.charge_bytes <> NEW.reserved_bytes OR NEW.digest IS NOT NULL OR NEW.title IS NOT NULL OR NEW.description IS NOT NULL OR NEW.diagram IS NOT NULL OR NEW.validated_digest IS NOT NULL OR NEW.scanned_digest IS NOT NULL OR NEW.validated_at IS NOT NULL OR NEW.scanned_at IS NOT NULL OR NEW.lease_nonce IS NOT NULL OR NEW.discarded_at IS NOT NULL OR NEW.blob_deleted_at IS NOT NULL OR NEW.error_code IS NOT NULL THEN RAISE EXCEPTION 'invalid visual reservation'; END IF;
   RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'visual asset deletion forbidden'; END IF;
 IF (NEW.id,NEW.owner_id,NEW.conversation_id,NEW.request_id,NEW.input_hash,NEW.conversation_revision,NEW.kind,NEW.aspect_ratio,NEW.reserved_bytes,NEW.storage_key,NEW.created_at)
 IS DISTINCT FROM (OLD.id,OLD.owner_id,OLD.conversation_id,OLD.request_id,OLD.input_hash,OLD.conversation_revision,OLD.kind,OLD.aspect_ratio,OLD.reserved_bytes,OLD.storage_key,OLD.created_at) THEN RAISE EXCEPTION 'immutable visual identity'; END IF;
 IF NEW.revision < OLD.revision OR (OLD.digest IS NOT NULL AND (NEW.digest,NEW.size_bytes,NEW.mime_type,NEW.width,NEW.height,NEW.producer_version,NEW.title,NEW.description,NEW.diagram) IS DISTINCT FROM (OLD.digest,OLD.size_bytes,OLD.mime_type,OLD.width,OLD.height,OLD.producer_version,OLD.title,OLD.description,OLD.diagram)) THEN RAISE EXCEPTION 'immutable visual payload'; END IF;
 IF (OLD.validated_digest IS NOT NULL AND NEW.validated_digest IS DISTINCT FROM OLD.validated_digest) OR (OLD.scanned_digest IS NOT NULL AND NEW.scanned_digest IS DISTINCT FROM OLD.scanned_digest) OR (OLD.validated_at IS NOT NULL AND NEW.validated_at IS DISTINCT FROM OLD.validated_at) OR (OLD.scanned_at IS NOT NULL AND NEW.scanned_at IS DISTINCT FROM OLD.scanned_at) OR (OLD.discarded_at IS NOT NULL AND NEW.discarded_at IS DISTINCT FROM OLD.discarded_at) OR (OLD.blob_deleted_at IS NOT NULL AND NEW.blob_deleted_at IS DISTINCT FROM OLD.blob_deleted_at) OR (OLD.quota_released_at IS NOT NULL AND NEW.quota_released_at IS DISTINCT FROM OLD.quota_released_at) THEN RAISE EXCEPTION 'immutable proof'; END IF;
 IF NEW.charge_bytes <> OLD.charge_bytes AND NOT (OLD.state='PROCESSING' AND NEW.state='READY' AND NEW.charge_bytes=NEW.size_bytes) AND NOT (OLD.state='DISCARDED' AND NEW.state='DISCARDED' AND OLD.blob_deleted_at IS NULL AND NEW.blob_deleted_at IS NOT NULL AND NEW.charge_bytes=0) THEN RAISE EXCEPTION 'invalid visual charge'; END IF;
 IF OLD.state='PROCESSING' AND NEW.state='PROCESSING' AND OLD.lease_nonce IS NOT NULL AND NEW.lease_nonce IS DISTINCT FROM OLD.lease_nonce AND OLD.lease_until > clock_timestamp() THEN RAISE EXCEPTION 'active visual lease'; END IF;
 IF OLD.state='PROCESSING' AND NEW.state='PROCESSING' AND OLD.lease_nonce IS NOT NULL AND OLD.lease_until <= clock_timestamp() AND NEW.lease_nonce = OLD.lease_nonce AND NEW.lease_until > OLD.lease_until THEN RAISE EXCEPTION 'expired visual lease requires fresh nonce'; END IF;
 IF OLD.state='PROCESSING' AND NEW.state='PROCESSING' AND OLD.lease_nonce IS NOT NULL AND NEW.lease_nonce IS NULL THEN RAISE EXCEPTION 'visual lease cannot be cleared'; END IF;
 IF OLD.lease_nonce IS NOT NULL AND OLD.lease_until > clock_timestamp() AND (NEW.lease_nonce IS DISTINCT FROM OLD.lease_nonce OR NEW.lease_until IS NULL OR NEW.lease_until < OLD.lease_until) THEN RAISE EXCEPTION 'active visual lease cannot be removed or shortened'; END IF;
 IF OLD.state='DISCARDED' AND OLD.lease_until > clock_timestamp() AND OLD.blob_deleted_at IS NULL AND NEW.blob_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'active visual lease prevents release'; END IF;
 IF NEW.state<>OLD.state AND NOT ((OLD.state='RESERVED' AND NEW.state='PROCESSING') OR (OLD.state='PROCESSING' AND NEW.state IN ('READY','REJECTED')) OR (OLD.state<>'DISCARDED' AND NEW.state='DISCARDED')) THEN RAISE EXCEPTION 'invalid visual transition'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_visual_assets_guard BEFORE INSERT OR UPDATE OR DELETE ON foxy_visual_assets FOR EACH ROW EXECUTE FUNCTION guard_foxy_visual_asset();
