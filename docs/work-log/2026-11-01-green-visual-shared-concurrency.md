# Shared AI concurrency for visual jobs — in progress

- Agent / role: /root/green_diagram, slice worker
- Task ID: /root/green_diagram
- Date: 2026-11-01
- Branch/worktree: codex/foxy-ai, C:/Users/alejo/.codex/worktrees/foxmind-foxy-ai
- Phase: visual generation shared concurrency, docs/work-log/2026-11-01-architect-visual-generation-integration.md
- Status: in_progress

## Scope
Include active visual jobs in existing AI queues' global and owner concurrency checks, preserving advisory lock and unrelated behavior. No tests, visual queue, runtime or provider edits.

## Work performed
- Included live visual leases in shared global and owner admission checks for Foxy text, curriculum extraction, activity generation, student reports and grading jobs. Curriculum/activity fairness excludes earlier candidates whose owner is busy with a live visual job.
- Preserved shared advisory lock and counted only unexpired visual leases; no modifications to visual queue, tests or runtime.

## Verification
- After confirmed RED, node --experimental-transform-types --test --test-reporter=dot apps/api/src/foxy-ai/foxy-visual-cross-admission.test.mjs apps/api/src/foxy-ai/foxy-turn-queue.test.mjs: 40 cases PASS including five modes, global/owner and expired-lease controls.
- npm run api:build --silent and npm run lint:boundaries --silent: exit 0. Actual PostgreSQL test fixtures are isolated/rolled back; no provider or retained resources.

## Handoff
Independent audit requested. This establishes admission contention only; complete visual generation, remote provider/custody compatibility and browser flow remain separately pending.
