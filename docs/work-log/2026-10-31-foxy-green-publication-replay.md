# Foxy publication replay and schema correction — in progress

- Agent / role: /root/foxy_visual_green / slice worker
- Session or task ID: /root/foxy_visual_green (P1 replay correction)
- Date: 2026-10-31
- Branch / worktree: codex/foxy-ai / C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Starting commit: 0b1c627
- Phase: Foxy publication intent P1
- Status: blocked

## Request and scope
Allow authorized replay after archiving without resurrecting deleted conversations; remove topic/unit FKs; model classroom relation with no schema drift.

## Work performed
Moved replay before active destination validation, retained source authorization, removed unit/topic foreign keys, added classroom relation. An extra inverse relation was also inserted in User.

## Verification
Focused tests: 4 passed, drift test failed (Prisma diff exit 1). lint:boundaries exit 0. api:build failed twice consecutively with P1012: Error validating field `foxy_publications` in model `User`: The relation field `foxy_publications` on model `User` is missing an opposite relation field on the model `FoxyPublication`. First attempted removal did not match line endings. Circuit breaker activated; no further source changes.

## Commits and outcomes
No commit made by this worker.

## Handoff
Escalate to architect. Inspect/remove erroneous User inverse only, preserve Classroom inverse; rerun build, migration drift and focused tests.
