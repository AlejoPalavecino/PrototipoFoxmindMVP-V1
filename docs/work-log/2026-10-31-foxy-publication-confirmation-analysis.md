# Foxy publication confirmation — read-only handoff

- Agent / role: /root/foxy_visual_green / slice worker, inspection only
- Session or task ID: /root/foxy_visual_green (publication confirmation analysis)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 49deb37; concurrent uncommitted runtime/worker edits exist
- Phase: Foxy READY to Biblioteca confirmation, next slice
- Status: completed (inspection only)

## Request and scope
Inspect implementation needed to confirm a READY publication in classroom library; no production changes, retained data or secrets.

## Work performed
Read `apps/api/src/classrooms/library.ts` (changeLibrary and materialAssociation), `apps/api/src/classrooms/plan.ts` (readyClassroomFile/advanceRevision), Foxy resource parser, publication repository/completion, schema and file cleanup. Existing `parseConfirmFoxyPublication` requires exactly requestId, publicationRevision, classroomRevision and confirm=true; no Foxy confirmation endpoint/service exists. READY stores file and artifact proof; it does not create material. Existing library publication requires active teacher classroom, matching classroom CAS, valid current unit/topic hierarchy, ready scoped material file with no blob deletion, unlinked file, insert material and advance classroom revision.

## Proposed next implementable cut
TDD repository/service confirmation with one database transaction and no external storage write: authenticated verified teacher, lock owner and source/destination classrooms in consistent order, lock source conversation/resource and publication, then units/topics and file/upload/custody in existing common order. Recheck active destination/ownership, source authorization and resource revision per P3C policy, state READY and publication revision, classroom revision, hierarchy, material file ownership/scope, completed upload and ready custody with matching artifact/validated/scanned digests, clean/approved statuses, and blob_deleted_at NULL. Assert no existing material references file; insert one material and advance classroom revision atomically; update publication to PUBLISHED with material ID and revision, store request hash and result in a dedicated confirmation idempotency record with unique owner/request key. Migration must model relations and constraints without drift and prevent duplicate material association under concurrency. Do not invoke LibraryService in a nested transaction; extract/share an in-transaction helper if architecture allows, otherwise preserve exact invariants with reviewed SQL. Existing material deletion semantics must remain intact; never recreate a deleted material on replay.

Authenticate and recheck access before replay. Matching request/hash should return recorded result before checking current CAS, including classroom later archived if access still authorized; changed input conflicts. Decide/document replay after material deletion as historical receipt versus sanitized deleted status, never resurrect it. A different request after publication must not create a second material. Return only publication/material IDs and revisions, no digest, file storage identifier or snapshot. Route requires admission, CSRF/Origin for POST, strict domain parser, safe errors, no-store.

## Verification
Inspection only; no functional checks executed. Proposed RED coverage: single successful confirmation makes material visible to student library; teacher/foreign/student and archived/deleted/revoked denial; stale publication/classroom/source revisions; historical removed/moved unit or topic; file ownership, blob deletion, upload, scanner and digest mismatches; forged proof; matching replay before stale CAS, changed request conflict, deletion and archive replay; concurrent same and distinct keys yield exactly one material and one revision increment; injected failure rolls back material/publication/request/revision; schema drift; HTTP admission/CSRF and opaque DTO; no storage I/O. Integration must check lock order against simultaneous library deletion, file cleanup, worker completion and classroom edits.

## Commits and outcomes
No source edits or commit by this worker.

## Handoff
Coordinator/architect to choose exact replay-deletion response and lock order; test runner to write RED for the transactional repository/service cut before implementation. Subsequent cut can expose HTTP/client/UI and exercise real end-to-end flow.
