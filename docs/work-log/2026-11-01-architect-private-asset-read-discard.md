# Private visual read and discard — safe next slices

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: 6f3bd32.
- Phase/spec: V-A1b.3/.4; [custody](2026-11-01-architect-private-asset-custody.md), [storage concurrency/ownership](2026-11-01-architect-storage-concurrency-correction.md).
- Status: completed (design only).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for V-A1b.3 reads and V-A1b.4a metadata discard. Physical cleanup remains disabled pending a proved remote fence.

## Request and scope

Define authorized private asset reads and safe discard/cleanup sequencing. Write only this attributed design record; no production/test/migration edit, secrets, real data, provider or storage operation. Physical cleanup must remain disabled until remote ordering is established; local abort/drain is not that proof.

## Initial evidence

Current public asset domain exposes only reservation views; custody authority is PROCESSING-only and requires active source classroom. It cannot be reused to grant READY reads or archived-source consultation. Current Foxy HTTP binary handler recognizes only PDF MIME, so raster read requires a narrow explicit allowlist branch. Current asset table has irreversible discard/deletion markers and lease/charge guards but no discard command receipt. No private asset read route or remote cleanup fence exists.

## V-A1b.3a — private read contract

Add `apps/api/src/foxy-ai/private-asset-read-repository.ts` and `private-asset-reader.ts`, exported through the Foxy barrel after acceptance. Shared inspection/read DTOs belong in the domain, not SDK/Prisma types. The read repository is separate from mutation/PROCESSING claim authority; do not relax the latter to make READY readable.

```ts
createFoxyPrivateAssetReadRepository(): {
  inspect(tx:SqlTransaction,ownerId:string,assetId:string)
    :Promise<FoxyPrivateAssetInspection>;
  describe(tx:SqlTransaction,ownerId:string,assetId:string)
    :Promise<FoxyPrivateAssetReadDescriptor>;
};
createFoxyPrivateAssetReader({uow,assets,storage}): {
  readFile(request:unknown,assetId:string,mode:'preview'|'download',
    signal:AbortSignal):Promise<{bytes:Uint8Array;headers:Record<string,string>}>;
};
```

`uow` is the existing real Foxy UoW; `assets` is the new repository; `storage` is a trusted Pick<ObjectStorage,'get'> supplied from the existing FileService, not an arbitrary client request. No storage URL/key argument, worker lease or provider request is accepted publicly. UUID/mode/signal validation occurs before I/O; use canonical lowercase IDs as existing domain parsers.

Internal descriptor exact fields: `{assetId,ownerId,conversationId,sourceClassroomId:string|null,assetRevision:string,kind,aspectRatio,storageKey,digest,sizeBytes:number,mimeType:'image/png'|'image/jpeg',width:number,height:number,producerVersion}`. Strings for IDs/revision; size integer1..10,485,760, dimensions1..4096/product<=4M. SourceClassroomId is provenance, not publication destination. It is internal only. Include no changing timestamps/counters/title in the I/O comparison unless they affect actual permission or payload identity; a benign conversation rename must not revoke an immutable image read.

Public `FoxyPrivateAssetInspection` is `{asset:FoxyPrivateAssetView,payload:{title,description,mimeType,sizeBytes:string,width,height,producerVersion,diagram:FoxyDiagram|null}|null,canPreview:boolean,canDiscard:boolean,cleanupState:'NOT_REQUESTED'|'PENDING'|'DONE'}`. It contains no owner/room/storage key/digest/lease/provider diagnostics. Non-READY states may have bound metadata for status display but canPreview=false. DISCARDED remains an owner-visible tombstone, payload may be null for UI, canPreview/canDiscard=false; cleanupState=PENDING until actual safe cleanup proof, never invented DONE. Without discard NOT_REQUESTED. No cleanup timeout promise is presented.

