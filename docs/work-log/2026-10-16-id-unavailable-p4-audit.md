# P4 audit and completion — in progress

- Agent / role: current P4 coordinator and audit/fix writer.
- Session or task ID: unavailable; no registered runtime identity exposed.
- Date: 2026-10-16.
- Branch / worktree: codex/p4-private-files / C:/Users/alejo/.codex/worktrees/foxmind-p4-files/ProtipoFoxMind.
- Starting commit: 179eb4c1d0b39b38ba4e02249f2c60958cad31ce; initially clean.
- Phase/tasks: P4; odd/tasks/p4-private-files.md; functional specification sections2/5/7/14/15.
- Status: in_progress.

## Request and scope

User: "Bien hace la revisión de la P4 y si esta implementada al 100% avísame, si no, no pares hasta que esté implementada". Audit and close all implementable P4 gaps in its own worktree. Prior no-P3/no-merge/deferred-integration boundary remains unless explicitly changed. The newly provided AGENTS replaces earlier instructions; its current nine-operation P3 checkpoint is live in the original checkout at0fd271c and does not describe the older P4 branch base. Preserve original worktree and its ongoing recovery work. No publication, global runtime synchronization or destructive data authority inferred.

## Work performed

Read roadmaps/protocol/task, relevant confirmed rules and files source. Original checkout was inspected read-only. Current P4 implementation has required session/record ports, manual cleanup and no real record resolver or automatic cleanup worker. These are being audited as concrete completion gaps, not counted away by prior45checks. Native read-only v2 status still reports stop/managed_assets_outdated; no global sync or review transition performed. Engram writes remain prohibited without registered identity. Requested explicit authorization for independent read-only agents; no agent spawned before an answer.

## Verification

Git status/log: P4 clean at179eb4c; original branchfeat/p33-token-flows at0fd271c with protected dirty/ongoing P3 records. No source tests rerun yet. Native status0 with next_transition stop/managed_assets_outdated. No approval or independent verification claim.

## Commits and outcomes

Cleanup lifecycle unit: added immediate/periodic bounded incomplete cleanup through the opt-in Nest module, with no overlap, retry after errors, fixed sanitized diagnostics and shutdown awaiting its owned work. Paths: apps/api/src/files/{cleanup-worker,files.module,index}.ts, tests/p4-cleanup-worker.test.mjs, scripts/test-p4.mjs, docs/private-files.md. Meaningful RED3fail (missing lifecycle) -> GREEN3PASS, then actual Nest createApplicationContext/close integration added and GREEN4PASS via node --test tests/p4-cleanup-worker.test.mjs. Strict build0. Rollback removes only this opt-in worker/provider/export/test/suite entry; manual service cleanup remains. No independent/native approval claimed.

## Handoff

Cleanup implementation committed as f2f9a0e. Record-authorization unit adds concrete P4 resolver and request forwarding, plus real SQL/material/activity/attempt fixtures. Meaningful permissive-stub RED: unlinked student reads, private instructions and bypassed editor callback each failed expected rejection; one dependent revocation fixture failure was not valid RED. Earlier and intermediate fixture setup failures (invalid INITIAL enum, missing membership end actor, missing publication unit/topic, submission markers) remain attributed, corrected without relaxing database invariants. Actual GREEN22PASS/cleanup0 observed after corrections; a later added same-classroom peer check will be included in final run. Strict build0. Trusted P3 authenticate/P7 editor-deadline-count ports remain required; this implements record access without implementing P3/P7. Rollback access.ts/export and request forwarding/tests/docs only; base service remains opt-in and requires a resolver. No independent/native approval.

Next audit unit: safe confirmed draft-plan promotion into its actual published classroom, retaining immutable bytes/identity, authorized owner and quota transfer. Additive forward migration only; no publication wizard/P3 changes. Verify transaction rollback and quota race, then full isolated regression/persistence.

Audit requirement coverage and failure cases, implement/fix with meaningful RED/GREEN, obtain independent verification if authorized, reconcile native blocker without touching shared P3 configuration, and report exact isolated completion versus deferred integration. First checks: automatic incomplete cleanup lifecycle, concrete record authorization/private attempts and draft-to-classroom file promotion.
