# Audit remediation — independent verification rejected candidate

- Agent / role: `/root/remediation_verify`, independent verifier, sol/xhigh.
- Session or task ID: `/root/remediation_verify` (runtime task route; host session ID unavailable).
- Date: 2026-10-29 (America/Buenos_Aires).
- Branch / worktree: `codex/audit-remediation`, `C:/Users/alejo/.codex/worktrees/foxmind-audit-remediation/ProtipoFoxMind`.
- Starting commit: `9fddbd815fc01b1822b6093231d6d40dbee979a0`; candidate contains uncommitted remediation.
- Phase and detailed task/spec links: [F01–F08 task](../../odd/tasks/audit-remediation.md), [coordinator](2026-10-29-root-audit-remediation.md).
- Status: blocked.

## Request and scope

Independently verify the frozen candidate with code digest `5c7db5181a594c3fe373bb911beec0a3276e2e40ccfdf6e6b28cb88e99353ea9`. Execute only from `.test-artifacts/verified-candidate`, using its private full-toolchain installation and own generated artifacts. No product, test or configuration edits, no commit/push, no retained data or provider calls. DOM evidence belongs to the distinct test-runner actor.

## Work performed

Read actual AGENTS instructions, roadmap checkpoint, work-record protocol, remediation contracts, coordinator record, package scripts, explicit CI suite manifest and runner. Confirmed actual branch/HEAD and dirty candidate state. Reviewing fixture actions and cleanup before execution. API build generates Prisma, so its synthetic database URL and own `.generated` are required.

## Verification

All results below were executed by `/root/remediation_verify`. Logs and machine-readable exits are under mirror `.test-artifacts/remediation-verify/`. Child environment retains only selected Windows/runtime paths and explicit synthetic configuration; npm uses an empty task-owned userconfig/cache. No retained helper/provider was used.

| Command | Observed result |
|---|---|
| `node scripts/build-api.mjs` | exit0, 5.386s; Prisma generation into own mirror `.generated` and API compilation exit0; internal API budget30s |
| `tsc -p apps/web/tsconfig.json --noEmit --incremental false` | exit0, 5.236s |
| `npm run lint:boundaries` | exit0, 6.816s; ESLint plus architecture AST boundaries |
| `next build apps/web` | exit0, 11.309s, under180s |
| `npm audit --package-lock-only --ignore-scripts --json` | exit0, 12.840s, total0 vulnerabilities (352prod/186dev/104optional; reported total586) |
| `node scripts/run-ci-suite.mjs --suite pure` | exit0,70PASS/0FAIL/0SKIP,18files |
| `node scripts/run-ci-suite.mjs --suite transport` | exit0,35PASS/0FAIL/2SKIP,10files; both skips are existing optional actual account-document navigation tests |
| `node scripts/run-ci-suite.mjs --suite integration-owned` | exit1,8PASS/1FAIL/0SKIP; stopped at second file `p4-integration.test.mjs` |
| Extra explicit `p32-mailer`, `grading-ai-host`, `p8-progress-calculation` | exit0,16PASS/0FAIL/0SKIP; real local SMTP fixture/Nest lifecycle and exact rational calculation |
| Extra explicit owned queue: `agenda-database`, `grading-ai-integration`, `audit-wall-database`, `audit-notifications-database`, `audit-lock-concurrency`, `audit-wall-http-database` | exit0,11PASS/0FAIL/0SKIP; serial execution, every P5 fixture cleanup exit0 |
| Extra explicit full academic queue, first file `p7-participation` | exit1,10PASS/1FAIL/0SKIP, compatibility prototype smoke fails; subsequent files not run in this queue |
| Explicit academic semantic parent-name selection over `p7-practical`, `p7-questionnaire`, `p8-grading`, `p8-publication`, `p8-corrections`, `p8-progress` | exit1,49PASS/2FAIL/7SKIP,58reported tests; one leaf failure plus failed parent in correction audit. Nonmatching top-level compatibility smoke tests were excluded by the filter and Node24 did not count them as skips. This is selected behavior proof, not full-file PASS |
| Extra explicit IA queue: `grading-ai-sql`, `runtime`, `runtime-files`, `lifecycle`, `before-count`, `authorization`, `availability-sql`, `settings-http` | exit0,44PASS/0FAIL/0SKIP across8files; all owned cleanup exit0 |
| `node scripts/test-backend.mjs` | exit0,8PASS/0FAIL/0SKIP;17.670s outer,26s product-work budget; API compile and owned identity database cleanup exit0 |
| Task-owned clock diagnostic using `withP5Database` | exit0;12samples,0within Windows before/after bracket; PostgreSQL timestamp39–40ms ahead of Windows after-return time; owned cleanup exit0 |