`inspect` checks current verified teacher via UoW, asset.owner_id, owner+not-deleted conversation and actual source classroom ownership. GENERAL must have no source room; CLASSROOM must reference its real immutable source. Archived source permits consultation/private discard, matching existing private history; generation/publication still require active classroom. Student/other teacher cannot get bytes by knowing UUID or uploader. Account/session revocation and source ownership are rechecked in each UoW. Reads do not renew session lifetime. A teacher's deletion of a source material does not rewrite already-generated private bytes; do not rerun source extraction as a read authorization substitute.

`describe` additionally requires state READY, no discard/blob deletion/quota-release marker, complete bound payload and actual validated/scanned digests equal stored digest with both timestamps. PNG/JPEG/version/kind/dimension/byte bounds remain enforced; malformed stored proof yields FILE_NOT_READY, not a fallback preview. For DIAGRAM, metadata remains the accepted structured schema, never raw HTML/SVG. Wrong-owner/missing/deleted conversation gives NOT_FOUND after established role/auth errors. Pending/rejected/discarded bytes give FILE_NOT_READY or NOT_FOUND according to the existing non-disclosure boundary; use NOT_FOUND for discarded binary.

Read sequence: real read UoW -> descriptorA; check signal; storage.get(exact immutable key,descriptorA.sizeBytes); immediately check signal; copy returned bytes; length/hash must match; real read UoW -> descriptorB; require exact security/payload descriptor equality; check signal again before returning. On storage failure, re-resolve authorization before mapping safe service/not-ready error. Revocation/discard/ownership change during GET therefore cannot return an image. UoW takes user -> source classroom -> conversation -> asset locks in that order, with shared read locks; no external I/O inside a transaction and no asset->room reverse lock.

Read service has no mutation/re-scan/provider/upload/quota-reservation side effect. Existing immutable scan/validation proof plus readback digest remains authoritative; replacing stored bytes rejects, never silently normalizes or re-approves them. Output allowlisted actual MIME, Content-Length, `inline` for preview/`attachment` for download with fixed ASCII filename if supplied, Cache-Control:no-store, nosniff,same-origin and sandbox/default-src none. Native/provider MIME alone never determines these headers.

## V-A1b.3b — transport and inspection

Exact routes under existing base `/api/v1/foxy-ai`:

- GET `/assets/:assetId` ->inspection JSON.
- GET `/assets/:assetId/file?mode=preview|download` ->private binary, default download. Reject duplicate/unknown query fields, invalid mode, body and malformed IDs consistently with existing HTTP parsers.

Small service factory `createFoxyPrivateAssetReadService({uow,assets})` exposes `inspect(request,assetId)` for JSON. Add these services as explicit optional visual capabilities in runtime/transport composition; absent service yields known unavailable/not-found route behavior, never a permissive mock. Existing text/publication routes retain their behavior.

The current handler only accepts application/pdf as trusted binary MIME. Extend that exact binary allowlist with image/png and image/jpeg; keep unknown types attachment/octet-stream and never permit SVG/HTML. The inline allowlist includes these safe raster types and PDF. Cover real handler response headers/bytes, not only reader unit tests. Caller-provided/provider headers do not pass through directly.

Honor accepted request/output deadlines and bounded response ownership until finish/close. Current handler active-- after response.end is not by itself proof that buffered output was drained: validate slow/closed client behavior before enabling a new10MiB path, reuse existing Files transfer discipline where applicable, and do not introduce an accidental global healthy-concurrency1 gate. No direct S3/public/presigned link or raw database/storage key reaches the browser.

## V-A1b.4a — immediate executable discard, metadata only

Create domain `DiscardFoxyPrivateAsset {requestId:string;assetRevision:string;confirm:true}` and strict parser, plus `FoxyPrivateAssetDiscardReceipt {assetId:string;action:'DISCARD';assetRevision:string}`. New repository/service filenames `private-asset-discard-repository.ts` / `private-asset-discard-service.ts`; `createFoxyPrivateAssetDiscardService({uow,assets})` exposes `discard(request,assetId,input):Promise<receipt>`. Transport POST `/assets/:assetId/discard` only; no cleanup/delete endpoint.

