# Classroom extraction durable jobs — in progress

- Agent / role: ai_jobs_green / slice_worker
- Session or task ID: /root/ai_jobs_green
- Date: 2026-10-23
- Branch / worktree: codex/classroom-gemini; isolated classroom-gemini worktree
- Starting commit: ed06f885bfbf08725024013a7a45c9a3a723cfc7
- Phase: C3/C4 in [feature](../../odd/tasks/classroom-ai-extraction.md)
- Status: completed

## Request and scope
Implement approved D1:A durable extraction service, PostgreSQL migration, worker and actual host integration. Other agents own domain/provider/readers and tests; preserve their edits. No tests edited, no commits or publication.

## Work performed
Read contracts, RED tests, current composition and lock conventions. Context7 consulted for Prisma raw parameterized transactions. Implemented source/version deduplication, owner and verification locks, durable queue claims/fencing, global and actor usage reservations, strict proposal parsing, explicit retry successors and atomic reviewed apply. Start/get/retry/apply use brief DB transactions; provider/private byte I/O runs outside the calling transaction. The files-owned durable reader uses a WeakMap capability checked against this worker's nonce. Credentials remain confined to the injected provider.

The optional host capability is `ApiConfiguration.ai`; test composition is `ApplicationOptions.ai = { provider }`. `ClassroomAiRuntime` exposes `.service` and `.worker`, starts polling only at module initialization, and the root drains it before file/storage/database teardown. Routes use existing single admission, session, Origin/CSRF and body limits. Disabled capability returns sanitized `AI_UNAVAILABLE` while manual classrooms remain available. Start returns202 when created and200 on deduplication.

Reservations use counted input plus configured maximum output, integer microUSD and separate ceiling for each component. Missing final usage consumes the complete reservation. Stale source invalidation locks the current job and settles conservatively before clearing the lease. UTC accounting day is stable within each transaction. Unknown dispatched outcomes never resend automatically. This implementation uses explicit teacher retry for known transient failures too; no automatic backoff is claimed. DOCX image omission warning is deterministic even if the provider omits it.

Owned paths and final line counts:

- `apps/api/src/classrooms/ai/budget.ts`50, `contracts.ts`29, `database.ts`38, `execution.ts`32, `http.ts`29, `index.ts`3.
- `apps/api/src/classrooms/ai/queue.ts`42, `requests.ts`19, `runtime.ts`22, `service.ts`76, `source.ts`35, `worker-source.ts`35, `worker.ts`110.
- `apps/api/src/application.ts`75; `configuration.ts`39; `classrooms/http.ts`373; `classrooms/host.ts`81; `classrooms/classrooms.module.ts`59.
- `prisma/schema.prisma`867; `prisma/migrations/202610230001_classroom_ai/migration.sql`54.
- This work record. Existing HTTP/schema files exceeded200 before this slice; new implementation files remain below200 and functions below40.

## Verification
- `node --test --test-reporter=dot --test-concurrency=1 tests/classroom-ai-jobs.test.mjs tests/classroom-ai-states.test.mjs tests/classroom-ai-budget.test.mjs`: final exit0,16 passing cases including deterministic DOCX warning. Real disposable PostgreSQL fixtures, no retained database.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit --pretty false`: repeated final exit0 after host and warning integration.
- `node node_modules/prisma/build/index.js validate`: exit0. Coordinator's live drift check identified clock_timestamp/default and PostgreSQL-truncated index-name mismatch; schema mappings corrected. Coordinator owns final migration-drift/live-host evidence.
- `git diff --check`: exit0. No configured eslint/biome/lint command exists; whitespace verification is not claimed as an unavailable semantic linter.
- Historical failures remain explicit: initial quota test changed protected file identity and hit23514; test owner corrected fixture. A later jobs run used a global active-transaction counter and falsely counted another worker's claim; test owner switched to AsyncLocalStorage without relaxing the own-transaction I/O assertion. A subsequent suite passed. This agent never edited tests.
- No same production defect failed twice after correction; circuit breaker not activated. Engram mem_save unavailable: PreToolUse hook rejected the unregistered Codex host session. Repository evidence remains complete.

## Commits and outcomes
No commit performed; coordinator owns reviewable units and any authorized commits. Completed assigned backend slice and host composition; full feature/UI/live acceptance remains coordinator-owned.

## Handoff
Coordinator: rebuild after latest worker DOCX warning, reconcile actual host/migration/live evidence and independent audit before closing the feature. `ClassroomAiRuntime` lives in `apps/api/src/classrooms/ai/runtime.ts`; test-safe service/worker barrel excludes Nest runtime imports. Reuse final tests; no publication/deployment or real Gemini credit use performed.

## Independent-review correction follow-up — completed

Coordinator assigned confirmed JD1/JD2 and independently reproduced JD3/JD4 after RED evidence from test_runner. Ownership extended to `files/durable-plan-reader.ts`; tests remain read-only. JD1 will make bounded calls lazy and observe initiated promises; JD2 will isolate private FileService read admission per grant; JD3 will release a pending claim if shutdown began; JD4 will terminate age-expired work without granting expired private reads. No unrelated defects or Engram hook retries are included.

Implemented `bounded(() => operation(), signal)` with a pre-abort gate, synchronous-throw handling and rejection handlers on every initiated promise; all three reader/count/extract callers updated. Durable reads now allocate their own private FileService admission slot while keeping existing capability checks and shared storage/database. When shutdown races a pending claim, the worker releases the same undispatched nonce to QUEUED and returns without reading bytes or contacting a provider. Initial queue-age expiration is recognized before invoking snapshotWorker; valid owner/source identity terminates as FAILED/AI_TIMEOUT, and expired grants remain forbidden.

Correction paths: `apps/api/src/classrooms/ai/execution.ts`38 lines, `worker.ts`126 lines, `apps/api/src/files/durable-plan-reader.ts`57 lines, and this attributed record. No test or worker-source changes were necessary. Every new/changed function remains below40 lines; production correction files below200.

Observed first-attempt verification:

- `node scripts/build-api.mjs`: exit0, fresh Prisma generation0 and strict TypeScript compilation0 within the existing30s shared build deadline.
- `node --test --test-reporter=dot tests/classroom-ai-abort.test.mjs`: exit0,3 cases including child process with strict unhandled rejection policy.
- `node --test --test-reporter=dot --test-concurrency=1 tests/classroom-ai-abort.test.mjs tests/classroom-ai-reader.test.mjs tests/classroom-ai-lifecycle.test.mjs tests/classroom-ai-states.test.mjs`: exit0,15 cases, including real PostgreSQL and actual compiled private reader.
- `git diff --check`: exit0. No semantic linter configured. No production failure or circuit-breaker strike during this correction.

Handoff: source frozen and coordinator/test_runner notified. Coordinator owns full regression/live verification and independent re-judgment; no approval, commit or publication inferred. No further Engram hook call attempted under the known unavailable session binding.
