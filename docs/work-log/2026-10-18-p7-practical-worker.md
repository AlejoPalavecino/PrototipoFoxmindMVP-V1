# P7 practical submissions — own proof complete; independent acceptance pending

- Agent / role: bounded T3 writer
- Session or task ID: /root/p7_practical
- Date: 2026-10-18
- Branch / worktree: codex/p7-activities; managed p4-p3-integration worktree
- Starting commit: d62d58c138210551f730e5532e685fa605c37340
- Phase and detailed task/spec links: odd/tasks/p7-activities.md T3, S1/S3
- Status: completed
- Skill resolution: paths-injected; all four requested SKILL.md files loaded before work.

## Request and scope

Implement only the coherent TP private attachment draft/recovery/removal/confirmed-submission slice with actual student/teacher UI and proof. Preserve accepted P3–P6/T1/T2 and all pre-existing parent edits. No T4/T5/P8, Git mutation, remote operation, dependencies, schema changes or retained-data mutation. Parent owns shared tracker/roadmap/Git. The coordinator explicitly added only `apps/api/src/classrooms/submission-receipt.ts` to the original allowed surfaces for the timing correction.

## Work performed

- Created this record before source edits; reconciled branch/head and parent-owned dirty tracker/package/runner surfaces.
- Extracted transaction-only attempt access/types and preserved compatible re-exports. Kept the production file bridge independent of participation/authoring/FileService imports.
- Added explicit production file authorizer injection with default denial for old isolated callers. Every existing P4 I/O recheck is preserved; file permission uses current editor/epoch without unrelated revision CAS.
- Added optional atomic ready-transition callback: successful readiness, draft selection and attempt revision commit together. Already-ready retry never relinks a deliberately removed file.
- Counted selected references plus active incomplete reservations under shared locks. Added pending cancellation, selected-only ready removal, no premature quota release or confirmed-byte/history/custody deletion.
- Added TP-only strict submission and teacher-owned submitted-only safe receipts, actual student file states/recovery/remove/add/confirmation/read-only receipt, and actual teacher receipt/download UI. No grade writes or fake correction UI.
- Added dedicated attachment client/proxy ingress while preserving ordinary legacy request shapes. Existing single-editor memory ownership and epoch-preserving refresh remain in force after upload revision changes.
- Added controlled SQL/race/ingress/client/proxy/bridge tests, real P3/browser/private-storage/ClamAV journey, and a distinct targeted real HTTP timing correction test.
- Added `docs/p7-practical-submissions.md` and persisted implementation/timing decisions in Engram; no session identity was invented.

## Historical failures and corrections (not erased)

1. Initial RED: `node --test tests/p7-practical.test.mjs tests/p7-practical-client.test.mjs` exited 1 with 0 pass/2 fail: public TP service/client methods were absent.
2. Initial controlled command `node scripts/build-api.mjs; node --test --test-concurrency=1 tests/p7-practical.test.mjs`: build exited 0; domain run had quota/type fixture failures, cascading missing prerequisites and an unreleased fixture client. Test timeout was 120006.559 ms; full duration 120304.5458 ms; 3 pass/6 fail/1 canceled. This is NOT a passing run.
3. Diagnostic follow-up `node --test --test-isolation=none --test-concurrency=1 tests/p7-practical.test.mjs` exited 1: sanitized migration deploy preparation failure at 31777.5252 ms, full duration 44640.3514 ms; 1 pass/1 fail; owned cleanup exit0. No cause or timeout authorization is inferred.
4. Before the coordinator's subsequent explicit no-timeout-repeat reminder, fixture correction matched pg int8 decoding to the production Prisma port using a scoped BigInt parser; fail-fast prerequisites and lock cleanup were added. Distinct subsequent normal domain run passed 10/10 (16220.1706 ms); expanded focused command passed18/18 (11757.2451 ms). These do not retroactively turn either earlier run into PASS. Initial bridge configuration fixture also failed once on intentionally insecure repeated-byte test keys; varied fixture bytes corrected it, subsequent bridge/transport checks passed.
5. The original passing deadline-crossing assertion implemented the coordinator's initial WRONG technical instruction to sample submission time after all locks. The coordinator reconciled exact functional section8 and explicitly corrected its guidance: trusted complete-body receipt determines timeliness; current authorization/configuration is still checked after waits. This did not change the user's requirements.
6. One coherent timing correction batch added a server-only request WeakMap, captured at JSON-body end. Direct domain fixtures capture trusted method-entry time. Client body/header timestamps are never trusted. Corrected focused tests now assert that complete-body receipt before deadline remains on time across a later lock wait; equality is late or closed.
7. The distinct first actual timing correction run FAILED, as detailed below. No further execution or correction was attempted after it; no broad sweep, automatic retry or budget/policy increase followed.

## Verification

### Before the timing correction

