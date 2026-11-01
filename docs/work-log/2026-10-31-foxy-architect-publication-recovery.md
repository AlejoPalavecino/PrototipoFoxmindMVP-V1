# Foxy publication recovery — retry, explicit discard and quota

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (FAILED publication recovery)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: b13f79c; concurrent next-env and synthetic fixture work preserved
- Phase: finish text materials and confirmed Library publication; images/diagrams excluded
- Status: completed (design only; implementation/behavioral acceptance remains open)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Scope and observed facts

Read actual publication queue/authority/allocator/worker/completion/repository/service/file-reader, runtime, files public ports, P4 custody/receive/cleanup/usage/storage policies, Library publisher/cleanup and relevant migrations/schema/domain/client/history/UI. No production/test edits, DB, secrets, retained data, provider or browser execution.

Current FAILED publications are not queued again. A linked file is excluded from general P4 incomplete cleanup even when the publication failed; usage counts it until a confirmed blob tombstone or released incomplete reservation. Creating another preparation is not a retry: it can reserve another file while the first remains pinned. The existing P3 worker already resumes a RECEIVABLE file using its pinned descriptor and skips render/upload for an existing READY file. Reuse those paths.

Two additional correctness requirements were verified in source: the generic P4 teacher material-file endpoint may read an unlinked READY file by fileId, so revoking only the Foxy route is insufficient; preserve_p6_blob_removal currently requires a softdeleted Library material, so a private discarded Foxy file cannot yet set blob_deleted_at. Both must be handled explicitly.

Library's current [deletion contract](../engineering/teaching/library.md) is the reliability precedent: explicit tombstone, durable fenced removal outside transactions, quota retained until actual removal, historical references protected and restart-safe idempotent remove. Preserve its published-Foxy-material path as well as ordinary Library deletion.

## M0 first executable cut — pure policy

New apps/api/src/foxy-ai/publication-management-policy.ts with decideFoxyPublicationManagement(facts), no SQL/provider/storage. Coordinator can start test_runner RED now, independently of the new migration. Policy accepts verified internal facts; it never authorizes a request.

```ts
type Facts = {
  state: 'PREPARING' | 'READY' | 'FAILED' | 'PUBLISHED' | 'DISCARDED';
  errorCode: string | null;
  sourceCurrent: boolean;
  destinationUsable: boolean;
  associationsValid: boolean;
  referenced: boolean;
  cleanupError: string | null;
  file: null | {
    phase: 'reserved' | 'receiving' | 'inspecting' | 'ready'
      | 'rejected' | 'deleting' | 'deleted';
    uploadStatus: 'STARTED' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    reservationReleased: boolean;
    blobDeleted: boolean;
    proofValid: boolean;
    leaseActive: boolean;
    rendererCompatible: boolean;
  };
};
type RetryReason = null | 'STATE' | 'SOURCE_CHANGED' | 'DESTINATION_UNAVAILABLE'
  | 'INVALID_RESOURCE' | 'REFERENCED' | 'BUSY' | 'CONTENT_REJECTED' | 'FILE_UNAVAILABLE';
type CleanupState = 'NOT_REQUESTED' | 'PENDING' | 'FAILED' | 'DONE';
decideFoxyPublicationManagement(facts: Facts): {
  canRetry: boolean;
  retryReason: RetryReason;
  canDiscard: boolean;
  cleanupState: CleanupState;
};
```

Retry reasons have this exact precedence: state not FAILED -> STATE; !sourceCurrent -> SOURCE_CHANGED; !destinationUsable OR !associationsValid -> DESTINATION_UNAVAILABLE; errorCode not FILE_NOT_READY -> INVALID_RESOURCE; referenced -> REFERENCED; file.leaseActive -> BUSY; rejected custody -> CONTENT_REJECTED; unusable file -> FILE_UNAVAILABLE; otherwise allowed/null. FILE_NOT_READY is the exact initial allowlist because it is the only retryable failure code actually persisted by today's worker. AI_INPUT_LIMIT, INVALID_INPUT, null and unknown codes fail closed. This final coordinator-question follow-up deliberately narrows the preliminary exclusion-only description; do not infer that QUOTA_EXCEEDED is persisted when the current worker normalizes it. LeaseActive applies even if other file fields look ready. No string parsing or localized exceptions.

A usable existing file has blobDeleted=false and either phase ready, upload COMPLETED and proofValid=true, OR phase reserved/receiving/inspecting with no active lease, reservationReleased=false, upload exactly STARTED/UPLOADING/FAILED and rendererCompatible=true. Unknown runtime state/status values fail closed rather than pass a negative completed/cancelled comparison. READY does not require a renderer match because P3 can prove it without rendering. Null file is a valid retry with no previous allocation. Rejected/deleting/deleted/invalid READY/other upload state combinations are unavailable; do not reset rejected custody or bypass scanning. Policy eligibility means a retry may be attempted, not that storage bytes are guaranteed present or that quota is sufficient.

