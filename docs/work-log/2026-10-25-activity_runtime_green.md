# Activity AI runtime — in progress

- Agent / role: activity_runtime_green / slice worker
- Session or task ID: /root/activity_runtime_green
- Date: 2026-10-25
- Branch / worktree: codex/classroom-activity-ai
- Starting commit: af48e698aa575733e60a9e900875075dda77e138
- Phase: [classroom activity AI](../../odd/tasks/classroom-activity-ai.md), A3/H1
- Status: completed

## Request and scope
Implement durable activity generation execution, shared extraction admission/budget and local runtime/HTTP glue. No tests, secrets, real provider calls, commits or publication. Other workers own domain, services, reader/provider, schema and UI.

## Work performed
Implemented fenced activity jobs, stable capability grants, same-actor/global admission across both queues, conservative shared-budget reservation and settlement in the existing study-plan-v1 bucket, source/curriculum revalidation at execution boundaries, aggregate source limits and closed provider-envelope validation. Added activity runtime and all specified HTTP routes with existing session/Origin/CSRF admission. Shutdown aborts and drains activity worker before storage/database teardown. Other agents authored service/domain/reader/provider/schema/UI.

Affected production paths (lines at handoff):
- apps/api/src/classrooms/activity-ai/queue.ts: 50
- apps/api/src/classrooms/activity-ai/budget.ts: 11
- apps/api/src/classrooms/activity-ai/worker.ts: 115
- apps/api/src/classrooms/activity-ai/worker-source.ts: 32
- apps/api/src/classrooms/activity-ai/execution.ts: 38
- apps/api/src/classrooms/activity-ai/runtime.ts: 23
- apps/api/src/classrooms/activity-ai/http.ts: 23
- apps/api/src/classrooms/activity-ai/index.ts: 4
- apps/api/src/classrooms/ai/queue.ts: 50
- apps/api/src/classrooms/ai/budget.ts: 55
- apps/api/src/classrooms/ai/runtime.ts: 23
- apps/api/src/classrooms/http.ts: 379 (existing larger router; minimal route integration)
- apps/api/src/classrooms/host.ts: 82
- apps/api/src/classrooms/classrooms.module.ts: 62
- apps/api/src/application.ts: 86

## Verification
- node scripts/build-api.mjs: exit 0 (Prisma + API compilation), before final equality/aggregate/ledger refinements; coordinator owns latest final build.
- node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --pretty false: exit 0 after refinements.
- node --test --test-concurrency=1 tests/activity-ai-jobs.test.mjs tests/activity-ai-lifecycle.test.mjs tests/activity-ai-budget.test.mjs tests/activity-ai-source-limits.test.mjs: 30 PASS / 0 FAIL.
- node --test --test-concurrency=1 tests/classroom-ai-budget.test.mjs tests/classroom-ai-jobs.test.mjs tests/classroom-ai-lifecycle.test.mjs tests/classroom-ai-host.test.mjs: 19 PASS / 0 FAIL.
- After explicit capability filtering and max-age authorization hardening: node --test --test-concurrency=1 tests/activity-ai-budget.test.mjs tests/activity-ai-lifecycle.test.mjs tests/classroom-ai-budget.test.mjs: 22 PASS / 0 FAIL (includes independently added malformed-envelope and conservative-charge assertions).
- git diff --check: exit 0 (existing CRLF notice only).
- Linter unavailable: package.json defines no lint script and no ESLint/Biome configuration was found. Static compilation and whitespace checks observed; no linter PASS claimed.
- Preserved first failures: first typecheck awaited reader factory export; initial source-direct import failed on TypeScript parameter property and was changed to erasable explicit field assignment. Initial behavior run 8 PASS / 16 FAIL exposed JSONB key-order equality; fixed structural comparison jointly with AI service owner. Following runs passed. No test file was edited by this worker.

## Commits and outcomes
No commits created. This is focused A3/H1 GREEN evidence, not whole-feature acceptance or publication.

## Handoff
Coordinator must run final compiled/live HTTP journey, independent review and UI acceptance. Parent notified of AI-disabled publication boundary: previously generated drafts must still revalidate provenance when AI runtime configuration is absent; optional publication callback needs review. Source/provider/privacy integration owned by AI worker and topic persistence by MT worker. No secrets, retained configurations, real model calls, commits or remote publication used.