Current integration failure: `scripts/p4-integration-runtime.mjs:30` throws `Unexpected combined migration inventory`: fixture expects14 migration directories while actual candidate contains19. It fails after owned PostgreSQL/storage/scanner readiness, before migration deployment/application/browser product assertions. Process cleanup failures0 and owned cleanup failures0. The other P4-runtime-backed cases were not repeated with this identical known cause; they remain unexecuted, not PASS. Baseline `git show HEAD:scripts/p4-integration-runtime.mjs` contains the same14 check and `git ls-tree -r --name-only HEAD prisma/migrations` already lists19 migrations. This is inherited fixture debt, and the newly introduced CI integration job exposes it.

Additional current candidate regression: explicit academic queue failed fast on `tests/p7-participation.test.mjs`: exit1,10PASS/1FAIL/0SKIP. Its public compatibility smoke reads `ClassroomService.prototype.activitySession` and throws TypeError because the new accessor `composition.ts:109` accesses absent `this.participation` on the prototype (`composition.js:106` after compilation). Prior inherited public methods were callable prototype functions; the new facade getters change that observable contract. Eight transactional participation subtests and pure receipt boundary passed, owned cleanup exit0. No source/test correction by this verifier. Remaining academic behavior is selected by explicit parent-test names to avoid repeating the same diagnosed prototype smoke; its selection and exclusions will remain explicit and cannot replace full-suite PASS.

Selected academic behavior has a separate failure at `p8-corrections.test.mjs:56`: SQL `correctedAt` is expected to lie within a Windows `Date.now()` bracket. The parent test fails and seven downstream prerequisite cases skip. TP11, Q/E6, private grading7, progress8 and explicit-publication11 semantic subtests passed (plus their parent nodes). SQL uses `clock_timestamp()` unchanged from baseline. Subsequent independent clock diagnostic found all12 SQL samples39–40ms ahead of Windows after-return time; this establishes an environmental clock mismatch that makes this assertion nonportable. The original failed row's exact bracket values were not captured, so it remains an observed FAIL with strong environment evidence, not a recovered PASS.

The IA-runtime queue independently passed concurrent leases, epoch/grade/file-link revocation, outcome-unknown after dispatch without resending, exact usage settlement, shutdown abort/drain, file grants and preferences/HTTP permissions. No real provider calls.

All39 direct installed dependency versions exactly match candidate `package.json`; private installation package/lock bytes equal mirror package/lock. An extra `npm ls --depth=0 --json` read returned exit0 but reported flattened transitive packages as extraneous through the junction; it is not used as proof of a pristine npm graph. Exact direct versions and equality are saved in `direct-dependencies.json`.

The independently passing owned queue verifies real DB wall traversal over2MiB, highwater/tie/microsecond preservation, targeted thread and pagination through proxy/API, all three notification families with unread totals and access revocation, concurrent shared reads with writer blocking, and synthetic grading IA→private application→explicit publication for TP/Q/E.

Advisory: Next inferred the parent worktree root because of the additional parent lockfile; build succeeded using the mirror application. Final reconciliation independently recomputed the JSON code-manifest SHA256: expected,mirror and root all equal `5c7db5181a594c3fe373bb911beec0a3276e2e40ccfdf6e6b28cb88e99353ea9`,1176code paths, no added/removed code. All2693manifest mirror paths unchanged. Root differences are only `docs/work-log/2026-10-29-remediation_tests.md`, `docs/work-log/2026-10-29-root-audit-remediation.md` and `odd/tasks/audit-remediation.md`. The first inventory read used quoted Git output; final inventory correctly uses `git ls-files -z` to avoid misclassifying accented documentation filenames.

Runtime versions observed from installed packages: Node24.20.0, Docker29.9.2, platform-express12.3.2, Nest core12.1.3, nodemailer10.3.1, Next16.4.2, TypeScript5.9.3, ESLint10.13.0, boundaries5.3.1, pg8.23.1, Prisma7.10.0, React19.3.1, Vite8.3.4.

## Commits and outcomes

No source changes or commits by this verifier.

Candidate acceptance is rejected. Required integration proof remains unavailable because the explicit suite fails on inherited fixture inventory; public-facade compatibility has a newly observed source regression. Detailed command arrays, exits, durations and sanitized logs remain in mirror `.test-artifacts/remediation-verify/`; selected-case results do not replace complete files or end-to-end browser acceptance. DOM evidence is assigned to a different actor and is not claimed here. Historical retained-helper unavailability/native-review settings remain context and were not rerun or reclassified as PASS.