canDiscard is state PREPARING/READY/FAILED AND !referenced. It does not require a current resource revision, active classroom or existing unit/topic. Authorization remains a separate current visibility check. canDiscard may be true during a live publication lease: M1 revokes the old lease and custody atomically and waits before removing bytes.

cleanupState: state not DISCARDED -> NOT_REQUESTED; null file OR blobDeleted=true -> DONE; nonnull cleanupError -> FAILED; otherwise PENDING. This order means confirmed absence wins over an old cleanup error. No extra fields in M0's return. RED covers each precedence pair, READY reuse across renderer version, reservation released, active/expired custody, rejection, stale resource/archived destination, references and discarded no-file/pending/error/removed states.

## Shared command and management contracts

Extend domain FoxyPublicationState with DISCARDED. Add strict parsers/types, exported through the domain barrel:

```ts
type RetryFoxyPublication = {requestId: string; publicationRevision: string};
type DiscardFoxyPublication = RetryFoxyPublication & {confirm: true};
type FoxyPublicationCommandReceipt = {
  publicationId: string; action: 'RETRY' | 'DISCARD'; publicationRevision: string;
};
type FoxyPublicationManagement = {
  publicationId: string; publicationRevision: string;
  canRetry: boolean; retryReason: RetryReason; canDiscard: boolean;
  cleanupState: CleanupState;
};
```

UUID validation/normalization and nonnegative signed-bigint decimal revisions reuse existing domain validators. Reject unknown keys, booleans-as-revisions, overflow and confirm other than true. An immutable command receipt names the revision APPLIED by that command; it intentionally contains no claim about the current state after a worker or later command progressed. Inspect returns current state separately.

Add GET /api/v1/foxy-ai/publications/:id/management plus POST /:id/retry and POST /:id/discard under the existing publications prefix. The separate management GET avoids changing every accepted inspection fixture/controller DTO. It uses the same current authorization as inspection and includes no fileId, keys, digest, leases, raw errors or snapshot. CSRF/session/origin/rate rules match other writes. 400 invalid; 401/verification/403 global access as existing auth; hidden objects404; CAS/state/reference conflict409; sanitized infrastructure503. No new worker-control endpoint.

Retry command does not mutate resource or classroom revision. Discard removes a private preparation only, not a resource/chat answer or Library material; PUBLISHED management uses Library's existing explicit deletion. After command receipt, UI inspects current state and does not optimistically infer READY/PUBLISHED or released quota.

## M1 discard repository — first DB unit

New createFoxyPublicationManagementRepository().discard(tx,actorId,publicationId,input) -> FoxyPublicationCommandReceipt, invoked inside real uow.run(request,true,...). Never fabricate a session/request/capability. Auth matches existing inspection scope, including the owner and current source/destination classroom authorization; archive is allowed. Do not require resource revision equality or existing curriculum associations. This adds no permission to read a revoked source; accepted deletion cleanup may continue after later access loss without exposing its metadata.

Single transaction: lock scopes, lock publication, check prior receipt, then CAS/state and references. For first acceptance, PREPARING/READY/FAILED only; no material_id; no reference to the file from any materials row (including deleted), any study-plan version, activity instruction, attempt attachment or another publication. Lock custody before the final reference recheck so a concurrent P4-ready link cannot slip through.

If a file exists, verify its immutable owner/classroom/purpose material/target-null binding and pin all artifact metadata. Set file_custodies.phase=deleting with a NEW operation_id, replacing any writer's nonce; lease_until is the maximum of now+90seconds, previous custody lease and publication lease. Keep digest/validated/scanned proofs, upload reservation/completed status and file bytes unchanged. This immediately fails requireReady for generic P4 reads and generic Library linking. An old receiver's final tx/failOperation cannot restore its prior custody token. Do not mark blob_deleted_at or release any reservation yet.

Set publication state DISCARDED, discarded_at=clock_timestamp, clear publication lease/error, revision+1, retain snapshot/file/descriptor/history and insert immutable command receipt. No file means DONE without storage work. No storage I/O inside the transaction. The quiet90seconds exceeds existing bounded storage operation timeout (maximum30seconds) and respects any longer existing custody lease; it allows an already admitted old write to settle before deletion. This relies on the actual bounded storage port, not an arbitrary unbounded mock.

## New additive schema and replay

