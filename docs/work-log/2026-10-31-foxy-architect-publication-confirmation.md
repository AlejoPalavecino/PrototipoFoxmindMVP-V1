# Foxy publication confirmation — architecture contract

- Agent / role: /root/foxy_architect / architect
- Session or task ID: /root/foxy_architect (publication confirmation design)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: c9b7c27; concurrent D4 runtime edits observed and preserved
- Phase: Foxy F7, explicit READY to Biblioteca confirmation
- Status: completed (design only; implementation and RED/GREEN remain unverified here)

## Request and scope

Define the transactional confirmation contract, historical replay policy, schema and lock order; specify the first small RED slice. Only this agent's design record may be written. No production changes, retained database access, provider calls or secret reads.

## Work performed

Inspected the previous confirmation analysis/lock design, actual LibraryService/PlanService and transaction runner, material/file schema and P4/P6 guards, Library and incomplete-upload cleanup, Foxy publication queue/completion/allocator/UoW, domain parser and P6 tests. Existing materials(file_id,classroom_id) references files(id,classroom_id); all public publication writers serialize the same classroom. Existing P6 explicitly verifies a historical shared-file reference, so adding global materials.file_id uniqueness would change supported conservation semantics.

## First RED handoff

E1, no migration: expose createLibraryMaterialPublisher({files}).publish(tx, request, actorId, {classroomId,revision,title,fileId,unitId,topicId}) returning {materialId,classroomRevision}. Caller supplies its actual authenticated request and owns the verified user lock and required classroom locks. The helper opens no transaction, revalidates target teacher/active/CAS, curriculum hierarchy, authorized ready material file and no prior material (including tombstones); inserts and increments classroom revision once. LibraryService delegates its publish branch and retains the existing {revision} HTTP result. Export the factory through classrooms/public/index.ts and requireReady through files/public/index.ts, keeping both import graphs lightweight.

RED criteria communicated to coordinator: actual synthetic transaction with student visibility; no nested transaction; rollback after insert and revision update; unchanged state after denied cases; concurrency against legacy Library publish yields one material and one increment; preserve historical shared-file P6 regression. No global materials.file_id UNIQUE constraint.

E1 preserves existing Library formats and file-read permissions. It does not introduce a PDF-only rule or uploaded_by_id=actor restriction for legacy publication. Those are additional Foxy artifact checks in E2. The helper must be called from an actual authenticated runner/UoW; caller owns the verified user lock and acquires every required classroom before entering the helper. Re-locking its already-held target classroom is allowed; opening a nested transaction or manufacturing a request is not. LibraryService keeps its existing external {revision} result and does not increment twice.

Do not import drafts.ts into the lightweight publisher for revision validation: its parser accepts only 18 decimal digits and imports broader classroom orchestration, while Foxy permits int64 decimal revisions up to 19 digits. Keep the legacy external parser unchanged; the internal helper must accept a canonical incrementable int64 revision. Add a native import-only public-barrel probe and a synthetic helper test at classroom revision 1000000000000000000, plus a non-incrementable upper-bound denial with no writes.

## Confirmation contract, E2

The domain input remains exactly parseConfirmFoxyPublication: {requestId,publicationRevision,classroomRevision,confirm:true}. No client material/file ID, bytes, digest or source snapshot is accepted. Freeze the successful result as four fields:

```ts
type FoxyPublicationConfirmation = {
  publicationId: string;
  materialId: string;
  publicationRevision: string;
  classroomRevision: string;
};
```

createFoxyPublicationConfirmationService({uow,confirmations}).confirm(request,publicationId,input) parses and snapshots input, then calls createFoxyPublicationConfirmationRepository({library}).confirm(tx,request,actor.id,publicationId,parsed) inside uow.run(request,true,...). The injected library is the E1 publisher over the actual shared FileStore. It opens no transaction and receives the same authenticated request. Repository code imports only the classrooms lightweight public barrel. Errors remain public code-only values supported by Foxy UoW.

The hash has fixed field order and canonical lower-case UUID values for publicationId and requestId, plus publicationRevision, classroomRevision and confirm:true. Persist revisions as BIGINT, expose decimal strings. A reused request ID with a different canonical hash is CONFLICT. Input object mutation during awaits cannot change the intended request.

### Access, replay and freshness

Every call first authenticates the verified teacher and checks current ownership of publication/resource, accessible nondeleted conversation, source classroom ownership when applicable and destination classroom ownership. Archive is permitted for this authorization-only branch; new mutation later requires an active destination. Source classroom archive remains allowed as in existing Foxy history/completion policy.

After authorized publication locking, look up owner/request before new-operation CAS. Matching replay returns the exact stored four-field receipt, without writes, even after later resource edit, classroom revision changes, classroom archive, or material title/association edits. It must not require the old resource revision, unit/topic existence or current classroom revision before recognizing replay. The receipt describes the original commit; it does not claim a new publication or fresh file inspection.

