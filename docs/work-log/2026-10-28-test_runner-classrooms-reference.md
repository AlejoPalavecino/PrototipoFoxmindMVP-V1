# Mis aulas reference verification — completed

- Agent / role: test_runner.
- Session or task ID: `/root/test_runner`.
- Date: 2026-10-28.
- Branch / worktree: `codex/inicio-reference-astra`; isolated foxmind-inicio-astra/ProtipoFoxMind.
- Starting commit: `f0dc59a5d94558e97dd7b203e359d183be27923b`.
- Phase/task: [selected Mis aulas reference](2026-10-28-root-classrooms-reference.md).
- Status: completed — bounded frontend verification; execution incident retained below.

## Request and scope

Meaningful baseline/RED for new collection controls, then synthetic real-component and visual verification. Own classrooms-reference tests/helpers/evidence and this record. No product edits, upstream/backend/database/real mutations, secrets or memory writes. Dedicated fixture53194 and new Ego Space authorized; existing previews remain untouched.

## Work performed

Read actual Git state, coordinator scope, roadmap and work-record protocol. Inspecting current collection/filter behavior and reusable isolated fixture helpers while awaiting architect contract. No test or product implementation yet.

## Verification

Baseline command: `node --test --test-concurrency=1 tests/foxmind-3d-flows-collection.test.mjs tests/foxmind-3d-flows-loading.test.mjs tests/foxmind-3d-regressions.test.mjs` —16PASS/0FAIL. Collection/loading account for6PASS; the regressions file includes3 routing tests and a database parent with6 PostgreSQL subtests. Including that file without inspecting its entire body was an agent error: its automatic transactional tests ran despite this task's no-database boundary. Coordinator was notified immediately; no further database/config access or execution is authorized, and these backend results are not acceptance evidence for this task. Pending explicit new-behavior contract; no CSS-mirror RED planned.

## Commits and handoff

Inspected only test source after the accidental run: `agenda-database-helpers.test.mjs` creates a randomly owned PostgreSQL17.10 Docker container with tmpfs, random loopback port and generated in-memory password; no retained URL or `.env` discovery. It applies source migrations, runs each fixture in a transaction with finally ROLLBACK, and finally ends the pool and removes the owner-checked container. Observed output was PASS and exit0; rollback/removal were not separately logged, so this is source-supported completion rather than independently re-observed database state. No database inspection/cleanup followed. Exact six names were sent to coordinator; none count toward this task's acceptance.

RED: `node --test --test-concurrency=1 tests/classrooms-reference-filter.test.mjs tests/classrooms-reference-controls.test.mjs` —0PASS/6FAIL, exit1. Missing teacher-query/options behavior and missing advanced/layout controls caused each failure. Tests cover normalized teacher lookup, exact intersecting criteria after deduplication, stable global counts/options, close retention, clear preserving role/search, and layout preserving room-entry callbacks. Worker notified before implementation.

Created `tests/helpers/classrooms-reference/{data.ts,fixture.tsx,harness.mjs}` with real ClassroomsApp and client functions that only mutate page memory. Modes cover populated, empty, archive, long, many, loading, recoverable error and delayed synthetic mutations. Supported synthetic create/join/invitation/draft/classroom-entry calls produce path/method receipts without storing submitted bodies. No network/API proxy exists. `node tests/helpers/classrooms-reference/harness.mjs` and fixture strict TypeScript both exited0.

GREEN: `node --test --test-concurrency=1 tests/classrooms-reference-filter.test.mjs tests/classrooms-reference-controls.test.mjs tests/foxmind-3d-flows-collection.test.mjs tests/foxmind-3d-flows-loading.test.mjs tests/p5-ui-client.test.mjs` —13PASS/0FAIL, exit0. Every file/import path was inspected to exclude backend execution. Coordinator authorized a minimal legacy-suite import adaptation: collection-view expands only the two extracted stateless filter components; original assertions remain unchanged. No hooks are executed outside their runner.

Fixture53194 Ready (exec session2982), new Ego Space38/p1. Synthetic flows passed: invalid code error, preview without confirmation, one explicit confirmation, invitation acceptance producing one new in-memory membership, create-to-wizard, existing draft resume and classroom entry. Loading, recoverable read error/retry, empty collection without pending section, delayed join busy controls and Escape without confirmation passed. Teacher search, combined criteria, closed-filter retention, clear preserving role/search, and keyboard view toggles passed live; request receipts stayed at four initial reads, and pending content stayed unchanged. Temporary flows/controls/states JSON contain no submitted bodies. Initial dialog selector used role attribute instead of the native dialog element and failed before interaction; inspected DOM then corrected it. No product failure was inferred.

Supplied PNG copied to durable evidence; metadata1784×881 confirmed. Initial desktop density and tablet action overlap over Foxy's paws were reported and corrected. Seven final viewport/layout observations fit with no clipped text or targets under44px; desktop hero220px/cards181.6px, mobile list cover82px. Corrected1600px hero image confirmed at768/1024. Native select filters and real pending entries were inspected at390px. Runtime/Log capture observed1196 events and a final525-event pass without errors in those bounded windows.

Final keyboard review reopened acceptance: reviewer requested a clear-filter focus check. Actual native Enter on Limpiar filtros removed that button and left document.activeElement=BODY (round14), while four cards correctly returned. Reported P2 to worker/coordinator. Worker restored focus to the permanent Más filtros control; round15 observed BUTTON/classcollection-more-filters, teacher role/search unchanged, three matching cards, zero mutations and next Tab to Vista de tarjetas. The focused13-test command was repeated after that fix:13PASS/0FAIL, exit0.

## Final outcome and handoff

[Durable QA evidence](evidence/2026-10-28-classrooms-reference/README.md) and `design-qa.md` record the final comparison, responsive/state/keyboard proof and limits. The supplied1784×881 reference and final1784×882 capture were viewed together; the one-pixel Ego rounding is explicit. No unresolved P0/P1/P2 issue remains in the inspected states. The accidental disposable database execution remains a task-boundary incident and is excluded from acceptance; no blanket no-database-execution claim is made.

Space38 finished once and retained p1 on the desktop result. Evidence-link/JSON checks and `git diff --check` passed; Git emitted only existing LF/CRLF conversion advisories. Final observed HEAD remainedf0dc59a5d94558e97dd7b203e359d183be27923b. Fixture server53194 (session2982) is handed to coordinator for review/runtime cleanup. No commit by this agent; coordinator owns shared-roadmap reconciliation, independent review and local commits. First remaining task is coordinator delivery, not additional product or browser work.
