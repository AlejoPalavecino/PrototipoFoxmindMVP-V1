# Foxy private visual assets — storage and publication design

- Agent / role: /root/architect_next / architect.
- Session ID: unavailable; actual task identity /root/architect_next.
- Date: 2026-11-01.
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai.
- Starting commit observed: b68359b.
- Phase/spec: V-A1/V-P1, [Foxy proposal](../../odd/tasks/foxy-ai-proposal.md), following [visual first-slice design](2026-11-01-architect-visual-provider-first-slice.md).
- Status: completed (design only; implementation and runtime proof remain pending).
- ESTADO_DISENO: LISTO_PARA_TDD_RED for V-A1a, the metadata/reservation cut below.

## Request and scope

Define the next executable cut for private visual assets in GENERAL or CLASSROOM conversations, compatible with existing storage, scanner, quota, ownership and confirmed Library publication. Only this attributed record may change. No production edits, credentials, private data, provider dispatch, migration generation or database operation. Concurrent management/renderer edits are preserved.

## Inspected evidence

Initial branch/status: b68359b on codex/foxy-ai; renderer source/test and other agents' records are untracked, apps/web/next-env.d.ts is modified. None belongs to this design task.

Read the roadmap, work-record protocol, proposal, previous visual design, relevant Prisma models and public Files/AI/Foxy barrels, file-policy and functional security/quota documentation. Further decisions and checks follow below.

## Verified constraints and decisions

1. `FileObject` is classroom/draft scoped; its SQL CHECK requires exactly one scope. Draft authorization admits only plan purpose. Do not add ownerless rows, create fake drafts, reparent a private asset, or relax P4 scope/proof guards.
2. Reuse the existing private bucket, `FileService.storage`, `FileService.scanner`, bounded inspection worker and actual ClamAV. `S3Storage` currently accepts only `p4/<uuid>/<opaque>` keys, so a new prefix requires an explicit narrow adapter change. It is not already supported. New namespace: `foxy-assets/<canonical-lowercase-owner-uuid>/<canonical-lowercase-asset-uuid>`, exact segments only. Storage keys never cross the public API. No new SDK client, bucket, presigned URL or direct browser storage route.
3. Private original storage is an owner quota, separate from the classroom quota. Both GENERAL and CLASSROOM conversations use it; a conversation's classroom is provenance, not a substitute destination. Publication copies exact approved bytes to a new ordinary classroom material file and counts that second copy in the actual destination quota. Original remains reusable; Library conservation/deletion rules apply independently.
4. Require trusted `FOXY_PRIVATE_ASSET_QUOTA_BYTES` as a nonnegative canonical decimal signed-bigint value, with no production default. Missing configuration disables new visual generation/persistence only; zero forbids new reservations. Existing authorized reads and cleanup remain available when storage infrastructure is present, even if quota is zero/lowered. Invalid supplied configuration fails startup. Local tests pass explicit tiny quotas; no production amount is selected here.
5. Reserve capacity before any paid visual dispatch. A visual request reserves the bounded maximum 10 MiB (10,485,760 bytes); after verified READY completion it occupies actual bytes. A rejected/uncertain write retains its charge until confirmed object deletion. No automatic expiry of READY assets and no quota-driven deletion. Explicit discard is irreversible and revokes private access immediately; it never deletes a published Library copy. Abandoned incomplete assets may enter cleanup after 24 h inactivity, never READY assets.
6. No change to AI monetary budget in V-A1a. Later generation must acquire both private-byte capacity and the existing shared monetary reservation before dispatch, atomically in its job-start transaction where practical. A storage failure does not reimburse a completed/uncertain provider dispatch. The existing text-budget public contract is not image-price aware; use the prior visual-budget design rather than settling image tokens at text prices.

These are reversible local implementation choices within the authorized complete feature. Numerical production quotas, retained-data migration and live provider compatibility remain separate operator decisions; none blocks the isolated metadata cut.

## V-A1a — first executable cut: schema, reservation and quota only