Final read-only Docker label inventories exited0 with no remaining P5,Agenda,P4,identity or Mailpit-test containers. Other labeled P4/Mailpit-test volumes and P4 networks exist; their ownership is outside this invocation and they were not modified or treated as a cleanup target. The mirror's exact newly created P4 artifact-directory prefix identifies this invocation; its exact container/network/volume absence check is saved separately in `docker-owned-cleanup-final.json`. Individual fixture cleanup reports remain in logs. No retained cleanup, npm installation, source/config/test mutation, commit or publication by this verifier.

## Handoff

First debt observed: combined integration fixture hardcodes14 against19already-baseline migrations. Coordinator must assign a separate fix after the independent-review ledger, also restore facade prototype compatibility with independent RED proof. Correct the bounded clock fixture separately without weakening server timestamps/precision or claiming this observed run passed. Freeze a new candidate and rerun affected full suites plus the previously unreachable P4/P6/P7/P8 end-to-end cases. This record does not declare F01–F08 complete.

## Final candidate verification — in progress

Same actor `/root/remediation_verify`, new assignment from coordinator after correction1. Frozen mirror `.test-artifacts/verified-final`, expected code digest `0ae8587e300e61d5e68e47aadddce56a8267077637e9d9332cc3689ef6bee680`,2699manifest paths/1180code paths. Initial rejection above remains historical evidence. Read ledger, final delta and explicit12-file integration manifest; dynamic fixture retains nonempty/name/SQL validation, deploy/diff/applied-history. Source frozen; only own output artifacts and this append authorized. Final complete suites will run without semantic-name filtering. No final DoD approval yet.

Final builds observed: API exit0 in5.439s; strict web types exit0 in4.661s; ESLint/AST boundaries exit0 in4.716s; Next production build exit0 in9.273s; fresh npm lock audit exit0,total0 vulnerabilities. API30s/Next180s budgets preserved. Next parent-root warning remains advisory.

Final full pure suite exit0,70PASS/0FAIL/0SKIP across18files; final full transport exit0,35PASS/0FAIL/2existing optionalSKIP across10files. The integration suite is running all12explicit files serially, no selection/filter. Final package SHA256 `72f4a0242b0590cd65b46e544cba813217ed700dac0ace04b25c2ef3cd1c7b2e` and lock SHA256 `5a570390d9840dfe66aaf41edc0adc86462946594d3c880280b8e98145fc4385` equal the initial tested dependencies and private installation; all39direct installed versions match. Task-owned Docker before-snapshot preserves four retained main-Gemini containers and existing volumes/networks; they are outside this verifier's lifecycle.

Final integration attempt: exit1,22PASS/2FAIL/3SKIP across the first4files; runner correctly failed fast. P6wall8/0/0, P4actual9/0/0 (77.405s parent;79.952sfile), Agenda3/0/0. P6wall actual2PASS/2FAIL(one leaf plus parent)/3prerequisiteSKIP: its notification-open locator at `tests/p6-wall-integration.test.mjs:85` expects exact `Abrir publicación` and times out30s. Both final UI and baseline `git show HEAD:apps/classrooms-ui/Notifications.tsx` display `Abrir conversación`; baseline test already expects the old label. The click/product behavior was not reached, so no action failure is demonstrated. P4 deploy/diff/history/restart and cleanups passed; both actual-fixture invocations report process0/owned0 cleanup failures. Remaining8manifest files were not run by the failed suite. This is an observed integration FAIL, not a final DoD approval; no autorepeat or source/test edits.

Final SMTP/DI/exact calculation repeated independently:16PASS/0FAIL/0SKIP,exit0. Full P7/P8 academic queue now running all7files with no name filter, retaining prototype/clock assertions.

Final academic attempt stopped after2files: exit1,21PASS/2FAIL/1SKIP. Participation complete11/0/0 confirms the former prototype failure is fixed. TP complete10/2/1 includes a leaf failure plus parent: `p7-practical.test.mjs:156` immediately invokes two submissions after SQL-created attempt and observes0fulfilled against expected1; last TP case skips its prerequisite. There is no waitForAttemptClock before those immediate calls. Cross-clock cause is plausible given prior independent SQL/Windows measurement and server receipt ordering guard, but rejection codes were not printed by this test, so exact attribution remains unproven. No autorepeat, fixture edit or relaxed assertions. Remaining five academic files will be executed as a separate explicit suffix; the failed full queue remains failed.

