# P8 T1 private grading — implementation and own checks completed

- Agent / role: /root/p8_private_grading, bounded implementation worker
- Session or task ID: /root/p8_private_grading; authoritative session ID unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p8-grading / C:/Users/alejo/.codex/worktrees/p4-p3-integration/ProtipoFoxMind
- Starting commit: fbbbeb618c50900144f655bcad05667ebca6bc78 (parent-provided)
- Phase and task: [P8 T1, S1/S4](../../odd/tasks/p8-grading.md)
- Status: completed

## Request and scope

Implement exact scoring and private teacher correction for all three activity types, with the real AttemptHistory editor entry, narrow API/proxy/client contracts, tests and documentation. Parent owns Git, shared tasks/roadmap and later T2–T7. No publication, student result, notification, audit, progress, schema/dependency change, retained-data operation, secrets, remote work or P9 is authorized to this worker.

## Work performed

- Read full P8 S1–S6/task/log, roadmap, work-record protocol, functional sections9/15, and the injected backend/React/work-unit/document skills.
- Engram resolved the assigned worktree exactly to canonical prototipofoxmindmvp-v1; no session identity was invented. Lifecycle list returned no stale observations; read seam observation149.
- Existing service chain ends in ActivityHistoryService; shared transaction/classroom teacher lock and classroom revision are reusable.
- Found a schema representation gap before implementation: question_grades rationals are non-null and strictly nonnegative/positive integer pairs. Pending manual points plus saved feedback cannot distinguish pending from explicit zero without a schema change. Reported to parent for a narrow decision; no workaround encoded in feedback.

## Verification

No checks run yet. Initial reads encountered nonexistent guessed history.ts/activity-queries.ts/tests/helpers/p5-database.mjs paths; these were read-only lookup errors, not test failures. Actual files were subsequently located through existing imports.

## Commits and outcomes

No Git operation or commit by this worker. No implementation acceptance claimed.

## Handoff

Await parent disposition of the pending-rational representation gap before affected source writes. First executable proof is a public grading-operation RED; arithmetic and implementation checks follow only within authorized surfaces and unchanged budgets.

## 2026-10-18 — initial candidate and observed check stop