One additive migration creates `foxy_visual_assets`; no historical migration is edited and no existing file/publication row is rewritten. The implementer must fetch origin and reconcile actual migration names immediately before creating it. Suggested suffix: `_foxy_private_visual_assets`; do not reserve an unobserved timestamp in this design. Update Prisma and its owner/conversation reverse relations. Apply only to an owned disposable `_test` database; this record authorizes no retained database mutation.

Required columns (UUIDs unless specified):

| Fields | Contract |
|---|---|
| `id`, `owner_id`, `conversation_id`, `request_id` | PK id; UNIQUE(owner_id,request_id); UNIQUE(id,owner_id); composite FK(conversation_id,owner_id) to foxy_conversations(id,owner_id), RESTRICT/NO ACTION |
| `input_hash`, `conversation_revision` | lowercase SHA-256; bigint >=0, immutable accepted command fingerprint/revision |
| `kind`, `aspect_ratio` | DIAGRAM/IMAGE; 1:1/4:3/3:4/16:9 |
| `state`, `revision` | RESERVED/PROCESSING/READY/REJECTED/DISCARDED; bigint >=0 |
| `reserved_bytes`, `charge_bytes` | integer 1..10,485,760; charge integer 0..reserved; initial both 10,485,760 |
| `storage_key` | unique immutable server-derived exact Foxy namespace |
| `digest`, `size_bytes`, `mime_type`, `width`, `height`, `producer_version` | all nullable until bound together; hash64, bytes1..reserved, PNG/JPEG, dimensions1..4096 each and product<=4,000,000; DIAGRAM requires PNG/foxy-diagram-png-v1; IMAGE uses foxy-image-original-v1 |
| `title`, `description`, `diagram` | nullable until payload binding; title1..200 nonblank scalar code points, description<=5000; diagram JSON only for DIAGRAM, parsed by existing bounded schema plus at least one node; IMAGE diagram is null |
| `validated_digest`, `scanned_digest`, `validated_at`, `scanned_at` | nullable until actual content inspection/real scan; READY requires both hashes equal bound digest and both timestamps |
| `lease_nonce`, `lease_until` | both null or both present; persisted operation fence |
| `created_at`, `updated_at`, `last_activity_at` | timestamptz(6), database clock_timestamp, not browser dates |
| `error_code`, `discarded_at`, `blob_deleted_at`, `quota_released_at` | sanitized fixed codes only; irreversible deletion/discard markers; quota release and blob deletion are recorded together after confirmed remove |

Indexes: `(owner_id,created_at DESC,id DESC)` for bounded listing; `(state,last_activity_at,id)` for incomplete discovery; `(discarded_at,lease_until,id)` for deletion work. Do not create a second mutable usage counter: SUM(charge_bytes) for the owner under the existing user FOR UPDATE lock is the authoritative private usage. Sum in PostgreSQL numeric/bigint and bigint in application; never Number-convert aggregate totals.

SQL guards preserve ownership/context/request/key/reservation identity, forbid physical metadata deletion, payload replacement after first binding, restoration of discard/deletion/proofs, decreasing revision and illegal state transitions. Proof fields are immutable once assigned; a failed/uncertain scan cannot set CLEAN-equivalent readiness. Allowed lifecycle: RESERVED->PROCESSING; PROCESSING->READY/REJECTED; any non-DISCARDED state->DISCARDED; expired PROCESSING may be reclaimed only with a fresh lease nonce and unchanged bound payload. READY and REJECTED never return to generation. Leases may renew only the same live nonce. No READY write is implemented in V-A1a, but its DB safety check exists before later workers can use it.

Charge rules: RESERVED/PROCESSING/REJECTED retain reserved_bytes; READY sets charge_bytes=size_bytes. Discard preserves its prior charge until confirmed deletion, then charge_bytes=0 and both deletion/release markers become nonnull together. A claim must reserve capacity once; replay never increases it. This deliberately overcounts quarantined failures rather than releasing space for potentially retained bytes.

Shared domain contracts, new `src/core/domain/foxy-ai-asset.ts` plus validation module, exported via domain barrel:

```ts
type FoxyPrivateAssetState = 'RESERVED'|'PROCESSING'|'READY'|'REJECTED'|'DISCARDED';
interface ReserveFoxyPrivateAsset {
  requestId: string; conversationRevision: string;
  kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio;
}
interface FoxyPrivateAssetView {
  id: string; conversationId: string; kind: FoxyVisualKind;
  aspectRatio: FoxyAspectRatio; state: FoxyPrivateAssetState; revision: string;
}
// Trusted transactional repository, no HTTP write route in this cut:
reserve(tx: SqlTransaction, actorId: string, conversationId: string,
  input: ReserveFoxyPrivateAsset, quotaBytes: bigint)
  : Promise<{created:boolean; asset:FoxyPrivateAssetView}>;
usage(tx: SqlTransaction, actorId: string)
  : Promise<{usedBytes:bigint}>;
```

Parsing rejects unknown/missing fields, malformed scalar strings/UUID/revision/kind/ratio; lowercase UUIDs before fingerprinting. Hash a fixed versioned canonical envelope containing conversationId, conversationRevision, kind and ratio (not config, quota, storage key, times or browser prices). A later generation-job input_hash additionally binds prompt/selection/model inputs; a generation request replay must validate BOTH hashes before reaching this reservation primitive. This repository alone is not the complete generation idempotency gate.

`reserve` acquires owner FOR UPDATE, checks verified teacher, resolves owner conversation not deleted, then checks actual source classroom ownership. For CLASSROOM generation reserve, source must be active; archived source remains readable through the later read path. Lock order: user -> any source/destination classrooms sorted UUID -> conversation -> asset. No asset->classroom reverse acquisition. The UoW/session adapter is the real accepted identity adapter, with write Origin/CSRF for future request entry points; a supplied actor string is not authentication. Worker use must derive actor from a durable verified claim.

Replay under the same owner requestId: current authorization first; same fingerprint returns existing asset including terminal state without quota/revision mutation, even if quota was lowered; differing fingerprint CONFLICT. Only new requests compare conversationRevision CAS and `used+10,485,760<=quotaBytes`, then insert. Invalid/non-owned/deleted context returns NOT_FOUND without leaking row existence; insufficient capacity QUOTA_EXCEEDED. No external I/O, provider call, web endpoint or enabled visual capability in this first cut.

## V-A1b — private byte lifecycle and authorized reads (next unit)

Use a Files-owned facade exported from `files/index.ts`, e.g. `createFoxyPrivateAssetFiles({files, authority})`. It consumes trusted opaque capabilities, not user IDs/keys from JSON; model/browser callers cannot mint them. The authority uses persisted asset lease nonce plus owner/context and later generation-job snapshot, follows the accepted WeakMap capability pattern, and rechecks before/after every I/O and in finalization. Only the Files facade may consume its internal inspector/storage/scanner implementation; Foxy imports its public barrel.

Bind a defensive byte copy/hash/metadata exactly once under the live PROCESSING claim before PUT. MIME/dimensions/animation are determined from actual decoded content with bounded worker inspection, not provider MIME/filename. Reuse P4 structural checking and real scanner; add narrowly scoped image metadata inspection if necessary (current inspectContent returns only MIME, not dimensions). PNG/JPEG only, one still image, <=10MiB and<=4M pixels, reject SVG/GIF/APNG/animation/multipage and format mismatch. Original bytes remain immutable; derived thumbnails would be separate assets, not silently re-encoded originals.

PUT uses existing If-None-Match semantics. A same-key conflict is recoverable only by bounded GET/hash equality. Read back stored bytes; inspection, scan and stored digest must all match. READY commits only under fresh owner/context/job authority, current lease and matching payload. No successful capability based only on uploader identity. Class context never borrows another classroom's sources, even if destination differs.

Transient storage/scanner outage leaves inaccessible PROCESSING payload for exact-byte retry without provider redispatch. Permanent invalid/infected payload becomes REJECTED. If generated bytes were never durably stored and lost, the job fails; another provider attempt requires a new explicit generation request and budget, never an automatic retry. Recovery can inspect the known immutable blob after worker restart; it cannot invent missing bytes.

