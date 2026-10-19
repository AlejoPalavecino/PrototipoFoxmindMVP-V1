# P8 T3 published-grade correction — assigned own proof passed

- Agent / role: bounded writer, own verification (not independent Verify)
- Session or task ID: /root/p8_corrections; authoritative session unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p8-grading; managed p4-p3-integration worktree
- Starting commit: 40cf46b7e4a7b0c6c54afce54d1dc98ab0624a28
- Phase and detailed task/spec links: P8; odd/tasks/p8-grading.md T3; S1,S4
- Status: completed

## Current outcome

T3 implementation and assigned own proof are complete after the explicitly authorized single E-only final proof below. Earlier failures/skips retain their original attribution and are not retroactively converted into passing runs. Whole-P8 independent acceptance, Git and publication remain parent-owned and pending.

## Request and scope

Implement reasoned correction of the same published attempt grade, teacher-only immutable audit, atomic student notification and existing correction UI. Preserve effective-grade identity, publication time, answers, locked criteria, per-question scores/feedback and prior audit. No T4/P9, schema/dependency changes, retained data, Git mutation, native review or publishing.

## Work performed

Reconciled the task document with Engram observation 148 through L18 and actual HEAD/status. Parent-owned coordinator/task/package/runner changes are preserved. Loaded all four injected skills. Existing publication service and schema provide the required transaction and audit foundations.

## Verification

