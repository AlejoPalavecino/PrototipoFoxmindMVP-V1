# Foxy M3 — one-candidate durable cleanup contract

- Agent / role: /root/foxy_architect / architect
- Session / task ID: /root/foxy_architect (M3 cleanup RED handoff)
- Date: 2026-10-31
- Worktree / branch: C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai / codex/foxy-ai
- Observed commit: 15f0422; concurrent management/transport work preserved
- Phase: text materials and confirmed Library publication only
- Status: completed (design only; implementation and runtime acceptance open)
- ESTADO_DISENO: LISTO_PARA_TDD_RED

## Scope and observed source

Read actual012 migration's corrected custody trigger, management discard repository and terminal/quiet-lease tests; prior inspection covered P4 usage/storage, Library cleanup and Foxy runtime. Existing discard immediately creates terminal publication plus deleting custody and a quiet lease, retaining all quota. This record specifies the cleanup consumer of that contract. Only this own document was written; no production/tests/DB/provider/browser/secret execution.

Parent/test_runner proposed createFoxyPublicationCleanup({database,storage}).sweep():boolean. Confirm as async Promise<boolean>, with the semantics below. The earlier [recovery design](2026-10-31-foxy-architect-publication-recovery.md) and corrected M1 fence remain authoritative; never shorten a live quiet/deletion lease for a test or early retry.

## Exact entry point and boolean

New apps/api/src/foxy-ai/publication-cleanup.ts, with a small cohesive repository/helper if needed to keep files under200 lines and reviewed units under400.

```ts
createFoxyPublicationCleanup({
  database: SqlDatabase,
  storage: {remove(key: string): Promise<void>},
}) => ({
  sweep(): Promise<boolean>,
  onModuleInit(): void,
  onModuleDestroy(): Promise<void>,
});
```

The first RED/implementation cut may exercise sweep without mounting lifecycle. Construction does zero I/O/timer work. sweep processes at most one candidate. Concurrent calls on the same instance share the same active promise/attempt. Across instances, SQL lease/nonce decides ownership.

On successful promise resolution, true means this execution acquired a fresh durable cleanup claim, including a recorded storage failure/reference conflict; it does NOT mean bytes were removed. false means no eligible claim, stale/race-lost candidate or stopped instance. A database failure rejects with sanitized SERVICE_UNAVAILABLE, including an uncertain final ACK; do not turn an unobserved database outcome into false or a claimed successful deletion. Periodic lifecycle catches/report failures generically. Never expose a key, storage diagnostic or raw DB error.

## Claim transaction

Use bounded transactions (existing maxWait2000/timeout4000–6000) and actual database clock. Initial candidate read takes no row lock before scope. Select oldest discarded_at,id from publication state DISCARDED, material_id NULL, nonnull file_id, file blob_deleted_at NULL, custody phase deleting and lease null/expired. No-file/already removed publications require no work. Never select READY/FAILED without explicit discard, PUBLISHED, live quiet lease or a general abandoned upload.

Acquire target classroom FOR UPDATE, then advisory78123003, then publication, then file/upload/custody in fixed order. Re-read state, immutable publication-file binding and expired/null custody lease under those locks. Scope is system-owned durable cleanup: no fabricated user/request/capability or current AI/source eligibility check. Accepted discard may finish after archive or later access loss; it discloses no source content.

Binding requires exact file_id/classroom/owner, classroom_draft_id null, PDF extension/size matching descriptor and material-purpose/target-null custody. Do not require approved/scanned/COMPLETED, because incomplete/quarantined private artifacts must also be removable. Missing/mismatched binding or a race that made it ineligible returns no claim and zero storage calls.

Recheck references: ANY materials row (even deleted), any study_plan_versions, activity_instruction_files, attempt_attachments or another Foxy publication. Only this discarded publication's retained self-reference is ignored. Hold custody lock before final reference check so require_ready_p4_file cannot race a new association past admission.

Generate fresh random UUID, distinct from prior custody operation_id; UPDATE custody to that operation_id and clock_timestamp()+90seconds under the expired/null predicate. Corrected012 trigger validates/normalizes a full90second lease. Keep upload completion/reservation and blob metadata unchanged. Reference conflict is a handled candidate: acquire this backoff claim, set publication.cleanup_error_code=REFERENCE_CONFLICT and return handled/no-I/O; sweep resolves true. Keeping its lease excludes it temporarily so another eligible candidate can progress. No physical deletion or quota release on conflict.

A valid claim returns only private immutable publicationId,classroomId,fileId,storageKey,operationId to the worker. Commit before calling storage.remove. No SQL transaction/row lock remains open over I/O. Recheck all reference/binding facts at final ACK too.

## Storage and final ACK

Invoke remove once per claimed nonconflicting candidate using the actual bounded/idempotent shared storage port. Production S3 already bounds calls to at most30seconds; claim is90seconds. This is trusted infrastructure, not an unbounded task queue or a new provider. A fulfilled remove is the acknowledgment. Do not treat arbitrary thrown NOT_FOUND/503/string diagnostics as success; actual idempotent remove handles missing objects itself. No get/put/render/scan/provider call is necessary.