Before returning matching replay, verify the same bound material still belongs to the destination, is not soft-deleted and its file has no blob_deleted_at. Missing/inaccessible/deleted material yields opaque NOT_FOUND without material ID or deletion details. Never insert a replacement, restore a tombstone, rerender, rescan, recreate bytes or advance revisions. Revoked ownership or deleted conversation also denies before returning a receipt. A changed hash conflicts; a new request against PUBLISHED conflicts.

For a new request only, require READY and exact publicationRevision, exact classroomRevision, active owned destination, and current resource revision equal to publication.resource_revision. Require current unit/topic hierarchy; missing or moved historical associations conflict and require a newly prepared intention. Never silently erase/rebind associations or update the frozen snapshot.

### Atomic mutation

Before E1, recheck the Foxy-specific persisted artifact proof: file bound to this publication, owner=publication owner, classroom=destination, draft scope NULL, PDF/application-pdf, expected size, no blob deletion, material purpose/target NULL, approved and clean with timestamps, completed upload with timestamp, ready custody and artifact/object/validated/scanned digest equality. This proof comes from DB rows, not caller flags. E1 repeats the generic Library readiness/scope/association checks using actual FileAccess.

Under one transaction: E1 inserts material from frozen publication title/unit/topic/file and increments classroom revision once; update READY to PUBLISHED, attach material_id and increment publication revision once; insert the confirmation receipt. Recheck state/revision in the update predicate. Any failure, including receipt uniqueness or an injected error after an intermediate write, rolls back material, both revisions, publication state and receipt. No storage, scanner, provider or renderer calls occur during confirmation. READY alone remains private.

## Schema for E2, after fresh git fetch

Use a new migration after the current tip; do not edit already committed migrations. Its author must fetch origin and inspect actual local/remote migration state before selecting the name. No migration was authored or fetched by this architect.

- Extend the named publication state CHECK with PUBLISHED.
- Add publication.material_id nullable UUID, UNIQUE, FK materials(id) RESTRICT/NO ACTION. CHECK material_id IS NOT NULL exactly when state=PUBLISHED. PUBLISHED also requires file_id present, lease fields NULL and error_code NULL. Do not add unit/topic FKs to the private intention.
- Add UNIQUE publication(id,owner_id) for the ownership-scoped receipt relation.
- Add foxy_publication_confirm_requests: owner_id, request_id, publication_id, input_hash, material_id, publication_revision, classroom_revision and created_at. Primary key(owner_id,request_id); UNIQUE(publication_id,owner_id) gives one successful confirmation per owned publication. Composite FK(publication_id,owner_id) to publication(id,owner_id), plus material FK RESTRICT/NO ACTION. Hash is lowercase 64-hex; revisions are nonnegative BIGINT. Store no replay JSON, text, storage key or prompt.
- Model all actual FKs and inverse relations in Prisma with matching mapped names. Do not add a User inverse without a corresponding owner FK; ownership is already implied through the publication relation. The composite source unique makes the publication-confirmation relation explicitly one-to-one.
- Do not add materials.file_id UNIQUE: existing P6 deliberately conserves shared historical references. Public writers instead share the destination classroom row lock, reject any prior material including deleted rows and are scoped by the existing composite material/file classroom FK. A file cannot be attached through another classroom; same-classroom public producers serialize.

The material FK preserves a soft-delete tombstone, not its bytes. Do not add Foxy history references to LibraryCleanupWorker or the P6 blob-removal guard: explicit Library deletion must still remove these bytes and release quota. Keep the existing Foxy reference in incomplete-upload cleanup, which protects unconfirmed preparation from abandoned-upload deletion.

## Lock reconciliation

Use this order for confirmation, including replay:

1. Actual Foxy UoW authenticates and locks verified owner FOR UPDATE.
2. Read owned publication/resource/conversation only as a source/destination identity hint; reject unauthorized rows before locking foreign scopes.
3. Lock source and destination classrooms FOR UPDATE in sorted immutable UUID order, deduplicated. Perform subsequent checks in new statements after a possible wait.
4. Recheck and lock resource/conversation FOR SHARE, with hinted source identity unchanged. This is access validation; defer resource revision CAS until after replay recognition.
5. Lock owned publication FOR UPDATE; verify all hinted identities again. Do not acquire a newly discovered classroom after this point; reject a changed hint instead.
6. Resolve receipt first. On new publication, lock/check unit then topic, inspect/lock file proof within the already-owned destination, invoke E1 and mutate publication/receipt. On replay, read bound material/file under the destination lock and return or deny.

No admission/budget advisory is needed for READY confirmation. FileAccess uses the actual HTTP/session request and read action; the bridge's file-kind/upload advisory is not involved.

The existing completion obtains user, sorted source/destination classrooms, resource/conversation and publication before its joined p/f/u/c proof locks. Receive obtains user SHARE and destination classroom UPDATE before custody/file/upload writes; cleanup obtains destination classroom before material/file/custody updates. Library mutation and explicit deletion also obtain that classroom. Therefore conflicting child-row writers for the same file are mutually excluded before their different file/upload/material row-lock sequences. Every material-file reference is constrained to the same classroom; Foxy rejects a foreign file before locking it. No child-row transaction may wait for a new classroom or user lock. Repeated locks of already-held owner/destination through E1/FileAccess are reentrant.

