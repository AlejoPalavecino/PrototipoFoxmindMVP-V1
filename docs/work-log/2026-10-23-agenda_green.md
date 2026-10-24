# Agenda backend — implementation in progress

- Agent / role: agenda_green / slice_worker
- Session or task ID: /root/agenda_green
- Date: 2026-10-23
- Branch / worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind
- Starting commit: ed06f88
- Phase and task: [Agenda](../../odd/tasks/agenda.md), A0–A3
- Status: completed

## Request and scope

Implement the shared pure agenda contract, private event persistence, academic projection and authenticated HTTP API after independently observed RED. Frontend belongs to a separate worker. No tests, other agents' logs, roadmap, retained data, secrets or publication changes.

## Work performed

Read roadmap, record protocol, frozen agenda contract, public identity API and assigned classroom backend policies. Loaded clean-architecture and work-unit-commits; consulted Context7 for NestJS factory providers and Prisma relations. Followed independently observed RED from agenda_red before each implementation boundary.

Implemented A0 pure types, strict payload/range validation, IANA local-minute resolution and bounded weekly expansion. Implemented A1 private SQL repository, owner-filtered access, idempotent creation under owner lock, revision CAS, schema and additive migration. Implemented A3 application service, stable bounded pagination, strict HTTP routing/body limits, no-store, persisted-session admission, Origin/CSRF and revalidation after locks/operation. Agenda is composed for verified accounts independently of classroom/files configuration. A2 academic projection was transferred untouched to agenda_academic and is consumed through its public barrel.

Paths and line counts (new source files all below 200 lines; AST function-span check below 40):

| Path | Lines |
|---|---:|
| src/core/domain/agenda.ts | 53 |
| src/core/domain/agenda-ports.ts | 19 |
| src/core/domain/agenda-values.ts | 45 |
| src/core/domain/agenda-validation.ts | 48 |
| src/core/domain/agenda-time.ts | 30 |
| src/core/domain/agenda-series.ts | 44 |
| src/core/domain/index.ts | 7 |
| apps/api/src/agenda/agenda-service.ts | 66 |
| apps/api/src/agenda/database-types.ts | 10 |
| apps/api/src/agenda/event-repository.ts | 51 |
| apps/api/src/agenda/event-row.ts | 37 |
| apps/api/src/agenda/host.ts | 51 |
| apps/api/src/agenda/http-input.ts | 40 |
| apps/api/src/agenda/http-routes.ts | 49 |
| apps/api/src/agenda/http.ts | 45 |
| apps/api/src/agenda/index.ts | 5 |
| apps/api/src/agenda/integration.ts | 3 |
| apps/api/src/agenda/pagination.ts | 26 |
| apps/api/src/agenda/unit-of-work.ts | 32 |
| apps/api/src/application.ts | 79 |
| prisma/schema.prisma | 821 |
| prisma/migrations/202610230001_agenda_events/migration.sql | 46 |

Also modified apps/api/src/application.ts, prisma/schema.prisma and added prisma/migrations/202610230001_agenda_events/migration.sql. Schema is a pre-existing large generated-contract file; no unrelated schema refactor. integration.ts is an explicit public composition facade so importing the application service does not load Identity/Prisma runtime into pure unit tests. No environment variable was added.

## Verification