- `node scripts/build-api.mjs`: exit0 (also as the unchanged P4 runner build).
- `node --test --test-concurrency=1 tests/p7-practical.test.mjs tests/p7-practical-http.test.mjs tests/p7-practical-client.test.mjs tests/p7-practical-proxy.test.mjs tests/p7-practical-bridge.test.mjs`: expanded focused18/18 PASS, exit0.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit0.
- `node node_modules/next/dist/bin/next build apps/web`: exit0, including a bounded180000ms wrapper after the actual TP component was connected.
- `node --test --test-isolation=none --test-concurrency=1 tests/p7-practical-integration.test.mjs` via a `spawnSync`360000ms child: FIRST invocation exit0; 4 leaf/5 TAP PASS; parent test54189.2244ms/full60142.0621ms. Actual P3 registration/captured email/browser/API/SQL, real small-file S3/ClamAV approval, API restart recovery, confirmation cancel, remove/add replacement with conserved quota/bytes, second-tab transfer DURING actual paused scan, stale finalization403, teacher draft denial and submitted download digest equality. No claim of actual250MB scanning.
- `node scripts/test-p4.mjs`: FIRST invocation exit0; build0, policy/adapters/content/configuration41/41 PASS, real isolated service journeys26 leaf/27 TAP PASS (27343.0736ms). Existing30s/90s/240s budgets unchanged; NO `--persistent` development-service mode.
- `node --test --test-concurrency=1 tests/p7-authoring.test.mjs tests/p7-authoring-http.test.mjs tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs tests/p7-authoring-time.test.mjs tests/p7-participation.test.mjs tests/p7-participation-http.test.mjs tests/p7-participation-client.test.mjs tests/p7-participation-proxy.test.mjs tests/p4-host.test.mjs tests/p4-session-bridge.test.mjs tests/p4-web-proxy.test.mjs tests/p4-web-client.test.mjs tests/p4-adapters.test.mjs`: FIRST invocation57/57 PASS, exit0/full20474.0621ms. All requested names existed; none substituted.
- Raw-byte external differential against d62d58c: old client calls and old classroom/file proxy operations, plus editor-bearing sibling classroom requests, produced exact identical stdout9434bytes, stderr0bytes and exit0/0. Both sides had identical module package metadata. No output normalization or Git mutation. Probe programs and raw outputs retained in the scratch below.

### After the coordinator-authorized timing correction

- `node scripts/build-api.mjs`: exit0; Prisma generation and API TypeScript exit0.
- The exact five-file focused command above: exit0, 19/19 PASS/full11703.3341ms. Includes atomic callback rollback, shared slot race, scan failure/cancel/editor/archive/departure, unchanged denial-state hashes, confirmed conservation, optional/mandatory/duplicate submission, controlled five-by50MB metadata and exact equality, and corrected complete-body-before-file-lock-crossing.
- Both strict TypeScript commands above: exit0.
- Bounded `node node_modules/next/dist/bin/next build apps/web`: exit0,180000ms ceiling unchanged.
- `node --test --test-isolation=none --test-concurrency=1 tests/p7-practical-timing-integration.test.mjs` via a `spawnSync`360000ms child: FIRST invocation exit1, NOT timeout. Parent test30061.2892ms/full32756.4962ms; 0 PASS/2 FAIL/3 SKIP. First leaf `complete body received before deadline remains on time when selected-file lock waits cross it` returned503 rather than200 at2103.8979ms (`tests/p7-practical-timing-integration.test.mjs:55`). Delayed-body rejection, late-allowed forged-time and editor-revocation leaves were skipped due to that shared prerequisite failure. Cause is UNPROVEN; do not call this acceptance or infer production/timing cause from503.
- The original actual TP journey, P4 suite, affected57 and exact transport differential were NOT repeated after the timing-only correction. Their provenance remains pre-correction; final whole-P7 independent verification is still pending.

## Cleanup and retained evidence

- Actual first TP runtime exposed owner `53af43e01ff789d2` through its actual DB port correlation; integrated process cleanup failures0 and owned service/volume/network cleanup failures0. The targeted timing run also reported process cleanup0 and owned cleanup0, but its exact owner was not exposed/logged; no unrelated artifact folder is inferred as its identity.
- Initial timed-out controlled fixture `c52fdb0e8a2897138fa100f2` was initially retained. After the test process ended, exact owner-label plus the unique known three-user/one-canceled-file/no-link TP fixture signature were verified before scoped removal; observed removal exit0. No broad prune or foreign resource cleanup.
- Other completed controlled fixtures reported owned cleanup exit0. No retained development data, Mailpit volume, secret file or credentials were read/modified.
- Retained OS screenshot scratch (no recursive cleanup attempted): `C:\Users\alejo\AppData\Local\Temp\foxmind-p7-practical-rfcgfb` with student-confirmed-receipt.png and teacher-submitted-files.png. Student screenshot visually inspected; no visual acceptance beyond that captured state is claimed.
- Retained raw differential scratch: `C:\Users\alejo\AppData\Local\Temp\foxmind-p7-tp-differential-YdxYvN`, containing base/probe.mjs, changed/probe.mjs, exact raw modules, identical package metadata, outputs and inventory.json. Prior recursive scratch cleanup was denied, so no deletion/workaround was attempted.