Definitive repository factory: `createFoxyPrivateAssetDiscardRepository()` exposes `discard(tx:SqlTransaction,ownerId:string,assetId:string,input:DiscardFoxyPrivateAsset):Promise<FoxyPrivateAssetDiscardReceipt>`. HTTP service field names for reads are `privateAssetReader` and `privateAssetReadService`, as confirmed to coordinator/test_runner; absent optional service means route unavailable, not a mock fallback.

An additive migration creates `foxy_private_asset_commands(owner_id uuid,request_id uuid,asset_id uuid,action text,input_hash text,asset_revision bigint,created_at timestamptz)` with PK(owner_id,request_id), composite FK(asset_id,owner_id) to assets(id,owner_id), action=DISCARD, hash64, revision>=0 and immutable receipt trigger. Timestamp is DB clock. Do not edit earlier migrations. Reconcile/fetch before creating successor; no reserved unobserved migration number in this design.

Transaction under real write UoW/Origin/CSRF/admission: user -> source room -> conversation -> asset locks; current owner/context/verified account required. Archived source may be discarded because this is a private Foxy artifact, not an academic classroom content mutation. Hash a versioned canonical envelope of assetId,expected revision,confirm true. Replay same owner request+hash returns existing receipt after current authorization; different hash CONFLICT. New request requires matching revision and non-DISCARDED state; a different new request cannot silently treat already-discarded state as a new mutation.

On success set state DISCARDED,discarded_at=clock_timestamp(),revision+1,updated_at,last_activity_at; preserve payload/proof/key/hash, charge_bytes, blob_deleted_at NULL and quota_released_at NULL. Critically preserve any live nonce/until, as current DB guard requires: worker authority immediately fails PROCESSING checks; existing in-flight remote PUT may still finish and remains charged. Insert receipt in same transaction. Do not call storage.remove, set deletion/release timestamps, clear/shorten a live lease or mark cleanup DONE. No new budget charge/refund/provider call.

Receipt is durable success even if follow-up inspection fails. UI must retain it and stop offering preview; it must not promise immediate reclaimed bytes. Other private edits persist. A separate Library copy is independent and remains available under its own conservation policy. An unconfirmed future visual publication must revalidate source and therefore cannot confirm a discarded asset; already-published copies do not become unreadable from this private command.

## V-A1b.4b — physical cleanup: disabled until remote fence

Local drain/lease expiry/session revocation is not proof that a remote server cannot still commit an old PUT. Current S3Storage.remove followed by quota release can allow an earlier conditional PUT to recreate bytes after deletion. Therefore do not instantiate or schedule a private asset removal worker yet. Keeping an explicit discard tombstone and full charge is the safe pending state, not completed cleanup.

One concrete candidate is a permanent same-key nonimage fence object: normal source PUTs always use If-None-Match:*. Cleanup would atomically install a tiny deterministic tombstone at the EXACT source key, verify its readback, and never delete that fence. Late conditional source PUTs must fail rather than recreate the original. This is a proposed new trusted storage primitive, not existing remove behavior or a proven implementation. The [AWS conditional-write contract](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html) states existing-key checks, first-finishing conditional-write semantics and that a current delete marker counts as absent. A versioned delete marker alone therefore is not this fence. AWS behavior does not establish the actual SeaweedFS4.48 compatibility semantics; it needs explicit owned integration proof.

Candidate prerequisites before implementation/enablement: no unconditional/alternate normal writer path; no concurrent generic remove capable of deleting the fence; atomic per-key conditional replacement/creation under the actual storage service; bounded idempotent retries and hash/size readback; durable cleanup lease/proof, race tests with remote requests delayed across the fence; restart proof; old claims cannot overwrite the fence. Never infer those properties from SDK Promise settlement. Do not create a new privileged unconditional PutObject route exposed to JSON/browser input.

