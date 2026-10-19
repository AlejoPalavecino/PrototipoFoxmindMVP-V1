# P8 T4 progress — own proof complete

- Agent / role: bounded implementation worker, own verification only
- Session or task ID: /root/p8_progress; authoritative memory session ID unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p8-grading; managed p4-p3-integration/ProtipoFoxMind
- Starting commit: ec90ea601fee71e7538df258eb5bddede4d38b09
- Phase / specs: P8 T4; [feature](../../odd/tasks/p8-grading.md), S1,S2,S4
- Status: completed

## Request and scope

Implement read-only individual/classroom completion, exact academic averages and separate taught-topic progress in the existing classroom shell. Preserve first-confirmed submission timeliness and history. No P9, schema/dependencies, retained-data mutation, Git mutation or publication. Parent owns final independent Verify, feature tracking and Git.

## Work performed

Read the complete feature and Engram148/L23, functional sections11/15, roadmap and record protocol. Starting dirty parent task/coordinator/package/runner/control files are preserved. Loaded all four exact injected skills. Current canonical memory project is prototipofoxmindmvp-v1; no session ID is invented.

## Verification

Observed public-operation RED, focused rules/SQL/transport/client checks, strict builds, actual browser/API/SQL/restart/access proof, affected regressions and raw-baseline differential are recorded below. Existing API30s/Next180s/actual330s-child360s ceilings remain unchanged. Historical preparation failures remain explicit. This completion covers assigned T4 own proof, not independent whole-P8 acceptance.

## Commits and outcomes

No worker commit; parent owns Git. Whole-feature independent acceptance remains pending.

## Handoff

First unfinished action: parent reconciles the18-file T4 inventory, runs its spot check and commits the coherent unit. Parent-owned T5 and final whole-feature independent Verify Sol/xhigh remain pending; no P9 or publication before acceptance.

## Implementation and first observed proof

- Added ProgressService after GradeCorrectionService, reusing run/classroom locks and permission checks. Additive GET routes have strict read-only transport; the old summary DTO is untouched. Existing shell has own/class progress and separately identified current/historical member summaries. No schema/dependency change.
- First public RED: `node --test tests/p8-progress.test.mjs`, exit1/0PASS1FAIL, `getProgress is not a function`, 23715ms, owned database cleanup0. This is meaningful pre-implementation evidence.
- `node --test tests/p8-progress-calculation.test.mjs`: exit0/4PASS. `node scripts/build-api.mjs`: Prisma generation0/API TypeScript0, unchanged aggregate30s budget.
- First focused command: `node --test --test-isolation=none --test-concurrency=1 tests/p8-progress.test.mjs tests/p8-progress-http.test.mjs tests/p8-progress-proxy.test.mjs tests/p8-progress-client.test.mjs`: exit1/12PASS2FAIL0SKIP,28773ms. All SQL rules/HTTP passed; both failures were preparation expectations, not product behavior: the client defaults to no API prefix and composes cancellation with its existing timeout; the proxy intentionally retains `/api/v1` upstream.
- One coherent fixture-only preparation batch supplies the actual client prefix, asserts cancellation propagation rather than signal identity, and expects the unchanged upstream path. Targeted proxy/client command: exit0/3PASS0FAIL0SKIP,259ms. No product change was made for these failures. This targeted proof does not relabel the original full command PASS.
- Strict checks: `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json --noEmit --incremental false` and the same for `apps/web/tsconfig.json`: observed combined exit0, no diagnostics.
- Production Next first build via foreground `spawnSync` with180000ms timeout: exit0/no error/20025ms. No build artifact reuse or policy change.
- `node --check tests/p8-progress-integration.test.mjs` and `git diff --check`: exit0. Static preparation checked helper declarations/scopes and selectors against the existing shell, summary DTO, Dialog and new Progress component before its first actual execution. API helpers record only safe method/path/status/Retry-After metadata; every required view/reload waits for actual200. Only an actually observed integer Retry-After of1–60s permits one visible retry of that operation.