- Public-operation RED: `node --test --test-isolation=none --test-concurrency=1 tests/p8-corrections.test.mjs`: exit1, 0PASS/1FAIL, missing `correctPublishedGrade`.
- `node scripts/build-api.mjs`: exit0; Prisma generation and API TypeScript compilation passed within the existing aggregate30s budget.
- `node --test --test-isolation=none --test-concurrency=1 tests/p8-corrections.test.mjs tests/p8-corrections-http.test.mjs tests/p8-corrections-proxy.test.mjs tests/p8-corrections-client.test.mjs`: exit0,15PASS/0FAIL/0SKIP,31480ms; owned SQL cleanup exit0. Covers all three activity types, exact/zero grade, required trimmed reason, server audit actor/time, stale/concurrent CAS, immutable evidence and prior audit, historical/effective pointer behavior, safe own result/event, forged relationships, archive/departure, rollback and old publication/private-save guards.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit --incremental false` and same for `apps/web/tsconfig.json`: both exit0, strict check-only.
- Production Next: `node -e "const{spawnSync}=require('node:child_process');const r=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','apps/web'],{env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'},stdio:'inherit',timeout:180000,windowsHide:true});console.log('T3 Next exit',r.status,'error',r.error?.code??'none');process.exitCode=r.status??1"`: exit0, error none. No source changes afterward.
- `node --check tests/p8-corrections-integration.test.mjs` and `git diff --check`: exit0. Git emitted existing line-ending notices only.
- Affected command: `node --test --test-isolation=none --test-concurrency=1 tests/p8-scoring.test.mjs tests/p8-grading.test.mjs tests/p8-grading-http.test.mjs tests/p8-grading-proxy.test.mjs tests/p8-grading-client.test.mjs tests/p8-publication.test.mjs tests/p8-publication-http.test.mjs tests/p8-publication-proxy.test.mjs tests/p8-publication-client.test.mjs tests/p7-history.test.mjs tests/p7-history-http.test.mjs tests/p7-history-proxy.test.mjs tests/p7-history-client.test.mjs tests/p6-notifications.test.mjs tests/p7-notifications.test.mjs tests/p6-wall.test.mjs tests/p6-wall-client.test.mjs`: exit0,68PASS/0FAIL/0SKIP,104611ms; all6 owned SQL cleanups exit0. Existing pg queued-query deprecation warning retained.
- Raw baseline40cf46b comparison: `node <OS scratch>/prepare.mjs` via a Node mkdtemp launcher: exit0,194 cases; exact stdout57550bytes, empty stderr and exits0/0. Raw92 baseline/93 candidate source modules extracted as UTF8 Git blobs/current bytes, modes100644 and SHA256 manifest. Installed validator233 physical files copied identically into both roots with matching SHA256/mode/fixed mtime; no links, installs or reused build. Scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-correction-transport-mSA3Mk`; result.json, raw-input-manifest.json, validator-package-manifest.json and raw stdout/stderr retained.
- FIRST actual command: `node -e "const{spawnSync}=require('node:child_process');const start=Date.now();const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-corrections-integration.test.mjs'],{stdio:'inherit',timeout:360000,windowsHide:true});console.log('T3 actual child exit',r.status,'error',r.error?.code??'none','duration_ms',Date.now()-start);process.exitCode=r.status??1"`: exit1,1PASS/2FAIL(parent+questionnaire)/2SKIP,119344ms TAP/119564ms child. Existing330s test/360s child limits retained; process cleanup failures0 and owned service cleanup failures0.
- Actual TP passed captured-mail teacher/student identity, clean PDF upload/scan/submission, private grading/publication, invalid precision/missing reason disabled, cancel with unchanged domain hash, correction POST200 and fresh audit/grading GET200 before success, explicit reload200/no errors, persisted8,35/old6,00/server audit, student-only result/event target, original private-file byte equality, unchanged evidence/pointer and375px no-overflow.
- Actual questionnaire correction POST200 and fresh auditGET200 passed; subsequent parent grading refreshGET returned429 at line115. No Retry-After value was captured for that failure, and neither a clean successful Q UI nor a root cause beyond observed admission is claimed. Evaluation and restart/revocation/signed-out checks skipped after the failure. No product fix, test retry, timeout increase or repeat sweep performed. Parent requested disposition of distinct Q/E+restart missing proof with observed Retry-After and visible reload.
- Browser evidence retained: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-corrections-tIOXDD`. Visual readback confirms clean TP teacher audit6,00→8,35/reason/actor/date and student corrected8,35 near the lower internally scrolling modal edge. It does not imply all lower result details are visible in the screenshot; positive API/DOM checks separately passed.

## Implementation decisions

`GradeCorrectionService` extends the publication service and reuses `gradingContext`, transactional room/grade locks and revision CAS. Only final_grade/updated_at, a new immutable audit row, revision and `GRADE_CORRECTED` event change. The effective pointer and original publication time are not rewritten. The notification selector extends its event discriminator but retains its complete grade/attempt/obligation/recipient/current-membership chain and legacy WALL/P7 shapes. The existing teacher editor mounts the separate published-grade correction form; success waits for fresh audit200 and grading refresh. Engram171 stores this decision. No schema or dependency changes.

## Commits and outcomes

No worker Git mutation; parent owns commits.

## Handoff

The human-authorized E-only final run closed the exact missing E notification-result/restart/access proof. Parent now reconciles the19-file inventory, historical and final evidence, then owns T3 acceptance/commit and the already-authorized sequential P8 continuation. No whole-P8 independent acceptance, Git mutation or publication is claimed. Parent-owned task/coordinator/package/runner changes remain untouched.

Risk: items 1,2,3,4 (persisted grade/audit, authorization, public transport, CAS transaction). skill_resolution: paths-injected.

## Parent-authorized verification-only remaining proof

After the first actual failure, parent explicitly authorized `tests/p8-corrections-remaining-integration.test.mjs` for FIRST remaining Q/E plus restart/current-access proof, with no TP replay, product changes, timeout increase or full three-type rerun. Product10-source SHA256 inventory was captured before preparation. Reused the already observed API/strict/production Next builds. New preparation records safe response method/path/status/Retry-After metadata without cookies, tokens or bodies. A real429 and integer Retry-After1..60 permits one wait and existing visible grading/audit reload; success must be absent while refresh is rejected and clean values require positive200 afterward. Under the same explicit parent allowance, only that response-capture/admitted-reload preparation was also applied to the canonical original actual test for future runner use; it was NOT rerun and its historical failure/skip evidence remains above. The first distinct remaining execution uses the original330s/child360s ceiling; on failure stop without another correction or launch.

## Remaining-proof preparation failure — stopped without correction

`node -e "const{spawnSync}=require('node:child_process');const start=Date.now();const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-corrections-remaining-integration.test.mjs'],{stdio:'inherit',timeout:360000,windowsHide:true});console.log('T3 FIRST remaining actual child exit',r.status,'error',r.error?.code??'none','duration_ms',Date.now()-start);process.exitCode=r.status??1"`: exit1,0PASS/2FAIL(parent+Q)/2SKIP,62720ms TAP/62869ms child. Q correction POST200 was observed before the new fixture helper call threw `TypeError: observed is not a function` at line130. The existing local `let observed` publication-save response promise shadows the newly named response-observer helper. This is a test-preparation defect, not an application failure. The same preparation was copied into the canonical test, which remains unrun and must receive the same narrow rename before future execution. No fix/retry was performed after the failure. All process and owned-service cleanup reports0.

Proposed exact preparation correction: rename only the new helper `observed` to `observedResponse` and its two calls in both actual correction test files; then one targeted remaining Q/E/restart execution under unchanged limits. Parent disposition required before that edit/launch. No TP replay, product edits or new full sweep. Product10-source SHA256 after the failed fixture is byte-identical to its pre-preparation inventory.

Retained failed remaining scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-corrections-remaining-dlOJZh`, safe-responses.json only (no screenshot reached). Earlier TP and194-case transport evidence remains valid and separately attributed. Next exact action is parent disposition of this preparation-only rename and missing proof; T3 is NOT accepted complete.

