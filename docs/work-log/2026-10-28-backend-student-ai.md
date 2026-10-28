# Student AI backend — preparation

- Agent / role: backend slice worker
- Session or task ID: /root/backend
- Date: 2026-10-28
- Branch / worktree: codex/student-journey-polish, shared checkout
- Starting commit: abcfbab6c01acc0cc85972f5561876ebabaac97f
- Phase and task: current student AI analysis request; coordinator record 2026-10-28-root-student-ai.md
- Status: in_progress

## Request and scope
Prepare automatic persisted teacher-only student analysis; anonymous evidence, shared budget, active membership and authorization recheck. Do not edit tests or UI. Await RED before production edits.

## Work performed
Inspected roadmap, work-record protocol, clean-architecture skill, Git state, classroom progress, AI budget, module and routing. Other agents own concurrent changes.

## Verification
Read-only inspection only; no tests run. Existing working tree changes preserved.

## Commits and outcomes
No commit.

## Handoff
Await coordinator signal confirming RED. Implement domain evidence validation and periodic worker with persisted results after confirmed contract and test evidence.

## Implementation and evidence
- Implemented domain evidence, anonymized references and report validation; confirmed attempt count is included when available.
- Added a migration-backed per-enrollment report table and periodic bounded scanner with leases, nonce fencing, evidence hash deduplication, teacher verification, membership revalidation, shared budget reservation/settlement, bounded predispatch retry and conservative unknown-dispatch handling.
- Integrated Gemini adapter using installed @google/genai 2.31.0 patterns; Context7 lookup failed with `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` Version-specific documentation could not be confirmed through Context7.
- Added teacher-only GET ai-summary, stale-hash suppression and DISABLED state when AI is not configured; wired runtime and graceful shutdown. References A1 etc. are anonymous and are not mapped back to activity titles for presentation.
- Changed `apps/api/src/application.ts`, `apps/api/src/classrooms/{activity-ai/queue.ts,ai/budget.ts,ai/queue.ts,classrooms.module.ts,contracts.ts,http.ts,progress.ts,student-ai/provider.ts,student-ai/runtime.ts,student-ai/worker.ts}`, `src/core/domain/{index.ts,student-ai.ts}`, `prisma/migrations/202610280001_student_ai/migration.sql`.
- No tests or UI files edited by this worker. Other agents concurrently own tests and UI.

## Observed checks and limitations
- `npm run api:build`: PASS after runtime wiring, Prisma client generation and TypeScript API compilation.
- `node --test --test-reporter=dot tests/student-ai-contract.test.mjs tests/student-ai-integration.test.mjs`: 7 PASS, 0 FAIL, including simulated replaced-lease fencing; additional integration tests are being authored independently.
- Earlier worker import failed due to Node strip-only parameter property; fixed. Initial integration fixtures had submission-clock and invalid membership-transition errors, corrected by test owner; historical failures were not hidden.
- No configured eslint-plugin-boundaries, tach or golangci-lint found in package.json; mechanical boundary verification unavailable. No real provider invocation, actual runtime launch, migration on retained database, deployment, push, or commit performed.

## Handoff — in progress
Coordinator must run final independently authored quota/concurrency/recovery tests, verify integration and review before completion. Context7 quota failure and unmapped anonymous references remain explicit limitations. No new commit identity.
`nFollow-up: studentProvider override prevents real provider use when an injected test override lacks a student provider. API build PASS; git diff --check PASS; focused contract and integration run 8 PASS, including disposable-database shared-budget retry. Coordinator owns final verification. No real provider call or retained-data migration.

## Follow-up verification
Added injected `studentProvider` override: with a fake AI override and no student provider, student AI is disabled rather than using the real provider. After that change, `npm run api:build` PASS, `git diff --check` PASS, and focused contract/integration run PASS 8/8. Shared-budget retry test uses disposable PostgreSQL. Coordinator owns final verification and status; no real AI call or retained-data migration performed.