All eight SQL rule subtests passed:2 expected/3 attempts=50%; pending resubmission; grades8/6+pending=7; zero/lower replacement/historical correction; exact8.345 and class-mean trap; first-late/first-on-time snapshots; separateTAUGHT; read-only hash and new-service persistence; departure/history/reentry/absence eligibility; withdrawn denominator; unverified/peer/cross-room/removed/archive permissions. Both owned SQL cleanups exit0. One test uses an explicitly owned historical-clock fixture to make the second receipt late without changing the previously persisted real on-time snapshot.

## Remaining first-run own checks

- Affected regression command: `node --test --test-isolation=none --test-concurrency=1 tests/p8-scoring.test.mjs tests/p8-grading.test.mjs tests/p8-grading-http.test.mjs tests/p8-grading-proxy.test.mjs tests/p8-grading-client.test.mjs tests/p8-publication.test.mjs tests/p8-publication-http.test.mjs tests/p8-publication-proxy.test.mjs tests/p8-publication-client.test.mjs tests/p8-corrections.test.mjs tests/p8-corrections-http.test.mjs tests/p8-corrections-proxy.test.mjs tests/p8-corrections-client.test.mjs tests/p7-history.test.mjs tests/p7-history-http.test.mjs tests/p7-history-proxy.test.mjs tests/p7-history-client.test.mjs tests/p7-participation.test.mjs`: exit0/72PASS0FAIL0SKIP/83616ms, five owned SQL cleanup0 results. Prior scoring/grading/publication/correction/history/eligibility contracts remain exercised.
- Actual foreground command: `node -e "const{spawnSync}=require('node:child_process');const start=Date.now();const r=spawnSync(process.execPath,['--test','--test-isolation=none','--test-concurrency=1','tests/p8-progress-integration.test.mjs'],{stdio:'inherit',timeout:360000,windowsHide:true});console.log('T4 actual child exit',r.status,'error',r.error?.code??'none','duration_ms',Date.now()-start);process.exitCode=r.status??1"`: exit0/no error/44410ms;7PASS0FAIL0SKIP, TAP44321ms. No second actual run or timeout increase. Process cleanup failures0 and owned-service cleanup failures0. Existing pg queued-query deprecation warning is retained.
- Actual captured-mail teacher/student sessions and private plan upload establish the classroom through public interfaces. Initial classroom progress shows the exact zero-expected empty state without percentage or invented grade. Public submission/private grading/publication/reopening establish one of two expected deliveries,50.00%, pending reattempt1, published average8.35 and independent taught-topic1/2=50.00%.
- Loading is observed while the real request is held; refresh is disabled. First admitted own GET200 renders the correct375px page without peers, class average, feedback, answer keys or audit. Teacher current class GET200 renders the same completion and its class average. A deliberately failed refresh removes retained numeric values; visible retry obtains a new actual200 before values return. No retained value is claimed fresh merely because it remains in state.
- Current member summary's original DTO keys/attempt history remain unchanged; its separate member progress GET200 succeeds. Real database/private-storage/API restart preserves the full academic/private domain hash and exact own/class DTOs. Peer-selection, nonexistent member and foreign-room reads403 leave the hash unchanged. Archived current/member reads200 remain write-free.
- Visible teacher removal200 followed by all fresh room/member/history/invitation reads200 excludes the student from class count/denominator/average. Student progress403 is write-free; teacher historical member view200 preserves50%/8.35/reopening metadata. Teacher logout204 plus stale-session progress GET401/403 leaves the academic domain unchanged. No credential/cookie/CSRF/body is saved.
- Safe response evidence126rows, zero429. Every required progress/current-summary/historical/reload observation was an actual200, not a status inferred from DOM. The explicit simulated network failure is a fixture, not a production failure. Visual readback confirms student own mobile has three separated sections plus activity details; desktop teacher class has three cards/current roster; historical mobile screenshot shows preserved performance/plan inside the existing scrolling dialog. Its historical banner and earlier/later details are DOM-verified but not all simultaneously visible in that viewport. All tested pages have no horizontal overflow or page errors.