This candidate changes physical accounting: a retained fence consumes bytes/metadata and is not a fully deleted object. It needs its own additive schema/guard (`payload_reclaimed_at`/fence proof and residual charge), must count its actual retained bytes, and must not fake current blob_deleted_at+quota_released_at=zero semantics. It also intentionally destroys only an explicitly discarded PRIVATE source; existing P4/Library immutability is unchanged. That schema/primitive/cleanup worker is not implementation-ready from this candidate paragraph. The next cleanup design must prove the selected remote fence or another equivalent ordering method before its RED/enablement; otherwise remain metadata-only and charged.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

Implement serially: .3a descriptor+reader, .3b real HTTP/inspection, .4a discard receipt/metadata, then a separately proved .4b remote-fence cut. test_runner owns tests; workers own new private read/discard modules only, coordinator serializes domain/barrels/runtime/HTTP/migrations. Do not touch text renderer/publication state machine to fake asset resources. Keep source files cohesive<200lines and split approximately<=400line review units. No shared roadmap edit from child.

## CRITERIOS_DE_TEST_DOT / RED

Read repository/reader:

- GENERAL/classroom READY authorized teacher, archived source consultation, student/other teacher/unverified/session revoked/ownership changed/deleted conversation denied; uploader/UUID alone never grants access.
- RESERVED/PROCESSING/REJECTED/DISCARDED/incomplete/mismatched scan-proof and invalid dimension/MIME/version cannot return bytes. Stored replacement/length/hash mismatch fails. Post-I/O revoke/discard/context change blocks bytes even if GET succeeded; benign rename does not invalidate content identity.
- Actual bytes/header modes/defensive ownership, no keys/proof/lease in JSON/errors, quota lowered/zero still permits existing authorized reads. No provider/re-scan/mutation side effect. Unknown/duplicate query and MIME downgrade behaviors in actual HTTP handler.
- Binary slow client/finish/close/30s bound does not leak buffered work/admission; existing text/PDF/citation transport remains valid. No one-click browser test can substitute for actual authenticated private read/reload proof.

Discard PostgreSQL `_test`/integration:

- Strict parser, actual write/session/Origin/CSRF, owner/context/archived policies; revision CAS; same-request replay/different hash; concurrent duplicate receipts one mutation; immutable receipt SQL guard.
- READY/RESERVED/PROCESSING/REJECTED all discardable with current revision; live PROCESSING lease preserved; charge/proof/payload unchanged, no storage call, no quota release/deletion marker. Worker complete/renew/reclaim cannot revive DISCARDED; race winner determines CAS outcome.
- Lost response/reload returns same receipt and tombstone; refresh failure does not resend under new request ID. No Library deletion or provider dispatch, and no pending private asset cleanup worker installed.

Physical cleanup later (not passable from mocks alone): delay conditional PUT remotely across discard/fence install, uncertain response and server restart; no source recreation after verified fence, no fence removal path, exact residual quota and crash after fence before DB proof. Use owned actual Seaweed/S3 service and synthetic assets, no retained P4 helper/credentials. Until these proofs exist, assert cleanup capability disabled and full charge retained.

## Verification and handoff

Inspected actual current asset schema/guards, custody authority/claims, UoW, public barrels, storage owner and Foxy HTTP/runtime paths. @aws-sdk/client-s3 installed3.1152.0 verified from package.json; no credential file read. Context7 did not resolve a matching SDK library, but official Amazon S3 docs were available and confirmed conditional-write/delete-marker semantics. Official AWS pages were consulted read-only; no storage/provider operation. A guessed http-request.ts path was absent; actual http-input.ts import/route contract supplied the relevant transport evidence.

Only design/primary documentation reads; no functional tests needed for this record and no runtime completion claim. Coordinator/test_runner received exact IMAGE adapter configuration clarification in its separate provider record. Coordinator can start .3a RED now, followed by metadata discard. Physical cleanup must stay disabled. No commit by architect. Node filesystem structural check passed exit0 for this record and amended IMAGE record:2local Markdown targets each,0missing,0trailing-whitespace lines.
