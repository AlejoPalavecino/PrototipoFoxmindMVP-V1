# Wall remediation — in progress

- Agent / role: wall_remediation / slice worker
- Session or task ID: /root/wall_remediation
- Date: 2026-10-29
- Branch / worktree: codex/audit-remediation; C:/Users/alejo/.codex/worktrees/foxmind-audit-remediation/ProtipoFoxMind
- Starting commit: 9fddbd815fc01b1822b6093231d6d40dbee979a0
- Phase and detailed task/spec links: F01 and F04, ../audits/2026-10-29-astra-project-audit.md; ../foxmind-v1-functional-spec.md §10
- Status: in_progress

## Request and scope
Paginate wall posts and replies, add shared pure contracts, preserve authorization, tombstones, revision and deep links. No tests edited, migrations, dependency changes, secrets, commits or remote actions.

## Work performed
Read roadmap, protocol, audit, functional requirements and current wall/proxy implementation; confirmed unbounded queries and blanket query rejection. Coordinator reported independent RED: tests/audit-wall-proxy.test.mjs 1 pass / 1 fail, query returned 400 instead of 200. GREEN authorized; final design pending.

## Verification
Read-only inspection: git status --short --branch; git rev-parse HEAD; rg searches. No checks run by this agent yet.

## Commits and outcomes
No commit.

## Handoff
Implement after final architectural design; coordinate ClassroomView integration and WallService composition with coordinator and workerB.

### GREEN intermediate
Shared wall contract and parsers, signed scoped cursors, bounded feed and reply reads with exact SQL timestamp, target thread, HTTP/proxy and UI pagination implemented. Source: apps/api/src/classrooms/http.ts, wall.ts, wall-cursor.ts, wall-read.ts; apps/web/src/lib/classroom-proxy.ts; apps/classrooms-ui/api.ts, Wall.tsx; src/core/domain/index.ts, classroom-wall.ts. No tests modified by this agent. wall.ts handed to core_remediation for composition.

Verification: API and web tsc --noEmit exit 0 before shared edits; node --test --test-reporter=dot tests/audit-wall-proxy.test.mjs tests/p6-wall-client.test.mjs exit 0 (5 cases); git diff --check exit 0. Independent DB test reports 1/1 with 430 posts, 45 replies, anchors and cursor scope before final anchor EXISTS change; final rerun pending. No eslint-plugin-boundaries or tach detected, formal boundary linter unavailable. No commit.

Handoff: final independent DB rerun, type checks after composition, UI verification and architectural review; do not declare completed from intermediate results.

Independent test_runner reports final wall DB rerun exit 0, 1 PASS and owned cleanup exit 0, with 430 posts, 45 replies, reply anchor 35, nonexistent reply denial and cross-scope cursor checks. See its work record for exact command and full evidence. Composition, final checks and review remain coordinator-owned; status remains in_progress.

### F04 and notification continuation
Scope: implement shared grading/wall contracts and paginated notifications after independent RED; coordinate backend policy edits with core worker. Before implementation, exact authorized one-line ClassroomMembers repair matched SHA256 099f89687bfe866f980cc9d0a72b1a3e4532d2392d2d62a0081528e971eb6d35 and removed extraneous closing conditional only. Web tsc --noEmit --incremental false exit 0; node --test --test-reporter=dot tests/audit-resource-lazy.test.mjs exit 0, 1 PASS. No tests edited. Status in_progress.

F04 continuation: added pure classroom-grading, classroom-contract-values, classroom-notifications and wall mutation contracts; proxy and HTTP use them; client validates critical responses before render. Added notification-page SQL with ACL selections, signed actor/filter scoped microsecond cursor and exact unread count; B integrated service facade and backend parser wrappers. Notifications UI filters server-side and loads more. API and web tsc --noEmit exit 0; combined audit-shared-contracts, audit-notifications-contract, audit-wall-proxy and p6-wall-client: 12 PASS, exit 0. Independent notification DB fixture and final UI/review pending. No tests edited by this agent.

### F04 shared output types continuation
Moved canonical critical GradingData, GradingQuestion, GradeCorrectionsData and PublishedResultData types to src/core/domain/classroom-grading-types.ts, reexported via domain and apps/classrooms-ui/api.ts. Added typed constructing decoders in classroom-grading-output.ts and reexported via classroom-grading.ts. They validate exact decimal strings, rational integer components and nonzero denominator, enum discriminants and all existing rendered output fields; no generic validation casts. Domain actual QuestionType enum has three values. Other activity DTOs remain outside scope.

Test runner observed RED for invalid rational. First GREEN run failed because the new synthetic valid fixture omitted required attempt.number and nullable grade.overallFeedback; test runner corrected those fixture fields without relaxing adversarial assertions. Rerun node --test --test-reporter=spec tests/audit-shared-contracts.test.mjs tests/audit-notifications-contract.test.mjs exit 0, 8 PASS. API and web tsc --noEmit exit 0. git diff --check exit 0 with CRLF advisories on other agents files. Notification DB/real-response test previously passed before this output hardening; final rerun on updated source remains pending coordinator authorization. No test edited by this agent.