## Exact raw baseline differential and historical preparation

Scratch: `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-progress-transport-xQNQhz`.

1. Raw baseline `ec90ea601fee71e7538df258eb5bddede4d38b09` source blobs were read without checkout or Git mutation, UTF8/Blob-SHA1 validated, written with retained Git modes and SHA256 manifests. Candidate reads current bytes;93 baseline/95 candidate modules include the additive progress files. Identical233-file installed validator packages are physically copied with equal hashes/modes/fixed metadata; no links, install or reused build.
2. FIRST preparation exits1/1 before probing: existing `mail/mail-error.ts` constructor parameter property cannot run in Node strip-only mode (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). This is preparation, not regression. Parent explicitly authorizes one unchanged-probe run with the same `--experimental-transform-types --disable-warning=ExperimentalWarning` flags on both exact roots.
3. That authorized run exits0/0 with empty stderr but raw stdout differs in60 of201cases because the existing proxy `fail()` creates random `error.requestId` (`classroom-proxy.ts`, unchanged fail function). Status/code shapes match; this does not establish a product regression. Original raw stdout/stderr are preserved; no post-normalized PASS is claimed.
4. Parent explicitly authorizes the same external deterministic `globalThis.crypto.randomUUID` sequence in both probes, installed before dynamic application imports and requests, leaving every output field intact. Both probe files have SHA256 `76d633b6592f0f30189fbe65601d57237edc10e0242bd7835fba9491b022f800`. ONE exact comparison passes:201cases,50498stdoutbytes byte-identical,0stderrbytes, exits0/0. No source/dependency/runtime policy or budget change, no further retry. Raw manifests, both earlier preparations and deterministic outputs/result.json remain in the scratch root.

## Final inventory and handoff

Assigned18files only:

- Product9: `apps/api/src/classrooms/progress.ts`, `progress-calculation.ts`, `service.ts`, `http.ts`; `apps/web/src/lib/classroom-proxy.ts`; `apps/classrooms-ui/api.ts`, `Progress.tsx`, `ClassroomView.tsx`, `styles.css`.
- Tests7: `tests/p8-progress-calculation.test.mjs`, `p8-progress.test.mjs`, `p8-progress-http.test.mjs`, `p8-progress-proxy.test.mjs`, `p8-progress-client.test.mjs`, `p8-progress-integration.test.mjs`, `p8-progress-helpers.mjs`.
- Documentation2: `docs/p8-progress.md` and this attributed record.

Scratch roots retained for parent-owned cleanup (no recursive cleanup attempted): transport root above and `C:/Users/alejo/AppData/Local/Temp/foxmind-p8-progress-xp0diw` containing safe-responses.json and three PNGs. No live owned child process remains. Parent task/coordinator/package/T5 runner/control files are preserved; worker did not modify them. No schema, dependency, native review, remote, Git mutation, final independent Verify or P9 operation.

S# coverage: S1 T4 progress portion, S2 first-confirmed timeliness/dedup/history/current membership/separate measures, S4 decision and evidence persistence. Engram182 stores the read-model decision; progress-own-proof stores checks and discoveries. No parent feature mirror was overwritten. Whole-P8 independent acceptance and eventual main publication remain explicitly pending.

Rollback boundary: remove this additive read service/routes/UI/test/doc unit and restore the previous service export without reverting T1-T3 behavior or persisted academic data. Coherent vertical unit exceeds the advisory400-line heuristic because public rules, transport and actual UI/SQL/browser evidence belong together; no code golf or omitted tests.

Risk: items2,3,4. skill_resolution: paths-injected.

Risk: items2,3,4 (authorization/privacy, shared transport/service contracts, serialized consistent reads).