Reads: teacher-only authenticated `GET /foxy/assets/:assetId/content?mode=preview|download`, same admission/session policy; private descriptor resolved before I/O and again after I/O. READY+same digest/proofs+nondeleted owner conversation/current source ownership are mandatory; active source classroom is required for generation/publication, archived-source reads may remain authorized as elsewhere. Byte hash/length must still match; otherwise sanitized FILE_NOT_READY/NOT_FOUND. Output actual allowlisted MIME, bounded Content-Length, no-store/nosniff/same-origin/sandbox headers. No SVG, raw diagram JSON markup or provider URL in image response. Student/other-teacher access remains denied even after a separate Library copy is published.

Cleanup needs durable claim and lease fencing, same owner lock, bounded nonoverlapping sweep and shutdown drain before shared storage closure. Do not run cleanup while a transfer can still write its key: revoke access, wait/drain bounded owned I/O/lease, recheck no active writer, remove, then release quota once. Crash after removal before SQL acknowledgment retries idempotent remove. Storage uncertainty retains charge/tombstone. Require multi-instance race proof (including stale delayed writer), not only a process-local busy flag. First metadata cut enables none of this deletion I/O.

## V-P1 — typed connection to existing confirmed publication

Extend the existing publication aggregate with a source union; do not insert a fake FoxyTurn/FoxyResource or PDF just to satisfy text-only FKs. A later additive migration introduces `source_kind` default TEXT_RESOURCE and optional `source_asset_id/source_asset_revision` composite FK to asset(id,owner_id), makes resource_id/resource_revision/snapshot_markdown nullable, and enforces exactly one complete source branch. Existing text rows remain TEXT_RESOURCE without semantic changes. `snapshot_title` remains common. For VISUAL_ASSET the source asset is immutable READY at prepare revision; its copied descriptor is frozen at file allocation. Asset discard while a preparation is unconfirmed invalidates it; an already published destination copy remains governed by Library, independent of source discard.

Add typed artifact variant alongside PDF metadata: RASTER_IMAGE has digest/size, PNG/JPEG MIME and dimensions, page_count NULL; TEXT_PDF retains PDF MIME/page_count and existing renderer versions, image dimensions NULL. Update the existing artifact SQL CHECK and all allocator/authority/completion/read/confirmation proof branches together. A bare new renderer string in an old PDF allowlist is insufficient. Keep current strict PDF branch unchanged in behavior. Audit existing resource_id INNER JOINs in list/inspect/management/cleanup/confirmation so visual records cannot silently disappear or bypass permission checks.

New prepare entry point `POST /foxy/assets/:assetId/publications` accepts exactly `{requestId,assetRevision,classroomId,title,unitId,topicId}` with existing ID/title/hierarchy validators. Preserve text resource prepare separately. The common publication domain becomes a discriminated source union so UI/SQL cannot assume every publication has resourceId. Existing common READY/confirm/management receipts remain durable, source-specific views are typed explicitly.

Prepare locks owner, actual source/destination rooms sorted, conversation, asset and publication; requires immutable source revision/current ownership and active destination. Worker reads exact private source bytes via its authority, allocates a NEW FileService classroom material in the same publication transaction, calls ordinary receive/scan, and requires matching hash/content proof. Reserve destination quota in beginInTransaction; no in-place scope change and no server-side copy that bypasses proof. The already scanned original does not waive destination P4 validation/scan. Preparation remains private and unlinked from students until confirm.

Confirmation uses existing `{requestId,publicationRevision,classroomRevision,confirm:true}` and same `createLibraryMaterialPublisher.publish` transaction/receipt, with typed raster proof and current source/destination permission plus revision checks. A stale/changed destination cannot silently publish. Duplicate same command returns the durable receipt; changed input conflicts. Confirmation response survives refresh errors. Discard/cleanup removes only the unpublished destination copy it owns; never the reusable private original or published material. Explicit private-asset discard has its own command/receipt and never changes Library history.

## ESTRATEGIA_EQUIPO_Y_SUPUESTOS

