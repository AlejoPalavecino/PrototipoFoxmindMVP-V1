# P7 B1 independent targeted proof — runtime PASS, canonical fixture decision pending

- Agent / role: `/root/p7_final_verify`, independent ODD Verify, requested gpt-6.1-sol/xhigh; not writer/native reviewer.
- Date: 2026-10-18; authoritative session identity unavailable, omitted.
- Frozen corrected candidate: `0ec37c7abb6864aec6f164e3c12548002adcbd4f`.
- Managed HEAD observed: `e4770af905637a294d0134ea04adcf366f729dea`, passive-only delta plus pre-existing dirty L32 task/coordinator records.
- Task/specs: T7/S1–S4, whole updated feature and mirror #60 reconciled through L32.
- Status: blocked for one canonical fixture consistency decision; B1 product correction independently PASSED.
- skill_resolution: paths-injected; four exact supplied skills reloaded.

## Targeted runtime result

The sole authorized L32 targeted preparation/check sequence passed on fresh immutable corrected bytes:

| Exact command / invocation | Observed result |
|---|---|
| `node <outside-scratch>/api90-driver.mjs` importing unchanged `buildApi({root,run})` | exit0;20,675ms outer command /20,592ms driver; ONE shared90s independent deadline |
| `node node_modules/next/dist/bin/next build apps/web` | exit0;24,036ms; unchanged180s ceiling |
| `node --test --test-concurrency=1 tests/p7-consultation.test.mjs tests/p7-participation.test.mjs tests/p4-session-bridge.test.mjs` | exit0;40,154ms;26PASS/fail0/skip0 |
| `node --test --test-isolation=none --test-concurrency=1 tests/p7-consultation-integration.test.mjs` | exit0;49,532ms;1PASS/fail0/skip0;330s test/360s child unchanged |

Total sequence134,401ms. No retry, source normalization, source fix or additional full sweep occurred. This was the first execution of the permanent actual B1 browser regression.

Observed B1 and necessary invariants:

- Ordinary GET/session/file requests do not disclose active-room TP instructions or create participation before actual opening, including consultation-only enrollment.
- Actual expired-before-enrollment TP detail opening creates exactly one initial read-only DRAFT, sets the content lock and leaves expected=false, epoch0, editor hash null, no submission/grade.
- Content edits after opening return409 with unchanged domain hash. Concurrent/repeated openings preserve one attempt.
- Transfer/upload/submission remain denied until legitimate authorization; controlled rejection hashes remain unchanged.
- Future first-submission authorization retains SAME attempt ID/number and sets its individual deadline without copying/issuing an editor. Explicit transfer then grants control on that same attempt.
- Prior submitted/reopened history is not reused through initial authorization; expected TP and quiz start policies remain intact.
- Archived never-opened consultation is write-free, reveals authorized instructions without creating a fictitious attempt, and leaves zero grades.
- Real P3 registration/session/verification through captured mail, actual browser/UI/API/SQL/private services and archive flow passed. Controlled file/storage/scanner ports in the focused tests are not mislabeled actual ClamAV; real service runtime is separately exercised by the actual test.

## Static canonical fixture consistency finding C1

Final proof-lineage readback exposed one still-unmodified assertion related to the same B1 rule:

- `tests/p7-participation-integration.test.mjs:78` asserts `expected=false` AND `canStart=false` for the expired TP first-enrollment case.
- The corrected rule and now-passing permanent actual regression `tests/p7-consultation-integration.test.mjs:37` assert `expected=false` AND `canStart=true`.

The old integration file is byte-identical to the prior bbc809c file. No full/default runner was executed after correction, so this is an exact static assertion conflict, not a newly observed runtime default failure. It must not be hidden by projecting prior44 passing tests onto the current canonical runner. No new product bug is claimed; the B1 runtime correction is verified. No edit/retry/full sweep was performed for this finding.

Needs your decision: align that canonical expectation with the B1 rule and define its bounded targeted validation. The correction boundary is respected: report the missed fixture alignment, do not silently fix or loop. Current whole-feature closure/main publication remains pending that disposition.

## Independent-only90s exception and shared helper preservation

L32 explicitly permits only this preparation to use90s. Outside-only api90-driver.mjs imports the original helper and injects a run wrapper that passes the remaining time from ONE absolute90s deadline to each original child. It returns each original spawn result unchanged. Exact stdout/stderr, child PID/status/signal/error and original/injected timeout values are retained in api90-child logs and api90.children.json.

- Prisma child: status0/error null/signal null,16,391ms; original requested29,998ms, injected remaining89,995ms.
- API compiler child: status0/error null/signal null,4,190ms; original requested13,603ms, injected remaining73,600ms.
- No source/script/environment-global policy change. Shared scripts/build-api.mjs still contains its original30,000ms aggregate limit.
- Raw baseline and corrected helper blob: `455e419d6d949a772f64fa6b0f58c91e66913125`, SHA256 `efc9c173b16296d8145dd5c43bd36bf3cfb50bea150cda9fb02f896464e55769`, unchanged before/after.