- `node --test --test-reporter=dot tests/agenda-contracts.test.mjs tests/agenda-time.test.mjs`: first implementation run 10 PASS.
- `node --test --test-reporter=dot tests/agenda-events.test.mjs`: first implementation run 5 PASS (suite later expanded by test owner).
- HTTP first run failed because eager identity barrel loaded Prisma import.meta in the CJS test harness. Removed runtime identity dependency from HTTP error formatting; second run HTTP3 PASS. No tests modified.
- `node node_modules/prisma/build/index.js validate`: PASS.
- First combined DB/identity run: DB PASS; identity fixture failed existing sessions_expiry_check when its expired-at value preceded created_at. Test owner corrected coherent fixture timestamps; no product policy changed.
- Final `node scripts/build-api.mjs`: Prisma generation and API TypeScript compilation exit 0.
- Final `node --test --test-reporter=spec tests/agenda-contracts.test.mjs tests/agenda-time.test.mjs tests/agenda-events.test.mjs tests/agenda-http.test.mjs tests/agenda-database.test.mjs tests/agenda-identity.test.mjs`: 24 PASS, 0 FAIL, 0 SKIP. Includes real migrated PostgreSQL CRUD/ownership/constraints and real HTTP persisted-session, verification, Origin/CSRF, revoked/expired-session and IDOR behavior. Disposable Docker fixtures cleaned up by test owner harness.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`: exit 0.
- `git diff --check`: exit 0.
- AST source-span check: all 19 new TypeScript files below 200 lines; every implemented function below 40 lines.
- Linter: unavailable; package has no lint script or lint configuration. No unsupported installation or false linter PASS claimed.

## Commits and outcomes

No commits created.

## Handoff

Coordinator should independently review A0/A1/A3, reconcile agenda_academic A2 evidence, and run full UI/runtime journeys after agenda_ui integration. No commit created: coordinator requested waiting for review. Academic and UI work, roadmap status and publication remain owned by coordinator/other workers. No circuit breaker activated: HTTP loader issue corrected on second run; identity fixture failure attributed to test owner and then independently reverified.

## Scoped correction round 1 — J1 / J2

Reopened only for two functional findings, both rated MEDIUM by both judges, on frozen round0 manifest `03e0f8af4e5b1ec9aa45155c25faed54bc1559f2e91671222ef65341a14848fd`. Their correction is included in the current implementation authorization; severity is not elevated. J1: one-day SQL date buffer omits a timed event across the 26-hour zone difference. J2: range reads resolve every occurrence of every weekly series before filtering, exceeding the existing transaction budget at modest cardinality. Loaded judgment-day as the bounded correction actor; coordinator owns the review outcome. Changes are restricted to repository range filtering and pure time/series helpers. Received independently observed RED from agenda_red for each finding before its correction. Existing preview/build artifacts remain untouched during independent browser verification.

- J1 fixed: repository SQL uses a conservative two-day buffer in each direction. Exact overlap is still filtered by the domain, with no extra visible day or truncation.
- J2 fixed: cheap wall-clock interval overlap rejects noncandidate weekly occurrences before resolving offsets. Multi-day intervals use both endpoints. A FIFO cache holds at most 64 Intl formatters; it caches formatters only, never resolved timestamps or DST validation decisions. Saving still validates every occurrence, including future gaps/ambiguities; 53-occurrence, 93-day, 200-item and 6000ms transaction limits remain unchanged.
- Initial focused J1 GREEN: `node --test --test-reporter=spec --test-name-pattern='persisted timed event' tests/agenda-regressions.test.mjs`, 1 PASS.
- Final focused checks: `node --test --test-reporter=spec --test-concurrency=1 tests/agenda-regressions.test.mjs tests/agenda-time.test.mjs tests/agenda-contracts.test.mjs`, 12 PASS, 0 FAIL, 0 SKIP. Real PostgreSQL/Prisma query for 80 valid annual 53-occurrence series returned first page 200 plus second page 120, 320 unique January occurrences. Diagnostic observed first monthly query **270ms**, unchanged production transaction budget **6000ms**. No build executed.
- `node node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit` and `git diff --check`: exit 0. AST spans: repository 52 lines / max function 11; series 55 / 19; values 62 / 17. Linter remains unconfigured.
- Rollback boundary: reverse only these round-one hunks in the three paths below (SQL buffer/comment; canOverlap filter/helper; formatter cache/helper/use). Do not reset/delete the earlier uncommitted Agenda implementation or other workers' edits. No schema, use-case timeout, transport, UI, tests or unrelated source changed in this round.
- Handoff: coordinator freezes this delta with test-owner regressions and runs scoped re-judgment J1/J2. No review verdict, commit or publication is claimed by this actor.
- Independent attributed evidence: agenda_red reported 19 PASS across regressions2/contracts5/time5/events7 after these fixes; no builds or weakened assertions. Actor's directly observed focused run remains the 12 PASS above.

### Round-one delta manifest

Base manifest: `03e0f8af4e5b1ec9aa45155c25faed54bc1559f2e91671222ef65341a14848fd`. Delta SHA-256 (JSON array with keys path,before,after,lines,maxFunctionLines): `aefa3f3ffef108f05b85a6234deafb26ad2a92be37f773c7b5d2f94dbe62fd16`.

| Path | Before SHA-256 | After SHA-256 |
|---|---|---|
| apps/api/src/agenda/event-repository.ts | 00918b854b7491cdc1807720ce712605072dd4f8eccf0bcf1f052086ccb30954 | a83cfa24c2fbe917d6bb0be41ff0c8f554debc5ca0f536cd05ecd23073ed5e7f |
| src/core/domain/agenda-series.ts | 3809cb28ef99d569bfd0b052c107d917cf9635f59298cf2d344645797992cb6e | 3929c66b6240ddffe8ed8ad85e52845aa5f727b1df5ccaf1608c55f95f14231e |
| src/core/domain/agenda-values.ts | 49555c15fe04eb6bf65280126cd8c2b91635d07d73fb0121d57c7934c020009a | dbdb3f8fb22d8557795370251d12cfefad60e5dc633deada71b93979f4f04498 |

Skill Resolution: fallback-path for `C:/Users/alejo/.codex/skills/judgment-day/SKILL.md`; paths-injected for `C:/Users/alejo/.codex/skills/clean-architecture/SKILL.md` and `C:/Users/alejo/.codex/skills/work-unit-commits/SKILL.md` already loaded during implementation. No subagent delegation or review performed by this actor.

## Final scoped correction round 2 — J3

Both judges corroborated J3 as MEDIUM: denied academic opening retained stale calendar/day/upcoming data. Read the coordinator's review ledger/re-judgment, Agenda component, useAgenda reload behavior and real-component hook regression. Test owner reported RED 2/2 before this correction. Ownership for this round is only apps/agenda-ui/Agenda.tsx and this record. Reuse reload on FORBIDDEN so both arrays clear before refresh settles; preserve the original error and existing refresh retry behavior. No builds, other source edits or memory writes authorized.

Observed GREEN: `node --test --test-reporter=dot tests/agenda-ui.test.mjs`, exit 0, both tests PASS on the first implementation run. Tests exercise Upcoming and AgendaDay entry points, immediate stale-data removal, failed refresh with visible error/retry and successful retry. No tests, dependencies, other source, builds or memory changed.

Minimal diff: the open catch retains setError and awaits the existing data.reload only when failure.code is FORBIDDEN. Production delta is apps/agenda-ui/Agenda.tsx only, 51 total lines, main component 31 lines. Final SHA-256 `09deff5c1428e77af780e46cceab5d38c0cfe646426d64b0b0e56f5ecffc13cf`. Source frozen after GREEN. Rollback boundary: remove only the added FORBIDDEN reload condition and restore the original single-line catch. Static/build checks were intentionally not rerun under the coordinator's focused-test-only instruction; no static PASS is claimed for this delta. Coordinator owns final scoped re-judgment; this actor claims no review verdict.

## Human-authorized J4 follow-up

The coordinator relayed explicit human authorization to fix and verify the captured reload after the dual-review budget ended; this is not a new judgment-day round and does not change the historical ESCALATED outcome. Independent RED confirmed a pending November open followed by December navigation and late FORBIDDEN restoring November data under December. Read the current component/hook and new third UI regression before editing. This follow-up owns only Agenda.tsx and this log, with no test edits, builds, other source or memory writes. Keep J3 privacy/error/retry behavior while selecting the latest reload when the asynchronous opening settles.

Implemented a stable currentReload ref, synchronized to data.reload in useEffect; the FORBIDDEN catch invokes currentReload.current instead of its captured data.reload. Context7 React documentation consulted for stable refs and effect/handler access; no ref mutation during rendering. Original J3 cleanup and error/retry paths remain in use.

Observed `node --test --test-reporter=dot tests/agenda-ui.test.mjs`: exit 0, 3/3 PASS on first run. This includes both privacy/retry entry points and the delayed November denial after December navigation. No builds or other checks run beyond requested focused tests and file metadata. Agenda.tsx is 53 lines, main component 33 lines; final frozen SHA-256 `5861b4a21e378af7731210c32c38dc83033e5aa28acd05e57a9b9f0d1dda6b7d`. Rollback boundary: only the useEffect import, currentReload ref/effect, and catch invocation substitution; preserve previous J3 handling. Source frozen for coordinator's independent verification. No new review round or approval claimed.