Coordinator authorized exact remaining eight integration files once for diagnostic coverage while test_runner separately owns a source-test-only selector maintenance delta. This verifier executes the unchanged frozen final mirror; suffix results cannot turn the failed12-file suite into PASS.

Eight-file suffix itself stopped on its first file, P7authoring actual:exit1,0PASS/2FAIL/3SKIP. Its first case times out30s at `p7-authoring-integration.test.mjs:56` looking for `Crear borrador de actividad`. Baseline and final `Activities.tsx` instead contain `Crear manualmente`; baseline test already uses old text. Product create action was not reached. Owned process/stack cleanup0. The remaining seven independent integration files are being executed once each in series with per-file results; no failed file is rerun.

Separate remaining five academic files complete, without filters:exit0,51PASS/0FAIL/0SKIP — Q/E8,private grading9,publication13,corrections11,progress10. This confirms the SQL-clock correction and facade prototype compatibility for those complete files. It does not erase the full TP failure or earlier queue failures.

Inherited P7authoring harness wrote synthetic browser evidence to a generated OS temp directory (`foxmind-p7-authoring-h17cOZ`). No private state was read and no source changed; the directory was left intact. Subsequent verifier child TEMP/TMP are explicitly task-owned beneath mirror `.test-artifacts/remediation-verify/tmp` so further output stays inside the mirror.

### Final candidate outcome and per-file coverage

**RESULTADO RECHAZADO for `0ae8587e...bee680`.** Builds/types/boundaries/audit and full pure/transport passed, but exact CI integration suite failed and complete TP service regression also failed. All12integration manifest files were attempted exactly once:4in full fail-fast suite,1in fail-fast suffix,7as independent serial diagnostic files. The latter are not a replacement CI-suite PASS. No failed file was automatically repeated.

| Integration file | PASS/FAIL/SKIP |
|---|---|
| `p6-wall.test` |8/0/0|
| `p4-integration.test` |9/0/0|
| `agenda-database.test` |3/0/0|
| `p6-wall-integration.test` |2/2/3 — obsolete publication-button label; leaf+parent fail|
| `p7-authoring-integration.test` |0/2/3 — obsolete create-button label; leaf+parent fail|
| `p8-grading-integration.test` |0/2/3 — obsolete receipt copy; leaf+parent fail|
| `grading-ai-integration.test` |4/0/0|
| `audit-wall-database.test` |1/0/0|
| `audit-notifications-database.test` |1/0/0|
| `audit-activity-ai-lock.test` |1/0/0 — READY list concurrency and authenticate(false)|
| `audit-lock-concurrency.test` |1/0/0|
| `audit-wall-http-database.test` |1/0/0|

P8grading actual reaches confirmed `submit-answers` HTTP200, then waits12s for the old text `Comprobante de entrega · pendiente de corrección.` at line78. Baseline and final `QuestionnaireAttempt.tsx` are identical and show `Entrega confirmada.`; old expected copy is absent. No submission failure is demonstrated. Three dependent actual cases skip. Process/owned cleanup0. P8 evidence stays under own mirror temp.

| Academic full file | PASS/FAIL/SKIP |
|---|---|
| `p7-participation.test` |11/0/0|
| `p7-practical.test` |10/2/1 — immediate optional submission; rejection reasons unrecorded; clock hypothesis remains unproven|
| `p7-questionnaire.test` |8/0/0|
| `p8-grading.test` |9/0/0|
| `p8-publication.test` |13/0/0|
| `p8-corrections.test` |11/0/0|
| `p8-progress.test` |10/0/0|

These tables list disjoint file attempts; do not add their totals again to their queue summaries. Earlier candidate runs remain separately attributed above. Drift/history negative canaries were not executed and are not claimed. Prior CDP screenshot availability and synthetic UI observations belong to their own actors, not this verifier's proof. Current positive migrate/deploy/diff/history checks passed in four actual stacks; they are not negative-canary evidence.

Final cleanup: all4new owned P4 stack prefixes absent;14P5cleanup reports exit0,4actual process/owned cleanup pairs0. AI and Agenda fixtures return successful completion and leave no resource delta. Read-only before/after inventory is identical:4retained containers,173volumes,15networks;0added/0removed in every class. The retained main-Gemini resources and all prior infrastructure stayed intact. Four actual fixtures allocate16containers,12owned volumes and4networks; the17additional ephemeral PostgreSQL invocations bring owned created/removed containers to33, with no observed cleanup error. Counts derive from executed fixture allocations plus exact final inventory; individual resource IDs are not claimed for unlogged P5 invocations.