Coordinator owns migration naming/creation after required git fetch and reconciliation with other migrations. Do not rewrite the accepted008–011 history. Update Prisma relations exactly; no new unit/topic FKs.

- FoxyPublication gains nullable discarded_at and cleanup_error_code. Add DISCARDED to state check; discarded_at iff state DISCARDED; discarded rows have material_id/lease fields null. Preserve file_id and artifact check. A terminal trigger prevents leaving DISCARDED, clearing/changing discarded_at or replacing its file/snapshot/descriptor; cleanup error may change. Constraint bounds allow only sanitized cleanup error codes.
- New FoxyPublicationCommandRequest stores owner_id,request_id (PK), publication_id, action RETRY/DISCARD, input_hash, publication_revision and created_at; composite FK publication_id/owner_id, retained metadata, hash/revision constraints. Do not create material links.
- Hash covers normalized action/publicationId/requestId/CAS revision and explicit confirm for discard. Look up an authorized prior receipt BEFORE current CAS/eligibility; identical replay returns that receipt only, different hash/publication/action is409. A retry receipt replay after later discard never requeues/resurrects. Original prepare replay returns the same now-DISCARDED publication; it cannot allocate a replacement.
- Preserve P4 custody terminality for discarded-publication files: no return to reserved/receiving/inspecting/ready and no replacement deletion identity outside the fenced cleanup protocol. Keep digest immutability. Existing ready-file link triggers must reject the now-deleting custody.
- Extend preserve_p6_blob_removal's explicit-removal evidence to a DISCARDED Foxy publication with no material. Continue vetoing live/shared/historical plan/instruction/attachment references. Preserve the existing permitted case of a PUBLISHED Foxy publication whose exact material was explicitly softdeleted in Library; treating every nondiscarded Foxy provenance row as a veto would break accepted Library deletion. Keep removed-blob nonresurrection.

M1 RED: no-file/file discard, actual archived/stale/deleted-association authorization, wrong teacher/CSRF, reference conflict, invalid/CAS rollback snapshot, duplicate request exactly once, hash mismatch, published rejection, same receipt after cleanup and no resurrection via prepare replay. Prove generic P4 read and Library publication denied immediately while quota remains unchanged; direct raw terminal-reset attempts rejected. Active P3 receiver and READY completion racing discard must produce either fully legitimate prior completion then discard, or fenced old work; never READY revival after accepted discard.

## M2 explicit retry repository

retry(tx,actorId,publicationId,input) -> same receipt shape/action RETRY. Same auth/scope order and receipt lookup before eligibility. Lock and derive M0 facts inside the write transaction, require current FAILED CAS, current source revision, active owned target and valid curriculum associations. No active custody/reference/rejection/unusable file; overflow conflicts. Atomically set PREPARING, error_code=null, lease fields null, revision+1, insert receipt. Keep publication ID, request identity, immutable snapshot, artifact descriptor and existing file/reservation; no second allocation or new provider request.

Current renderer compatibility should be an explicitly exported Foxy renderer constant derived from the actual production wrapper (currently foxy-pdf-v1), not inferred from a test fixture's alternate version. READY file proof avoids rendering. RECEIVABLE regenerates only via the normal bounded renderer, and bytes must match its pinned digest/size/version before receive; mismatch fails safely rather than rewriting bytes. Normal content validation/scanner/authority remain mandatory.

For AI_INPUT_LIMIT/INVALID_INPUT, rejected/incompatible/deleted files, stale resource or unusable destination, UI explains that the teacher must edit/save and create a new preparation, or discard the old one. It does not bypass scanning or silently detach a failed artifact to allocate again. New preparation is explicit, not a retry disguised by a new UUID. Space may remain pending until discard cleanup finishes.

M2 RED: no-file retry; same-file receivable and READY reuse with one file/quota reservation; deterministic/unusable/busy cases denied without changes; duplicate/uncertain replay; new UUID with stale CAS409; later failure supports a new explicit retry using fresh current CAS. P3 integration READY path does zero render/upload, receivable rescans and finishes same publication, and old lease nonce cannot finish a new attempt.

## M3 durable cleanup, locks and quota

One bounded cleanup worker per existing runtime, independent of AI_ENABLED/provider config. sweep coalesces; one object per five-second tick; storage.remove is outside SQL and uses the actual bounded shared storage port. No general retention expiry or automatic deletion of READY/FAILED preparations without an accepted explicit discard.