- Parent authorized the necessary nullable rational-pair schema/migration extension after confirming the representation gap. Both null means private pending; 0/1 is a real zero. No metadata is encoded in feedback. Parent owns the shared actual-runtime inventory8→9 correction and generic P4/P5 count assertions.
- Created exact BigInt scoring/policy/private service, preserved the complete P7 service chain, added strict GET/POST grading routes and proxy shapes, actual teacher GradingEditor through AttemptHistory, pending/zero/feedback DTOs, narrow migration and candidate tests. No publication/effective pointer/event/audit/progress work.
- Meaningful public-operation RED: `node --test tests/p8-grading.test.mjs` exit1, 0PASS/1FAIL, actual loaded final ClassroomService.getAttemptGrading was undefined. Arithmetic is a new helper; its first executable cases passed4, no fabricated arithmetic RED was claimed.
- `node --test tests/p8-scoring.test.mjs`: exit0, 4PASS.
- `node scripts/build-api.mjs`: exit0, generation+strict API compilation, about5.3s within unchanged30s aggregate.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit --incremental false`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit0.
- `node --test --test-isolation=none --test-concurrency=1 tests/p8-grading.test.mjs tests/p8-grading-http.test.mjs tests/p8-grading-proxy.test.mjs tests/p8-grading-client.test.mjs`: exit1,9PASS/2FAIL(parent+subtest)/2SKIP. Four controlled SQL groups passed read-only GET and all three types pending/private/reload/zero/protected-data behavior. First rejection assertion escaped because fixture assert.rejects received a synchronously throwing function; no application defect or failed authorization behavior established.
- `node --test --test-concurrency=1 tests/p8-grading-migration.test.mjs`: exit1,0PASS/1FAIL, fixture preparation failed before baseline proof: spreading pg pool.options excludes nonenumerable password; SCRAM rejected undefined password. Disposable source fixture values were not logged.
- Both owned PostgreSQL fixtures reported cleanup exit0. No OS scratch created yet. No Next build, actual browser fixture, migration acceptance, affected regressions or differential proof run.
- Stopped and reported exact two fixture causes/proposed single coherent correction batch to parent; awaiting disposition. Do not relabel these failed runs as RED or PASS.
- Risk: items1(migration/private persistence),2(teacher authorization),3(shared transport DTO paths),4(classroom lock/revision CAS).

## Authorized fixture-only correction and targeted proof

Parent explicitly authorized one coherent fixture-only preparation correction. Only tests/p8-grading.test.mjs local rejected wrapper and tests/p8-grading-migration.test.mjs same-owned Client password line changed; API/UI/proxy/migration production bytes were not changed by that correction.

- `node --test --test-concurrency=1 tests/p8-grading.test.mjs`: exit0,9PASS/0FAIL/0SKIP. Setup necessarily reexecuted; this was the one targeted grading recheck, not a full P8 sweep.
- `node --test --test-concurrency=1 tests/p8-grading-migration.test.mjs`: exit0,1PASS. First valid upgrade connection observed populated old8 NOTNULL rejection, unchanged complete old-row hash after new9 migration, all finite/integer/pair constraints, private pending feedback and explicit0/1 recovery. A pg future deprecation warning about same-client queued snapshot queries was emitted; no application failure.
- Both labeled owned databases cleaned exit0. Original failed attempts remain above. No timeout increase or test retry after valid failure.
- Added actual all-type browser correction fixture and T1 guide after passing targeted proof. Parent confirmed runtime inventory9 before any actual launch.

## First long checks and source readback

- Production Next first build: `node -e "const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','apps/web'],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'inherit',windowsHide:true,timeout:180000});process.exitCode=r.status??1;"` exit0, about7.5s; no budget change.
- Actual first fixture: `node -e "const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-grading-integration.test.mjs'],{env:process.env,stdio:'inherit',windowsHide:true,timeout:360000});process.exitCode=r.status??1;"` exit0,5PASS/0FAIL/0SKIP,99.6s. It used actual P3 registration/captured verification mail, real plan/private PDF storage+scan, all3 student submission UIs, teacher private correction UIs, API/SQL protected hashes and data/storage/API restart. Migration inventory9 observed. Fixture honored actual429 Retry-After44s and1s once each. Process cleanup0; exact owned service cleanup0.
- Affected once-only command: `node --test --test-isolation=none --test-concurrency=1 tests/p7-history.test.mjs tests/p7-authoring.test.mjs tests/p7-participation.test.mjs tests/p7-questionnaire.test.mjs tests/p7-practical.test.mjs tests/p6-notifications.test.mjs tests/p7-history-client.test.mjs tests/p7-history-proxy.test.mjs tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs tests/p7-participation-client.test.mjs tests/p7-participation-proxy.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-proxy.test.mjs tests/p7-practical-client.test.mjs tests/p7-practical-proxy.test.mjs` exit0,68PASS/0FAIL/0SKIP,46.5s. All six owned database cleanup reports exit0. No old actual browser sweeps.
- Parent explicitly authorized read-only local Git extraction (no mutation). `git status --short` and `git rev-parse HEAD` confirmed fbbbeb618c50900144f655bcad05667ebca6bc78 plus declared worker and parent surfaces. Parent-only task/coordinator/runtime/generic inventory changes were not edited by this worker.
- Differential: `node C:/Users/alejo/AppData/Local/Temp/foxmind-p8-transport-differential-dFjf2i/prepare.mjs` exit0. Read-only raw `git ls-tree -rz`/`git cat-file blob` baseline553dfcc inputs87 and candidate90 were physically copied outside the worktree, SHA256 recorded, mode100644 enforced, matching timestamps applied, no links or reused build artifacts. Exact raw TS modules were identically transpiled for pure HTTP ingress/proxy/client probes, not a second production API build.174 observed legacy valid/new-input-on-sibling cases had byte-identical stdout50644bytes, empty stderr and exits0/0. Retained probe/source/manifest tree is reported below; no committed test reads Git history.
- `git diff --check`: exit0; only parent task/coordinator LF→CRLF warnings. Read back grading policy, migration, guide and source paths. No repository-wide formatter/generator/install and no Git mutation/remote work occurred.

## Visual readback limitation — not silently accepted

Viewed retained mobile evaluation and desktop TP screenshots. Evaluation shows private0,00, manual/feedback controls and no horizontal overflow. TP shows private8,50 and private download, BUT also an honest admission429 error after the fixture's last UI Recargar corrección. The test waited for an already displayed grade, not the reload response, so a clean TP UI reload screenshot is NOT proven. API reload and actual restart restore the grade, and the actual command passed, but that does not erase the narrower missing UI proof. Reported to parent before closure; no retry, source correction or clean-visual claim.

## Owned inventory and cleanup

Worker surfaces: apps/api/src/classrooms/scoring.ts, grading-policy.ts, grading.ts, service.ts, http.ts; apps/web/src/lib/classroom-proxy.ts; apps/classrooms-ui/api.ts, AttemptHistory.tsx, GradingEditor.tsx, styles.css; prisma/schema.prisma; prisma/migrations/202610180002_p8_pending_question_scores/migration.sql; tests/p8-scoring.test.mjs, p8-grading.test.mjs, p8-grading-http.test.mjs, p8-grading-proxy.test.mjs, p8-grading-client.test.mjs, p8-grading-integration.test.mjs, p8-grading-helpers.mjs, p8-grading-migration.test.mjs; docs/p8-private-grading.md; this attributed record.

Retained OS scratch (no recursive cleanup authority, no deletion attempted):
- C:/Users/alejo/AppData/Local/Temp/foxmind-p8-private-grading-StkRH9 — three actual teacher screenshot files.
- C:/Users/alejo/AppData/Local/Temp/foxmind-p8-transport-differential-dFjf2i — exact raw/transpiled module copies, input hash/mode manifest, deterministic probe, raw stdout/stderr artifacts.

Disposable owned DB containers and actual browser/API/Next/PostgreSQL/private-storage/scanner/Mailpit fixture services were cleaned by their exact owning harness, all reported0. No retained/dev DB, Mailpit volume, foreign process/container or file was touched. Build outputs remain ignored normal build artifacts. No source scratch exists inside the worktree.

## T2 handoff

T1 covers S1(private-scoring/correction part only) and S4(worker decisions/evidence only; full feature mirror remains parent-owned). The distinct parent-authorized TP-only reload proof below closes that narrow proof gap; no full P8 or publication acceptance is claimed. getAttemptGrading returns teacher-only answer keys and exact earned rationals; it is NOT a student result DTO. saveAttemptGrading accepts a whole strict private snapshot and only writes the unique AttemptGrade, QuestionGrade rows and classroom CAS revision. Protected gradingContext/gradingView/scoreCorrection and exact scoring helpers are available for T2/T3 reuse. Publication must reject every pending NULL/NULL question score or missing overall TP grade, explicitly publish atomically, maintain effective pointers and emit permitted notifications only then. T3 must keep private save denial for published grades and own audited correction. No T2/T3/T4/P9 behavior was added.

Risk: items1(pending rational migration and persistent correction),2(current teacher/security boundaries),3(shared service/HTTP/proxy/UI contracts),4(existing lock/CAS concurrency). Parent owns independent verification, Git, shared tracker and verified main publication.


## Final distinct TP-only reload proof and worker closure

Parent authorized one distinct positive-proof fixture after visual readback, not another product correction or a repeated all-type suite. Added only the newly allowed tests/p8-grading-reload-integration.test.mjs; production/API/UI/proxy/schema bytes and build artifacts were unchanged.

- `node -e "const {spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-grading-reload-integration.test.mjs'],{env:process.env,stdio:'inherit',windowsHide:true,timeout:360000});process.exitCode=r.status??1;"` exit0,1PASS/0FAIL/0SKIP,36.2s, first execution.
- Fresh actual captured-email/P3 teacher/student and classroom, real student private PDF upload/scan/confirmed submission, actual teacher private correction UI. Deliberately unsaved2,00 and local feedback were replaced via the visible Recargar corrección button by persisted8,50 and saved feedback.
- Actual reload response status200, Retry-After absent. No retry was needed. Restored input and feedback plus no error state were asserted only after that response; private SQL grade hash unchanged; student403, published0, effective pointer0.
- Clean teacher-tp-reload-confirmed-200.png was visually inspected: private notice,8,50, restored feedback, private download and enabled private save/reload controls, no error notice. Actual process cleanup0 and owned services cleanup0.
- Additional retained OS scratch: C:/Users/alejo/AppData/Local/Temp/foxmind-p8-tp-reload-ViOnUt. No recursive deletion attempted. Earlier all-type screenshot429 and its failed reload proof remain historical above, not relabeled.
- Readback of all23 worker-owned source/test/guide/record paths succeeded and source SHA256 values were emitted; total physical file lines3496 is NOT an authored-line count. `git diff --check` exit0. No source mutation after passing build/strict checks; later writes were tests and passive records only.

Current worker outcome: completed T1 implementation and own assigned checks, S1(private subset)/S4. Next action belongs to parent: inspect accepted surfaces, one spot check, high-risk independent verification under the authorized whole-feature policy, then T2 using the protected service seams. No worker commit, push, remote, native-review action, effective-grade mutation, publication operation or P9 work occurred. Full P8 remains incomplete until T2–T7 are verified by the parent.