## Commits, risk and outcomes

No writer Git mutation, commit, native review, remote operation or publication. No whole-P7 acceptance. Coherent vertical behavior/UI/tests/docs exceeds the advisory400-line guidance; no tests were omitted or code compressed to satisfy it.

Risk: items1,2,3,4 (persisted file/attempt state, editor/member authorization, shared transport contracts, finalization/submission concurrency).

## Handoff — Needs your decision

T3 implementation and corrected deterministic proof are present, but actual complete-body receipt/held-lock timing proof is unresolved at503. Stop before T4. Coordinator disposition is required for one bounded read-only diagnosis of the failed timing leaf and any expressly authorized targeted correction/recheck. Preserve all historical failures and pre-correction evidence. Parent must reconcile shared task/roadmap, independently verify the complete feature with the user-requested Sol/xhigh, and own any Git/delivery actions. Do not treat the earlier P7/T2 single360s repetition as blanket retry permission.

## Final bounded structural check and diagnostic lead

Owned source UTF-8 structural readback passed18 files; both new documents were read back. `git diff --check` over only owned source surfaces exited0. The global check exited1 solely on a parent-owned trailing blank line in `odd/tasks/p7-activities.md:54`; it was not edited by this writer.

After the targeted503, one bounded READ-ONLY source check found `apps/api/src/database/prisma.service.ts:11–12` retains `query_timeout:1000` and `statement_timeout:1000`. The new timing fixture chooses a deadline1000ms ahead and waits until deadline+100ms while holding the selected file lock. This fixture can exceed the existing query ceiling; the observed503's cause is still not proven. No policy/budget change, new timing execution or source correction followed. Coordinator was asked for disposition of a narrower same-policy fixture/recheck, and no response was received before handoff. The requested independent final verification remains pending.


## Coordinator-authorized test-only timing preparation correction

Coordinator authorized exactly one first-leaf deadline change1000ms→400ms, retaining release at deadline+100ms and every other leaf/assertion. Existing production query/statement ceilings remain1000ms; implementation/build bytes are frozen. One exact targeted330s-test/360s-child recheck is authorized. Original failed503 remains historical and its cause is not established. Baseline and final hashes/source/build inventories are retained in C:\Users\alejo\AppData\Local\Temp\foxmind-p7-tp-time-recheck-AoyJiq. Status: in_progress for this bounded preparation/recheck only.


## Sole authorized narrowed timing recheck — observed outcome

Coordinator disposition explicitly authorized ONE test-only preparation correction and ONE targeted recheck, not a product/policy correction or full sweep. Only the first timing leaf changed from a1000ms-ahead deadline to400ms ahead; release remains deadline+100ms. All assertions and the other three leaves are unchanged. This respects the unchanged1000ms Prisma query/statement ceiling. Original503 failure remains historical; the cause is not relabeled proven.

Exact child command, invoked ONCE after that disposition:

`node --test --test-isolation=none --test-concurrency=1 tests/p7-practical-timing-integration.test.mjs`

Its existing330000ms test and360000ms outer child limits were unchanged. Observed exit0, error null, 4 leaf/5 TAP PASS, 0 FAIL/0 SKIP; child wall39373ms, test parent36521.8571ms, TAP39107.4257ms. The four actual public HTTP/P3/SQL checks passed: complete-before-deadline body stays on time across selected-file wait; early-start/incomplete body completed after deadline is rejected without draft mutation; permitted late complete receipt ignores forged client header/body time; editor revoked during a held classroom lock still denies the earlier on-time body. Process cleanup failures0 and owned service/volume/network cleanup failures0. Exact runtime owner was not exposed by this targeted helper, so no foreign/latest artifact identity is inferred.

Frozen inventory:283 source/script/test/schema/package files and347 compiled API/Next artifacts. Before/after comparison changed ONLY `tests/p7-practical-timing-integration.test.mjs` among that source inventory; all347 build artifacts remained byte-identical. The separately authorized own work record is the only other writer surface. Fixture before SHA256 `3dcbec1c75228a82746cfe7022741e53acd80906757b323d6921cf2065ea9bf2`; after SHA256 `05e2db44e3bf43bb679b44464dcbc227314ed74223473d4e0ef922deb38eb726`. The implementation/build bytes were neither edited nor rebuilt during this continuation.

Retained scratch, no deletion attempted: `C:\Users\alejo\AppData\Local\Temp\foxmind-p7-tp-time-recheck-AoyJiq`, containing before.json, after.json, stdout.txt, stderr.txt and result.json. No broad check/sweep/retry followed. The T3 own proof gap is resolved by this narrowly authorized result; whole-feature independent acceptance and Git/delivery remain parent-owned. Next exact action: coordinator reconcile T3 and continue authorized P7 ordering before final Sol/xhigh verification. Stop before T4 in this worker. No P8 or native approval claimed.