Final source reconciliation: mirror all2699manifest paths unchanged, code1180digest remains `0ae8587e300e61d5e68e47aadddce56a8267077637e9d9332cc3689ef6bee680`. Root now differs only in `tests/p6-wall-integration.test.mjs` due test_runner's separately authorized maintenance, root code digest `bf5e22e513aee28c5e04abb586fe014845475ef1076964cb8c38fc0720a5c0b1`; no added/removed code. This verifier made no source/test/config edit. New root state is outside this frozen candidate and requires its own exact verification.

Next exact action: coordinator/test_runner reconcile inherited selector/copy fixtures and obtain precise TP rejection evidence without weakening receipt/time invariants; freeze a new test-maintenance candidate and rerun full affected queues and12-file CI suite. No commit/push or DoD approval by this verifier.

## Continuation 2026-10-30 — four complete files and stable CI12

Same verifier `/root/remediation_verify`, explicit coordinator assignment after the user's continuation request. Mutable private execution mirror `.test-artifacts/continuation-2026-10-30`; original frozen mirrors remain untouched. Inspected and copied only four updated root tests (`p6-wall-integration`, `p7-authoring-integration`, `p8-grading-integration`, `p7-practical`) and restored the stable40-file manifests from `verified-final`, per assignment. Existing `attempt-clock` helper is present and unchanged. Test-only changes update three obsolete UI labels/copy, add a real bounded wait before capturing immediate TP receipts, and assert SQL23514 invalid chronology still rejects without changing DRAFT status. Source product, receipt clock, constraints and deadlines remain unchanged.

Test runner's supplied diagnostic attributes both prior TP rejections to23514 while DBopenedAt was23ms ahead of Windows; that diagnosis is attributed context, not a repeated experiment by this verifier. This verifier will independently run all four entire files, fail-fast and without name filters: TP, P6wall actual, P7authoring actual, P8grading actual. Only if all pass will the original12-file CIintegration-owned suite run from the beginning. This revalidation does not claim the larger302/304-entry inventory under preparation is complete or passing.

Independent observed progress on2026-10-30: TP entire file13PASS/0FAIL/0SKIP, including real SQL23514 invalid-chronology rejection and concurrent one-winner/one-CONFLICT after bounded real-clock wait. P6actual entire file7PASS/0FAIL/0SKIP in90.401sparent/94.746sfile; all notifications/open/moderation/restart/revocation cases reached and cleanup process0/owned0. Remaining P7/P8actual files are still in the serial queue.

Provenance:668runtime source/package paths equal verified-final bytes;295API build artifacts and140Next server-page artifacts also match, plus identical BUILD_ID and required-server-files. The existing attempt-clock helper equals root. Thus this task reuses the observed build of identical product and dependencies, while test copy hashes are separately recorded. A verifier wrapper bootstrap quoting error occurred before the runner existed; no test process ran in that failed invocation. Corrected only the task-owned wrapper and then started the declared queue once.

Queue30 first attempt exit1 after185.603s:20PASS/2FAIL/3SKIP over three whole files, with P8not run by fail-fast and CI12not started. P7authoring passed create/title/unit selection, then timed out30s at `p7-authoring-integration.test.mjs:59` waiting for single-topic select label `Tema de la actividad`. Current `ActivityAuthoring.tsx:102` uses a `Temas de la actividad` fieldset with individual topic checkboxes; the test still uses obsolete single-select locators at lines59and118. Baseline `ActivityAuthoring.tsx` has the same multi-topic fieldset, and current source is unchanged from baseline, so this is another inherited test/control mismatch. P7actual0PASS/2FAIL(one leaf plus parent)/3dependentSKIP; process/owned cleanup0. No autorepeat, product patch or test edit by verifier. The continuation mirror's1180-code snapshot digest is `11e52c9cac5d0639af2f652f492766376e6432f0911d830392e2949e1c081c9b`, delta from verified-final exactly the four copied tests.

Post-failure Docker inventory equals before exactly:4retained containers,173volumes,15networks,0added/0removed. Two actual stacks and one P5fixture completed cleanup. Next coordinator action: assign test_runner to adapt authoring topic interaction to actual checkbox controls while preserving required topic selection assertions; then revalidate the changed whole file and remaining P8 before CI12. Full-suite objective remains open; no completed claim.