This is NOT a corrected shared-default30s PASS, even though this particular authorized90s preparation completed in20.592s. Earlier default/targeted unavailable30s results remain historical and are not relabeled.

Auxiliary qualification: one pre-execution cross-check incorrectly demanded raw equality with the existing managed checkout helper. Its36 pre-existing CRLF line endings produce SHA256 `992099fc2e53be4e039127cbfbe4a538dde8308d6034502050a560eb4d680014`; normalized read-only comparison proved it otherwise identical to raw LF Git. The overstrict assertion emitted an error; it was not an application command or actual byte mismatch in the frozen candidate. Raw candidate/baseline identity and the driver's guard passed. No normalization/write or application retry occurred. Before/after hashes for each individual root are unchanged, retained in helper-provenance files; this failed auxiliary check is disclosed rather than counted as a passing command.

## Exact preparation and integrity

Fresh Node-mkdtemp OS root: `C:/Users/alejo/AppData/Local/Temp/foxmind-p7-b1-90s-e2P2aa`; preparation39,727ms.

ALL512 tracked paths, modes and blob bytes extracted by byte-safe git ls-tree -rz/cat-file --batch, fatal UTF-8 path decode, per-object Git SHA1 validation and SHA256 readback; no exclusions, checkout/ZIP normalization or raw-source PowerShell conversion. Tracked operational .engram/config.json included; untracked env/secret/development files not copied. All modes100644; unsupported link modes rejected.

Separate physical dereferenced node_modules:31,519 files /3,314 directories /772,674,988 bytes, nested dependencies included, no symlinks/hardlinks/reparse points. No dependency install or version changes. No .build/.generated/.next existed before preparation; no partial build from older roots reused.

Final raw512/512 blobs match frozen Git hashes/modes, zero changed/missing. Fresh output contains127 API files,42 generated files and production Next BUILD_ID. Manifest tree SHA256 `c98f4cbedfa84782d70f62915f10b6c6a623472c5b3c308917b80446ff2dd70c`.

Original dirty249 tracked bytes/modes/status unchanged. Managed513 tracked bytes/modes and its pre-existing dirty record statuses unchanged. Before/after inventory hashes: original `166941f477dd4fe047762fcbbcffb2d2ef74d9f540ed5fe1882927ada1f2eed3`; managed `ac18b6c015b1abcfce104e7dd0b684e9a1a16079e9ca984ee317dc618ccadb46`.

## Provenance and cleanup

Prior bbc809c independent fresh default35leaf44TAP/focused120/strictUIweb0/exact29route116-observation31,412-byte baseline pair/dependency8/audit0 are preserved in foxmind-p7-verify-repeat-rkJc5c. Current raw manifest comparison shows only TWO production deltas: activity-participation.ts and files/access.ts, covered by this targeted recheck. UI, shared HTTP/proxies, scripts, package/lock data and other production blobs are unchanged. Remaining differences are tests/docs/passive attribution. See prior-proof-lineage.json. No new full sweep was run or claimed; C1 above prevents claiming the current default is green.

Controlled database cleanup reported exit0 twice. Actual process and owned-service cleanup both0. Final read-only queries for exact recorded outer runner, preparation driver, Prisma, compiler, Next build, controlled and actual PIDs/direct children returned none. The actual helper does not expose its Docker owner key in output; its ownership-checked cleanup reported0, without claiming an independent exact-name inventory for that unlogged key. No broad kill, foreign Mailpit access, pruning or recursive deletion occurred. All historical/new OS roots and evidence remain retained.

## Per-spec verdict and handoff

- S1: B1 product defect CLEARED by corrected-byte actual proof; unaffected prior P7 proof retains precise provenance. Whole-feature closure pending C1 fixture disposition, not another product failure.
- S2: targeted exact preparation/checks PASS under explicit90s independent-only exception. No corrected shared-default30s or fresh full-sweep PASS claimed. Current canonical assertion conflict is disclosed.
- S3: L32 task/mirror reconciled and outcomes persisted to canonical Engram without invented session identity. Parent persists this attributed record/mirror closure.
- S4: PENDING; no merge/push or native authority claim by verifier. Parent only delivers after accepted C1 disposition. No P8.

Evidence files include full raw/dependency/pre-post manifests, prepare.cjs, api90-driver.mjs, run-targeted.cjs, exact child/command results and stdout/stderr, helper-provenance-before/qualification/after.json, final-integrity.json and prior-proof-lineage.json.

Risk: candidate items1–5; verifier made no source change.


## Coordinator disposition of canonical B1 expectation
Persisted by /root from read-only Sol/xhigh verifier. Product B1 and required invariants independently passed; the remaining false canStart expectation is the same corrected B1 rule in a pre-correction fixture, not a new product finding or additional production correction. Parent aligns only that existing assertion false→true and leaves expected=false and all no-fictitious-attempt checks unchanged. This is bounded B1 verification preparation; no further product change or whole-feature sweep is authorized. One targeted canonical participation journey follows to validate this alignment, with all prior proof separately retained.