Candidate: DISCARDED publication with file, blob_deleted_at null, custody deleting and expired/null deletion lease. Lock/recheck binding/references, replace custody operation_id with a fresh deletion token/90second lease, then remove storage object. Retry missing-object removal through the idempotent actual remove contract. Only an acknowledged remove followed by matching-token finalization sets files.blob_deleted_at, custody deleted/token cleared and incomplete reserved_bytes=0/reservation_released_at. Completed upload metadata can remain historical; quota stops counting through blob_deleted_at. Before acknowledgment quota remains fully counted.

Final M1-review follow-up: storage failure keeps tombstone/reservation/bytes counted, records only STORAGE_UNAVAILABLE and RETAINS its current deletion token/deadline; retry is eligible only after expiry. This supersedes the preliminary early-release proposal: without a separate deletion-stage field, permitting live-claim release would also permit shortening the initial quiet lease. Five-second polling is not a promise of a five-second retry. Unexpected reference conflict keeps bytes/quota and records REFERENCE_CONFLICT, never removes. Crash after successful remove/before SQL ack repeats idempotent remove after lease expiry. Late old token cannot finalize over another cleaner. Recheck references/binding again at finalization; link/custody triggers ensure legitimate new links cannot appear after deletion admission. Root stops/drains publication and cleanup workers before closing files/storage/database, attempts all owned stops even if another fails, and does not run onModuleInit twice.

### Attributed M1 custody trigger correction — required before M1 acceptance

Reviewer/test_runner reported RED evidence that current012 trigger permits deleted->deleting and replacing the current deletion token while shortening its live quiet lease90seconds->1second. This architect inspected the actual uncommitted012 migration, management repository and new terminality tests; no production/test edits. These are M1 invariants to close now, not deferred M3 behavior: M1 already records the security wait.

For a custody linked to a DISCARDED publication, preserve existing P4 identity/digest checks and use one v_now=clock_timestamp() in the trigger. Branches:

| Old / new state | Required predicate |
| --- | --- |
| OLD deleted | NEW remains deleted; NEW operation_id and lease_until both NULL. No return to deleting or any receivable state. |
| OLD deleting -> NEW deleted | OLD operation_id nonnull and OLD lease_until>v_now; NEW operation_id/lease_until NULL; matching file already has blob_deleted_at nonnull. This is the atomic final ACK path. |
| OLD deleting -> NEW deleting, identical operation/lease tuple | Permit idempotent/no-op metadata update. |
| OLD deleting with live lease -> NEW deleting, changed tuple | Same operation_id only and new lease nonnull >= old lease. Permit renewal/extension; reject replacement, shortening and clearing. |
| OLD deleting with expired/null lease -> NEW deleting, changed tuple | New operation_id nonnull and distinct from old; new lease nonnull and >=statement_timestamp()+90seconds. Normalize NEW.lease_until to GREATEST(NEW.lease_until,v_now+90seconds), guaranteeing a fresh full window after the trigger executes. |
| Any other phase for an already discarded custody | Reject; do not restore reserved/receiving/inspecting/ready/rejected. |

The statement-time validation followed by trigger normalization avoids rejecting natural SQL clock_timestamp()+90seconds because a few microseconds pass before the trigger reads its own clock; do not introduce an arbitrary89second tolerance. Live/expired/final-ACK decisions still use the actual v_now. A malformed short new lease is rejected, not silently accepted and extended.

M3 claim query still needs classroom/admission/publication/file order, expired/null lease predicate and fresh nonce. Final success locks/rechecks state/binding/references and matching nonce plus live lease, sets blob_deleted_at, then changes custody to deleted/clears token in the SAME transaction; a failed final check rolls back both metadata changes, so quota is not released. Success does not wait for its own cleanup lease to expire. Failure leaves the token/lease in place and reports sanitized error; no early release is available. Expired final ACK must reclaim/re-remove idempotently rather than finalize with an old nonce.

Additional RED: live nonce replacement+shortening, same-nonce shortening, clearing a live pair, expired same-nonce renewal, short fresh claim and deleted revival all reject without mutation; identical tuple and same-nonce extension pass; expired fresh nonce gets a full90second floor; matching live ACK after blob tombstone passes; ACK without removed-blob marker or with expired/stale nonce rejects and leaves quota intact. Terminal deleted fixture must first set the synthetic confirmed-removal blob marker before entering deleted, representing an attainable predecessor; preserve the deleted->deleting rejection assertion. A test must not fast-forward a real live quiet lease by SQL-shortening it; use a synthetic already-expired restart fixture or actual clock wait. Architectural design does not establish those checks passed.