## Exact authorized preparation rename and bounded targeted result

Parent authorized ONLY the new helper name and its two calls in both actual test files. Applied exactly three `observed`→`observedResponse` renames per file; retained the original local save-response promise unchanged. Static name/count assertions and `node --check` both files passed before execution. SHA256 canonical beforeb11a9f8f8bbda9582ff7f0df58478d5f2f846a9ca80503d8bcbb52bd60113257 / aftera66a8f9536644b498fb35b213bc5f44eea0df316db6745828643a9f164201269; remaining before47a05b28ad46b87ab7e4df30bf53bfd6ef1cbd967bd9387ca2b62c3d2ec199b5 / after8be2d16b41a74f713b1d4f5a846aff159f24fe06fb9282fd3c32fdfe0bc915b6. No product changes, TP replay, canonical rerun or enlarged limits. Engram173 records the test-preparation root cause and exact fix.

`node -e "const{spawnSync}=require('node:child_process');const start=Date.now();const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-corrections-remaining-integration.test.mjs'],{stdio:'inherit',timeout:360000,windowsHide:true});console.log('T3 targeted remaining actual child exit',r.status,'error',r.error?.code??'none','duration_ms',Date.now()-start);process.exitCode=r.status??1"`: exit1,1PASS(questionnaire)/2FAIL(parent+evaluation)/1SKIP(restart),42277ms TAP/42344ms child. Process and owned service cleanup failures0.

Q complete captured-email/P3 submission/private grading/publication/cancel/reason/confirmed8,35 correction, fresh audit/grading200, explicit reload200/no error, teacher-only audit, safe own student result and exact notification target200/mobile passed. E published-zero correction POST200, fresh auditGET200/gradingGET200, successful UI and explicit reload200, safe own result API200 and immutable evidence/pointer/mobile audit also passed. E then failed at line177 on the student notification-open resultGET429; safe metadata captures `Retry-After:46`. No recovery branch, wait, replay, product edit or further launch was performed after this new proof gap. Restart/revocation/signed-out scenarios were skipped. The original actual TP pass, original Q429, failed helper preparation and this targeted result remain separate historical outcomes, not retrospective full-suite PASS.