Final source handoff: api.ts returns the validated reconstructed grading/result/corrections outputs. Latest web tsc --noEmit exit 0 and combined shared-contract, notification-contract, wall-proxy, p6-wall-client tests exit 0 (13 PASS); API tsc exit 0 before this UI-only final adjustment. Shared output files: classroom-grading.ts 28, classroom-grading-types.ts 34, classroom-grading-output.ts 78, domain/index.ts 27, apps/classrooms-ui/api.ts 349 nonblank lines at handoff. No critical output DTO copies remain in api.ts; unrelated activity DTOs remain intentionally outside scope. Test runner prior DB notification/real decoder 1 PASS predates final decoder; coordinator plans fresh frozen-source DB retest and review. Status in_progress pending independent final verification; no commit. Source frozen by coordinator instruction.

### TDD-NOTIF1 correction round 1 — preparation
Scope only Notifications.tsx and this record. Ledger reports stale load-more response contaminating the selected filter. Read current load/loadMore/run: effects abort only their own initial load, while manual paging and run completion have no generation guard. Plan monotonic generation and shared AbortController, synchronous invalidation on filter changes including A-B-A, guard items/cursor/count/busy/error and callbacks on mounted/current operation. Await independent DOM RED before source edits. No tests authored.

TDD-NOTIF1 RED: independent test_runner reported actual React DOM in Space qa-notificaciones-ronda1/4, stale Todas page appended LEIDA TARDIA after Sin leer, with stale cursor button. GREEN: changed only apps/classrooms-ui/Notifications.tsx with shared monotonic operation generation, abort signal, immediate filter invalidation, mounted/current checks on page, error, busy and action callbacks, and guarded functional updater. Filter change clears previous-scope list; retry preserves current page. First web tsc failed TS2554 at Notifications.tsx:65 because refresh called load without operation; corrected to run(load). Final node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false --pretty false exit 0. Independent test_runner reports DOM GREEN for A to B, A to B to A, and stale rejection without data or error contamination; see its record for exact steps and screenshots. Refresh-specific DOM evidence requested. No tests or other product files edited, no commit. Source stable for coordinator review.

Independent test_runner additionally reports refresh concurrente PASS in the same DOM Space: refresh during delayed loadMore retained current initial item after the old response was released. Candidate remains source stable for coordinator verification.

### Security cursor canonical encoding — preparation
Scope wall-cursor.ts, notification-page.ts, new signed-page-cursor.ts, this log. Existing Buffer base64url decoding accepts aliases with unused bits in signature; both cursors duplicate MAC logic. Planned common signing/reading with unchanged namespaces/JSON and strict decode-reencode equality for both segments, preserving caller scope checks. No source changes before independent RED. No test, DB, private configuration, dependencies or remote actions.

Security cursor GREEN: test_runner RED 15 cases, 3 PASS/12 FAIL for 3 signature aliases per feed/replies/notifications and 3 noncanonical body aliases with recomputed MAC. Implemented shared signed-page-cursor.ts; wall-cursor.ts and notification-page.ts delegate signing/reading, preserve namespaces and scope checks. Decode/reencode both segments, enforce 32-byte MAC, then timingSafeEqual; errors remain INVALID_INPUT. No tests edited.

Verification on workspace: node --experimental-transform-types --disable-warning=ExperimentalWarning --test --test-reporter=dot tests/audit-cursor-canonical.test.mjs exit 0, 15 PASS; API tsc --noEmit exit 0; byte-identical previous HMAC format and readback for both namespaces exit 0; git diff --check exit 0. Private API tsc emit exit 0 to TEMP/foxmind-cursor-build-8834ed19a3644c32aaea4b17c66f70e0, no generate. In .test-artifacts/fixture-repair-2026-10-30 after copying these three files, node node_modules/eslint/bin/eslint.js on three paths exit 0; ast-grep run -p createHmac-pattern found one occurrence in helper; private tsc emit exit 0 was launched before coordinator said avoid duplicate. Initial sg command used incorrectly escaped PowerShell pattern and found no match; corrected ast-grep command passed. CI inventory/full suite and DB verification are coordinator-owned, not claimed here.

Final SHA256: wall-cursor.ts 80ef893c72d607e4a03f6538781bfbbb65aa7513d15a6a35d6ed2cdefa60ebc7; notification-page.ts 5b2f9a0f869be2d1e8ea94d7e57743d08b89a2e90c9e052c66bdfc1ed22e3ed3; signed-page-cursor.ts b68fd1799d7db3a8eaa8ac941c4ba6d089a4548dd5d508c97ea2980bf9288d2f. Source ready for coordinator acceptance and combined verification; no commit.