First worker owns only new asset-domain/parser/repository files, its single additive schema unit and its own record. test_runner owns tests; renderer and management workers keep their files. Coordinator serializes domain-barrel/Prisma/migration edits because they are shared. Keep each authored file<200 lines where cohesive and each reviewable work unit approximately<=400 lines; split schema and repository commits rather than compressing tests. Do not modify shared roadmap from this child.

No blocker needs user input for V-A1a. Do not claim later lifecycle/publication ready for release from this design alone; each has its own RED and independent verification.

## CRITERIOS_DE_TEST_DOT

V-A1a RED and GREEN:

- Pure validators: strict shape/UUID/scalar/revision/kind/ratio, snapshot mutation, canonical fingerprint and bigint overflow/config boundaries.
- Actual PostgreSQL `_test`: GENERAL and CLASSROOM owner context, student/unverified/other owner/deleted context denied, archived source generation denied; cross-owner composite FK rejected; private rows never touch files/classroom usage.
- Concurrent same request produces one row/one charge; same hash replay after conversation revision/quota change succeeds under current authorization; conflicting hash fails. Different concurrent requests cannot exceed one owner cap; two owners remain independent; sum/limit beyond Number.MAX_SAFE_INTEGER stay exact.
- Migration guard direct SQL attempts: identity/key/payload replacement, malformed descriptor, READY without matching inspection+scan proof, premature quota release, discard restoration, invalid transitions and hard delete all rejected. Initial RESERVED rows satisfy constraints. Existing PDF/file fixtures unchanged.
- Apply migration to fresh owned disposable database, migrate-deploy rerun/status and schema drift check; old migrations are not rewritten. Reservation does no external I/O. Roll back transaction-scoped tests; do not run retained P4 helper/configuration.

V-A1b/V-P1 required later proof:

- Real bounded PostgreSQL/private storage/ClamAV: good PNG/JPEG, disguised/animated/bomb/malformed image, infected fixture, unavailable scanner/storage, stored replacement, same-byte retry, process restart and uncertain outcome. No mocked clean scan acceptance.
- Revocation/archive/ownership/discard during PUT/GET/scan/confirmation, expired/stale nonce, simultaneous quota claims, cleanup versus active/delayed stale write, crash after removal before release; no readable unchecked bytes or optimistic quota release.
- GENERAL and classroom asset preview private; selected destination copy uses exact digest, independently charged quota, title/unit/topic; before confirm students cannot see it; after confirm student Library preview/download works. Duplicate confirmation yields one material. Library copy survives private source discard, published material conservation is unchanged.
- Rejected/failed generation preserves other material edits. Browser ego(lite) reviews both contexts, real generation->private preview->explicit confirm->student Library->reload and responsive/keyboard states. Synthetic provider-free tests of storage are not AI-generation acceptance.

## Verification and limits

Inspected targeted exported Files contracts, FileService/storage/scanner/inspection implementations, shared AI budget, Foxy UoW/claim/publication proof and Library public publisher, relevant Prisma and existing migrations, functional security/conservation/quota rules. No secret file, database, provider or private data was accessed. Runtime registration remains unavailable, so no agent-attributed Engram write was attempted.

Some initial Windows rg calls used shell-style wildcard paths and failed with OS123; a guessed errors.ts/validation.ts path was absent. These were read-only inspection misses; subsequent directory/glob/actual exported-file reads supplied the required evidence. Functional tests are not appropriate for this documentation-only task. A Node filesystem check of this record's Markdown targets and trailing whitespace passed (exit0):2local links,0missing,0trailing-whitespace lines. Final git status shows this new record plus preserved concurrent files; no production edit belongs to this task. No runtime/schema success is implied.

## Handoff

Coordinator can dispatch RED for V-A1a now: shared contract first, additive private-asset schema guards plus actual reservation/concurrency tests, then repository/config. No object storage path or provider dispatch becomes enabled until V-A1b proves custody/cleanup/read behavior. After that, implement the typed publication source/artifact branch as its own integration cut. No commit was created by this design task.
