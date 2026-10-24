# Agenda — independent test-first work

- Agent / role: /root/agenda_red, test_runner.
- Session or task ID: /root/agenda_red.
- Persisted by: /root coordinator, from test_runner reports (test-only role cannot write documentation).
- Date: 2026-10-23.
- Branch / worktree: codex/foxmind-agenda; C:/Users/alejo/.codex/worktrees/foxmind-agenda/ProtipoFoxMind.
- Starting commit: ed06f885bfbf08725024013a7a45c9a3a723cfc7.
- Phase and detailed task/spec links: [Agenda](../../odd/tasks/agenda.md).
- Status: in_progress.

## Request and scope

Create meaningful failing tests before implementation, then verify GREEN and actual isolated integration. User confirmed single events and weekly recurrence. Test ownership separate from production workers.

## Work performed

Read AGENTS, work-log protocol, roadmap, frozen agenda contract and existing TypeScript test loader. No go.mod present; Go skill does not apply. Coordinated pure function signatures with architect and worker. Personal-event target links were removed from the design scope; academic deadline opening remains.

## Verification

Initial RED reported by test_runner: node --test --test-reporter=dot tests/agenda-contracts.test.mjs tests/agenda-time.test.mjs; exit1,10tests fail because src/core/domain/index.ts does not exist. This proves missing production modules, not a runtime service failure. Domain worker notified to begin GREEN. Service/client/proxy/integration suites remain pending.

## Commits and outcomes

No implementation or completion acceptance claimed. Tests authored by test_runner; coordinator persists this attributed evidence only.

## Handoff

## Incremental verification reported by test_runner

Nine suites plus one helper were authored in tests/agenda-{contracts,time,events,client,proxy,http,database,academic,identity}.test.mjs and agenda-database-helpers.test.mjs. All passed node --check and each file remained below200lines. RED was observed before implementation for domain10, initial service5, client/navigation/proxy5, HTTP3, DB1, academic1 and persisted-identity1. The identity RED used actual PostgreSQL and identity host; the agenda route was still absent.

Independent incremental GREEN: domain10, initial service5, HTTP3 and frontend5. Two added service cases cover pagination205items and strict revision/target validation; their combined final run remains pending here. PostgreSQL helper owns only its isolated agenda_test instance and rolls each fixture back.

Historical fixture corrections: academic submitted_at was fixed to noon while opened_at defaulted to the later real clock, producing PG23514 attempt_submission_check. Test runner set opened_at to submitted_at minus1hour. Session expiry preparation likewise violated sessions_expiry_check; test runner set created_at=now-2h,last_seen_at=now-1h,expires_at=now-1m. Assertions and database constraints were not relaxed. Specific reruns: node --test --test-reporter=dot tests/agenda-academic.test.mjs exit0,6PASS including parent; tests/agenda-identity.test.mjs exit0,1PASS. These replace preparation failures with new observed evidence, not retroactive PASS.

No browser Space used yet. Latest test runner report identifies remaining action as final combined suite and real UI/API/SQL journey.

## Next action

Run combined suites against the final build, then independent ego-browser verification in one dedicated Space. Coordinator persists this attributed report; test_runner did not edit documentation or production code.

## Confirmed review regressions — round1

Added tests/agenda-regressions.test.mjs. J1 real PostgreSQL RED: Kiritimati event in Etc/GMT+12 day query returns0instead of1. J2 first experiment with in-memory auth returned320items after29.3s(first page11.5s); it did not fail because no post-expansion I/O enforced the transaction deadline. This was not labeled RED. Corrected preparation to re-query persisted actor on each authentication callback, matching actual identity I/O. Specific command node --test --test-reporter=dot --test-concurrency=1 --test-name-pattern='eighty valid' tests/agenda-regressions.test.mjs then failed SERVICE_UNAVAILABLE at unchanged6000ms UoW budget (13.36s command). Assertions require200+120items and320unique occurrences, not a synthetic timing threshold. node --check, git diff --check and owner-container cleanup passed. Production fixes assigned separately to agenda_green.

Independent GREEN after separate worker fixes: node --test --test-reporter=dot --test-concurrency=1 tests/agenda-regressions.test.mjs tests/agenda-contracts.test.mjs tests/agenda-time.test.mjs tests/agenda-events.test.mjs;19PASS,0FAIL,exit0,6.87s. J1 retrieved the26hour-offset event and excluded the next day; J2 returned200+120=320unique occurrences within the actual unchanged transaction budget. DST, all-day exclusive boundaries, validation, idempotency, CAS, IDOR and cursor assertions remained passing. The worker's270ms query diagnostic is not an independent timing claim from this dot-report run. Own Docker label inventory was empty; no source edits/builds by test_runner.

## J3 final bounded regression

Test author /root/agenda_red added tests/agenda-ui.test.mjs and agenda-ui-helpers.test.mjs. The helper drives the real Agenda/useAgenda hook lifecycle through the pinned React19 dispatcher; SSR renders the actual children. It does not match source text or mock Agenda decisions. Both entry points (Upcoming and AgendaDay) first prove the fixture visible, then invoke real opening callback with authenticated FORBIDDEN, require immediate clearing before pending refresh settles, reject the refresh and require no stale title/aula plus error and working retry. RED observed: node --test --test-reporter=dot tests/agenda-ui.test.mjs exit1,2FAIL at line44 calendar item count1instead of0. No production/dependency edits, builds or browser operations. Coordinator included only the test suite, not its helper, in the launcher. GREEN pending separate production actor.

Independent J3 GREEN: same command exit0,2PASS/0FAIL after separate Agenda.tsx fix. Both callbacks remove stale content before pending refresh settles, preserve empty projections after503, expose error/retry and recover without navigation. node --check both files and git diff --check passed. Test bytes unchanged from RED. This is component/hook behavior proof, not browser/pixel proof.

## J4 — attributed independent follow-up

User explicitly authorized this follow-up after the bounded review ended. Test author /root/agenda_red appended the delayed November-open/December-navigation regression. Actual RED: two prior tests PASS, third FAIL at line110 with November rather than December item. Earlier setup counted upcoming calls incorrectly; fixture changed to explicit navigation phase before the genuine RED, with assertions preserved. After separate production fix, the same focused command independently passed3/3 with unchanged tests. Syntax/helper checks and source hash matched. No new review round, production edits, builds or memory writes by test author.