Retained targeted scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-corrections-remaining-hjKgFc`; safe-responses.json172 rows and three screenshots (Q teacher/student, E teacher). Safe metadata excludes headers beyond Retry-After, cookies, credentials and payloads. Visual readback confirms clean Q student8,35 near the lower internally scrolling result panel and clean E teacher6,00→0,00 audit; no claim that all lower result details appear in screenshots. No unsupported application-regression claim is made from admission429.

## Final owned inventory

18 files, all within original or explicitly extended surfaces:

- API: `apps/api/src/classrooms/grade-corrections.ts`, `service.ts`, `http.ts`, `grade-notifications.ts`.
- Proxy: `apps/web/src/lib/classroom-proxy.ts`.
- UI: `apps/classrooms-ui/api.ts`, `GradingEditor.tsx`, `PublishedGradeCorrection.tsx`, `Notifications.tsx`, `styles.css`.
- Tests: `tests/p8-corrections.test.mjs`, `p8-corrections-http.test.mjs`, `p8-corrections-proxy.test.mjs`, `p8-corrections-client.test.mjs`, `p8-corrections-integration.test.mjs`, `p8-corrections-remaining-integration.test.mjs`.
- Docs: `docs/p8-published-corrections.md` and this record.

Coverage: S1 T3 portion implemented; own proof partial as detailed; S4 decisions/evidence saved in Engram171/172/173, parent owns the full feature mirror. T3 is not marked complete. No product self-review correction was required; only the explicitly authorized test-preparation rename occurred. No schema/dependency/native-review/Git/remote/P9 operation. All four scratch roots remain outside the worktree for parent-owned cleanup; no recursive deletion or workaround.

## Human-authorized E-only final proof resume

User explicitly answered "Si te autorizo" to the exact request for one pending E notification-result/restart/access execution without product changes or TP/questionnaire repetition. Reconciled the actual feature document/mirror148 through L20, work record, HEAD40cf46b and dirty ownership; reloaded all four injected skills. Scope is one new `tests/p8-corrections-e-final-integration.test.mjs` fixture with E/P3 prerequisites only, plus the same admitted-result/observed429 wait+visible reopen preparation in the two existing actual tests for future runner use (NOT rerun). Capture source10 and production API/Next artifact hashes before/after; reuse observed builds, with no fullsuite/build repeats. Test330s/child360s remain fixed. Stop on any new failure, without another correction/retry. Prior outcomes above remain historical and unchanged.

Before launch: product10 SHA256 matches the prior own-proof inventory. API compiled source artifact inventory91files digest9c8bb32c7d82d8b25212c0ed97da274294062317dcd20c9a44cdf08e2bfeea91; Next BUILD_ID/server/static inventory222files digest2fa5a9f12ca20ce838778e28023bee9e18a45f07dc06618401c16788aa0353da. Inventories hash sorted relative UTF8 paths and each file's SHA256, exclude mutable runtime caches and refuse symlinks. No build repeated. Before execution, TypeScript AST parse/name checks plus `node --check` on all three fixtures passed: one notification helper declaration/call and zero shadow bindings each. Existing Dialog/Notifications/PublishedResult labels were read and matched before selectors were written. `git diff --check` exit0 with existing line-ending notices only. Engram177 records the exact authorized scope.

## Final E-only observed result and assigned closure

Exact sole command: `node -e "const{spawnSync}=require('node:child_process');const start=Date.now();const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-corrections-e-final-integration.test.mjs'],{stdio:'inherit',timeout:360000,windowsHide:true});console.log('T3 authorized E-only child exit',r.status,'error',r.error?.code??'none','duration_ms',Date.now()-start);process.exitCode=r.status??1"`: exit0,error none,4PASS/0FAIL/0SKIP,46628ms TAP/46706ms child;330s test/360s child limits unchanged. Process cleanup failures0; owned service cleanup failures0. No retry or second execution. No429 occurred in this bounded E-only run, so no synthetic46-second wait or recovery was performed.

- Actual P3 registration/sign-in/captured-mail verification for teacher/student, real E development answer/submission, private6,00 grading, explicit publication and final-only correction0,00 established the required prerequisites. Confirmed audit/gradingGET200 before successful teacher UI; audit actor/server timestamp and original publication identity persisted. Answers/question scores/feedback/receipts/locked content/files/effective pointer remained unchanged.
- Actual corrected-grade notification openPOST200 selected the exact grade/attempt; student resultGET200 returned published0,00/effective/original publication time, without reason/actor/audit/answer key.375px clean result and teacher audit screenshots have no horizontal overflow or error state. Student visual readback shows corrected0,00, retained answer/feedback and6-of10 original question points; teacher readback shows successful6,00→0,00 audited rectification/reason/actor/time.
- Actual database/private-storage/API restart restored exactly the domain-table hash, grade0,00, full audit, one correction event and unchanged effective-grade pointer. Teacher audit response exactly equals its pre-restart value. Current student result remains0,00/effective.
- Teacher removes membership via public API200. Student result/auditGET403, eventopen/readPOST403, event removed from notification list; the full rejected-command domain hash remains unchanged. Teacher retains historical audit and result0,00.
- Teacher logout204 revokes the actual session. A stale-cookie/previous-CSRF published-correctionPOST is denied401 without changing the domain hash. No cookie/CSRF/password/body is stored in evidence. Safe method/path/status/Retry-After metadata96rows confirms the expected denials and zero429.
- Post-run product10/API91/Next222 byte inventories exactly equal their pre-run inventories and earlier source10 own-proof provenance. API digest9c8bb32c7d82d8b25212c0ed97da274294062317dcd20c9a44cdf08e2bfeea91; Next digest2fa5a9f12ca20ce838778e28023bee9e18a45f07dc06618401c16788aa0353da. No product edit, build/suite repeat, TP/questionnaire replay, existing actual-test rerun or budget increase.

New retained scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-corrections-e-final-35G1sQ` contains safe-responses.json and teacher-e-zero-audit.png/student-e-corrected-zero.png. Earlier four scratch roots above are also retained; no recursive cleanup was attempted. No live child process remains from this execution.

Final current inventory19files: the earlier18 plus `tests/p8-corrections-e-final-integration.test.mjs`. This resume changed only that new exact surface, the notification-result admitted-reopen preparation in the two existing actual tests, this guide and own work record. Product10 stayed byte-identical. All changes remain within original or explicitly authorized surfaces. Parent package/runner/control/task/roadmap/coordinator files were not edited.

Final S# coverage: S1 T3 final-only published correction and assigned own functional proof; S4 durable decisions/evidence/attributed record. Whole-feature S1/S2 metrics and S3 independent Verify belong to later parent-owned tasks. Own proof is the attributed union of focused15PASS, affected68PASS, API/strictUI-web/Next0, exact194-case baseline transport equality, first actual TP success, later distinct Q success and this E-only4PASS/restart/access result. Historical actual/preparation failures remain explicit. No native approval, full-P8 acceptance, commit/merge/push/deployment or P9 is claimed.

Risk: items1-4. skill_resolution: paths-injected. Next exact action: parent reconciles this complete T3 own-proof handoff before its commit and sequential T4; final independent whole-P8 Verify Sol/xhigh remains pending.