Global lock order for managed writes: uow verified user -> source/destination classrooms sorted by ID FOR UPDATE -> resource/conversation SHARE in fixed order -> publication admission advisory78123003 -> publication UPDATE -> file/upload/custody locks in a fixed order. Cleanup needs no user/source authorization: classroom UPDATE -> admission advisory -> publication -> file/upload/custody. Never lock publication/file first and then wait on classroom/user/admission. This matches queue claim/release's room->admission->publication and receive's user->room->admission; completion already takes scope before publication. Actual legacy/P3 integration tests must prove no reversed acquisition path.

M3 RED uses synthetic isolated _test data and two connections: simultaneous cleaners exactly one remove; removal failure/restart; remove-success/ack-crash; old-token finalize denied; existing shared references prevent removal; generic publication blocked against deleting custody; active receiver settles behind discarded fence; no quota release until remove ack; completed AND incomplete files release only once; no-file discard no remove; published-Foxy Library softdelete remains functional; AI-disabled runtime still cleans; shutdown waits/drains. Do not retain test DB or use actual provider.

## M4 transport/client/controller/UI and QA

HTTP adds management/retry/discard endpoints with real uow/auth/CSRF and existing safe proxy/client bounds; client methods managementPublication/retryPublication/discardPublication use fresh CSRF and no automatic retry. Shared DTO receipts expose no current-state fiction. Unit/service/handler/proxy tests cover actual paths, body strictness, auth and sanitized errors.

Add one small publication-management companion controller rather than mix delete intent into R1/R2C. It binds current resource/selected publication identity and exact revision; management GET must match inspected publication ID/revision before enabling actions. Reads are serial/single-flight and fenced by subject/selection. PRIVATE captured command has one UUID/body/CAS; unknown result offers Reintentar solicitud with the same intent, never creates a new retry/discard. New explicit attempt after a confirmed new FAILED revision gets a new UUID. Refresh inspection/list after acknowledged command; terminal DISCARDED cannot regress to an older READY/PREPARING response. Cleanup selected PENDING/FAILED polls serially at five seconds, stops DONE/unmount/identity and never starts a mutation.

Runtime DAG integrates this companion downstream of resource/history. Management pending joins H2's leave/uncertainty guard and blocks conflicting prepare/confirm/save/selection; explicit informed close still clears only local view and never cancels the accepted server command. Draft typing can remain available outside confirmation; saved resource/chat answer is preserved. Cleanup itself is server-durable and does not block leaving after acknowledgment. Identity jointly tears down the new companion too.

FAILED UI distinguishes Reintentar preparación (new explicit permitted command) from Reintentar solicitud (same uncertain command). Add Descartar preparación with inline explicit confirmation: the saved resource remains; unpublished PDF is removed; space releases after actual deletion. DISCARDED history remains visible, shows Liberación de espacio pendiente / No se pudo liberar todavía / Archivo eliminado, without fake byte counters. No preview/confirm/retry of discarded entry. PUBLISHED points to real Library management. Stale/unusable cases explain edit/new preparation; do not automatically spend another reservation. Safe error reasons map to concise Spanish labels, never raw code/keys.

QA in the assigned ego(lite) Space must prove a synthetic scanner/storage failure -> persisted FAILED after reload -> allowed same-publication retry -> READY -> confirmed Library exactly once; explicit discard -> immediate read denial -> storage unavailable quota retained -> restart/ack -> actual quota released; saved resource retained throughout. Include stale resource, archived target, unavailable file, rejection, double click/unknown response, native navigation/session teardown, keyboard/320/390/1440 layouts. Record actual observed browser/backend/storage proof; static markup or seeded DONE rows do not establish it.

## Ownership, verification and handoff

M0 worker owns only new pure helper; test_runner owns its tests. Coordinator assigns one migration/domain owner, separate repo/cleanup/transport/controller/UI owners with disjoint surfaces and no simultaneous runtime/Screen writes. Read public barrels across modules; no production edits by this architect. Split helpers/functions to current GRASP size policy and reviewed units under400 lines; do not pack all cuts into a single module or migration-driven all-at-once PR.

Observed checks: source/Git inspection and PowerShell structural/link check passed: one relative link resolves, no trailing whitespace or zero-width characters. Initial wildcard search unsupported in PowerShell and nonexistent teaching/file-retention.ts were corrected to actual files/classrooms/library-cleanup.ts. No functional/DB/browser/provider checks executed because this deliverable is design-only. Engram host mem_save remains unavailable from the observed session-registration hook rejection; repository record is the durable handoff.

First unfinished work: M0 pure RED, then coordinated additive migration/terminal invariants and M1 discard transaction RED, M2 retry, M3 cleanup/concurrency/restart, M4 endpoint/controller/UI and actual synthetic QA. Neither current FAILED-row existence nor this design closes feature acceptance.
