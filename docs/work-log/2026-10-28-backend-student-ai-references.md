# Student AI reference mapping — preparation

- Agent / role: backend slice worker
- Session or task ID: /root/backend
- Date: 2026-10-28
- Branch / worktree: codex/student-journey-polish, shared checkout
- Starting commit: abcfbab6c01acc0cc85972f5561876ebabaac97f
- Phase and task: current student AI teacher reference mapping; coordinator record 2026-10-28-root-student-ai.md
- Status: in_progress

## Request and scope
Return evidenceReferences [{ref,title}] to authorized teachers for READY reports only. Keep private activity IDs and titles out of provider inputs; persist and verify ref-to-ID mapping against the same snapshot. Do not change tests or UI; await RED before production edits.

## Work performed
Inspected progress service, worker, domain evidence, migration, working tree and work-record protocol. Existing evidence hash does not distinguish reordered identical activities, so coordinator approved a deterministic internal hash over evidence and private mapping; mapping stays local.

## Verification
Preparation only; no tests run. Other agents' working tree changes preserved.

## Commits and outcomes
No commit.

## Handoff
Await independently authored RED, then implement private snapshot mapping, local hashing, membership/freshness recheck and authorized title resolution.
`nImplementation: private snapshot ref-to-ID mapping and internal hash, stored in new migration; verified before dispatch and authorized GET resolves current titles. Prisma StudentAiReport model added for schema drift; no data changed. API build PASS (after correcting TS2339), 10/10 focused tests PASS, git diff --check PASS. Mechanical boundaries linter unavailable. Context7 quota unavailable; no new library API. No real provider request, retained migration, or commit. Independent review and isolated migration drift verification ongoing; coordinator owns final integration.