This is a scoped lock proof for the actual supported writers, not a claim that unordered joins are universally safe. It does not require changing completion, receive or cleanup merely to introduce confirmation. New proof code can explicitly lock file, upload then custody after publication for clarity, but must not acquire a foreign scope. Existing raw-SQL fixture writers are not the public publication protocol.

## Required RED and independent verification

E1 first: reuse current P6 behavior tests and add direct transaction-aware publisher tests, including synthetic storage/scanner ports that throw if touched. Test 0 nested transactions; legacy API keeps its DTO, supported formats and errors; helper-vs-legacy publish race yields one commit and one class increment; rollback snapshots include material and classroom revision. Preserve P6 shared-file/tombstone tests.

E2 domain/schema/repository tests:

- Exact four-field receipt; successful confirmation creates one student-visible material, PUBLISHED with material binding, one receipt and one increment of each revision. No file IDs/storage/private fields in response and no external I/O.
- Matching serial/concurrent replay returns byte-equivalent receipt with no writes. Distinct keys racing the same publication produce one success and one CONFLICT. Same key across two publications or changed payload conflicts only after current access checks.
- Replay after stale CAS, later resource edit, active material metadata edit, plan association removal after material reorganization and destination archive succeeds. Deleted material or removed blob returns NOT_FOUND and no resurrection. Revocation, role/unverified owner and deleted source conversation deny.
- New request requires READY, active destination, current resource version and exact revisions. Cover PREPARING/FAILED/PUBLISHED, stale revisions, missing/moved unit/topic, foreign scope/owner, material target/purpose, all proof fields/statuses/timestamps, removed blob and existing live/tombstone material.
- Inject failure after material insert, classroom revision update, publication update and receipt insert; each must roll back the entire state. Commit-ack loss followed by same request must recover the durable result.
- Fresh synthetic migration apply-twice/status/drift and Prisma generation; owned fixtures reflect new FKs and state checks. No retained-data migration claim.

Concurrency tests use gated actual queries in synthetic PostgreSQL, with both completion and teardown awaited:

- Confirm vs legacy Library publish on the same file and current class revision: exactly one material; loser conflicts; no deadlock.
- Matching replay vs explicit delete, both schedules: replay wins and returns before deletion, or deletion wins and replay returns NOT_FOUND. Neither schedule recreates data or changes the receipt.
- Matching replay vs cleanup with storage.remove gated outside SQL: replay sees the existing tombstone and denies before blob acknowledgment; quota and cleanup lease behavior remain P6-owned.
- New confirm vs plan deletion/reorganization or archive: classroom lock orders them; winner's revision/state is rechecked by loser, no stale association or unintended publish.
- Confirm vs worker completion: PREPARING cannot publish; if completion wins, a caller carrying the earlier publication revision conflicts. If confirmation wins on READY, a stale completion cannot change PUBLISHED.
- Confirm vs receive/proof and incomplete-upload cleanup on its associated file: shared classroom lock and existing preparation reference prevent deletion or proof bypass. No storage work in confirmation.
- Invert source/destination UUIDs across two owned classrooms to exercise sorted multi-room acquisition, with independently gated concurrent writers. No SQL 40P01 or ignored timeout qualifies as PASS.

Later transport/UI cut: authenticated POST admission, Origin/CSRF, exact parser/no extra proof fields, no-store, safe error codes, client preserves request UUID and both CAS values after transport uncertainty, explicit student-visibility confirmation and real synthetic student Library read. These remain separate from repository completion.

## Verification

Read-only Get-Content/rg and git status/rev-parse inspection. Some first file/glob queries used nonexistent paths or Windows wildcard arguments rejected by rg; subsequent concrete paths located the parser and source. No functional tests, database, migrations or provider executed by this agent. Git fetch is required before the later migration authoring slice; it has not been performed for this no-migration design slice.

Own record structural validation exited 0: no trailing whitespace and both relative Markdown links exist. git diff --check for the record also exited 0; because the record is untracked, the direct content/link check is the meaningful document proof. Functional tests are not needed to validate this design-only change; specified behavioral RED and independent verification remain pending their implementation slices.

## Commits and outcomes

No commit by this agent. Existing uncommitted runtime/test work belongs to other agents and was preserved.

## Handoff

E1 contract and RED criteria were sent to /root while the rest of this design was completed. First executable task is E1 tests before helper extraction; E2 is the later fetch/migration and atomic confirmation unit, split into reviewed schema/repository/service cuts if necessary to keep units under 400 lines. The [prior lock analysis](2026-10-31-foxy-publication-confirmation-lock-design.md) is reconciled by this contract; the [feature scope](../../odd/tasks/foxy-ai-proposal.md) remains unchanged. Shared roadmap remains coordinator-owned.