After storage fulfillment, a new transaction reacquires classroom -> advisory -> publication -> file/upload/custody. Require still DISCARDED, same immutable binding, deleting phase, same operation_id and lease_until>clock_timestamp, blob_deleted_at still NULL and no other references. Lost/expired nonce means zero metadata updates, preserve quota; sweep may still resolve true because it had claimed an attempt. New worker will re-remove idempotently after expiry.

Matching success atomically:

1. Set files.blob_deleted_at=clock_timestamp (preserve012/P6 reference and nonresurrection guards).
2. Set reserved_bytes=0 and reservation_released_at for incomplete upload; CANCELLED is appropriate for incomplete uploads. Retain historical completed upload identity/status/timestamp; no repeat quota arithmetic.
3. Set custody phase deleted and clear operation_id/lease_until. Corrected012 trigger requires the live old claim and the file blob marker set earlier in this SAME transaction.
4. Clear publication.cleanup_error_code. Do not change publication state/revision, resource/snapshot or classroom curriculum revision.

Any failure rolls back all these metadata changes. Quota remains until the blob marker commits, through the existing usage calculation. A crash after physical remove but before ACK retries idempotent remove after lease expiry; no optimistic quota release and no need to detach the file FK/history.

Storage failure uses the same ordered transaction and current-state/binding/live-nonce predicate to set only cleanup_error_code=STORAGE_UNAVAILABLE. Keep custody token/deadline and quota intact; retry waits for expiry. A stale failure cannot overwrite a newer successful worker or its error. An ACK/reference conflict conserves metadata/quota and sanitized REFERENCE_CONFLICT; legitimate new references are already prevented by deleting custody and existing SQL linking guards. No branch clears a live token/lease while phase remains deleting.

## Lifecycle and composition (next small cut)

onModuleInit is idempotent, starts one five-second scheduler and may trigger one initial sweep. Scheduler never overlaps sweep, holds no body queue and continues after sanitized failures. onModuleDestroy marks stopped first, cancels scheduler, prevents further claims and awaits the bounded active attempt; repeated stop shares completion and stopped sweep resolves false. Do not drop an already-started remove/ACK on shutdown without draining it.

Runtime installs cleanup independently of AI_ENABLED/provider/config and drains both publication processing and cleanup before file/storage/database teardown. Attempt all owned stops even if another worker fails. This API is internal; no HTTP start/stop/sweep endpoint. Coordinate runtime ownership with existing work; this design does not authorize overlapping edits there.

## RED matrix

- Empty/no-file/already-removed/PREPARING/READY/FAILED/PUBLISHED/live quiet lease: false, zero remove, unchanged snapshots/quota.
- Eligible expired synthetic restart fixture: fresh claim and one remove outside transaction, then correct atomic terminal metadata, true; completed and incomplete variants.
- Current reference: true handled claim/backoff/error, zero remove and unchanged quota. Metadata-binding mismatch or race-lost candidate: false, zero remove. Subsequent sweeps can select another candidate while the blocked one is leased.
- Two simultaneous same-instance sweeps share one attempt; two database connections/instances admit only one current claim and one concurrent remove. Claim errors reject sanitized, no I/O.
- Storage rejection: true if error persistence succeeds, sanitized error only, same live token/deadline, unchanged quota. No retry before expiry. A later expired claim uses a different nonce and can finish after restart.
- Physical remove resolved then ACK DB error: rejected SERVICE_UNAVAILABLE, no speculative quota release/error rewrite. Restart/re-remove proves durable recovery. Lost or expired nonce cannot finalize or clear another worker's token/error.
- Final success sets file marker before custody deleted atomically; injected failure between writes rolls back marker/reservation/custody. A fresh removal ACK cannot be applied by an old nonce.
- Keep terminal012 negative cases and positive renewal/final-ACK cases. Do not SQL-shorten a real live quiet lease; use an already-expired synthetic restart fixture or actual clock wait for end-to-end quiet proof.
- Shared references and generic P4/Library linking remain protected during I/O. Published-Foxy material deletion still works through the accepted Library path, not this private cleanup worker.
- Lifecycle: zero constructor I/O, duplicate init/stop, bounded active drain, no work after stop, failures do not kill scheduler, AI-disabled runtime still sweeps.

test_runner owns tests and real observed RED/GREEN. Use only isolated synthetic _test data and injectable storage; do not retain DB or call a provider. Browser material recovery/space-release UI remains later acceptance under M4, not inferred from these repository tests.

## Checks and handoff

Only source/Git read and this own documentation change. Functional/DB/provider/browser tests not run by this architect. PowerShell structural/link check passed: one relative link resolves, no trailing whitespace or zero-width characters. Engram host save remains unavailable from the previously observed session-registration hook rejection. Parent receives exact API and core fence immediately so RED need not wait for this document.

First unfinished task: sweep core RED, worker implementation/review, separate lifecycle/runtime RED and later management HTTP/UI/real synthetic QA. Ownership: new cleanup/helper files to worker, tests to test_runner; coordinator assigns runtime exclusively and maintains roadmap. Design complete does not imply cleanup or feature accepted.
