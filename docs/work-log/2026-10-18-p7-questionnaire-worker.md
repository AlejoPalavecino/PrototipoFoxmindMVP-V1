# P7 questionnaire and evaluation attempts — own proof complete, independent P7 acceptance pending

- Agent / role: bounded T4 writer
- Task identity: /root/p7_questionnaire; authoritative session identity unavailable, omitted
- Date: 2026-10-18
- Branch / worktree: codex/p7-activities; managed p4-p3-integration checkout
- Starting commit: c89e97344579f4bb0100b0054d1f81bf64921ff3
- Specification: odd/tasks/p7-activities.md T4, S1/S3
- Status: completed for bounded T4 own implementation/checks; independent whole-P7 acceptance pending
- Skill resolution: paths-injected; all four specified skill files loaded before task work

## Scope and preserved state

Implement questionnaire/evaluation answers, confirmed autosave, incomplete-submission confirmation, current editor/revision authorization and trusted complete-body receipt timing. Reuse existing transaction-only attempt guards, schema, safe student projections and existing UI. No T5 reopening, P8 grading, schema/dependency/policy changes, Git mutations, remote work or retained-data access. Parent owns shared tasks, roadmap, package and runner edits.

Before writing source, read the whole P7 feature document, roadmap, work-record protocol, relevant functional rules, and current participation/practical/API/proxy/UI helpers. Observed HEAD and branch match the assignment. Pre-existing dirty surfaces are the parent-owned task file, package.json, scripts/test-p7-integration.mjs and tests/p7-integration-controls.test.mjs; preserve them. Engram resolved the runtime workspace to prototipofoxmindmvp-v1; recent context and lifecycle review read, with no stale observations returned.

## Verification plan

Observe meaningful RED for the missing public answer/submission methods and autosave queue. Implement one-question atomic saves and a generation-aware serialized client queue. Run focused deterministic service/HTTP/client/proxy/queue tests, API and strict UI/web checks, production Next build, one actual P3/browser/API/SQL journey, affected T1/T2/T3 focused tests and existing actual TP timing test. Keep unchanged build/test/query budgets. Raw-byte old transport differential uses external OS scratch with identical module metadata; no committed test reads Git history. Long commands receive one forecast. Preparation failures are not functional RED. No recursive scratch removal.

## Risk and handoff

Risk: items1,2,3,4 (persisted answer/submission state, active-editor/member permissions, shared ingress contracts and serialized saves/locks).

The original coordinator-confirmed pre-start overview blocker was resolved under the later explicit L19 authorization and sole targeted proof recorded last below. All historical partial outcomes remain attributed. No full-P7 independent acceptance or publication claim.

## Work performed

- Added QuestionnaireAttemptService above the existing practical/participation/authoring service chain. Shared transaction-only attempt guards, current membership/archive/editor authority and revision CAS remain authoritative.
- Added exact per-question draft payload validation, Unicode character counting, preserved plain multiline text, single/multiple option validation, clearing, atomic answer/selection/revision writes and confirmed-only responses.
- Added strict answer/submission HTTP and bounded web-proxy routes. Reused the original complete-JSON-body receipt helper and current-under-lock deadline configuration, with no client time trust.
- Added actual student question navigation, development/radio/checkbox controls, two-second idle/navigation autosave, truthful per-question save state, retained on-screen failures/retry, explicit incomplete count/zero warning/cancel/confirmation and frozen receipt. Existing Spanish UI was extended neutrally.
- Added a serialized tab-memory-only generation queue. Pending reads cannot replace dirty values or mark a newer edit saved; epoch changes invalidate pending acknowledgements and takeover reloads confirmed data with warning. No storage-based offline recovery promise.
- Added service/HTTP/client/proxy/queue tests, an actual questionnaire/evaluation journey and a distinct targeted ambiguous-ack/focus recovery journey. No grade calculation, grade-row write, P8, schema or dependency mutation.
- Read back the new guide and owned source files; parent-owned dirty tracker/package/runner files remain untouched. No writer Git mutation or native lifecycle action.

## Historical RED and bounded correction provenance

1. Initial `node --test tests/p7-questionnaire.test.mjs tests/p7-questionnaire-autosave.test.mjs`: exit1, 0 PASS/2 FAIL, duration151.5957ms. Public save/submission methods and the draft queue were absent. This is meaningful missing-behavior RED, not a preparation error.
2. First valid candidate passed focused17, API build, strict UI/web types, Next production build, actual7leaf/8TAP, affected47 and exact old transport differential as detailed below.
3. Before closure, one self-readback identified a real ambiguous-response edge: a server-committed save whose response is lost could leave dirty CAS obsolete forever. A new public queue test observed RED5PASS/1FAIL (`'0' !== '1'`,94.8645ms). That failure remains historical, not retroactively green.
4. One coherent correction batch defers confirmed reads during active writes, then advances confirmed CAS without replacing unconfirmed generations; errors request a read-only refresh, not an automatic write retry. It also ignores older same-attempt focus epochs after successful takeover and avoids presenting a transfer warning for successful submission. Added one narrow actual recovery test. No policy, timeout, rate-limit, SQL budget or deadline change.
5. Targeted queue/client7 PASS, both strict types0 and corrected Next build0 observed. The original actual journey and broad affected suite were deliberately not repeated for this client-only correction. The distinct targeted actual recovery and the assigned existing TP timing regression remain pending at this entry.

## Observed verification before the client-only correction

- `node scripts/build-api.mjs`: exit0, Prisma generation0/API TypeScript0; unchanged aggregate30s script budget.
- `node --test --test-concurrency=1 tests/p7-questionnaire.test.mjs tests/p7-questionnaire-http.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-proxy.test.mjs tests/p7-questionnaire-autosave.test.mjs`: exit0,17/17 PASS,0 skips/full12099.1239ms. Includes controlled SQL all-type/clear/20k Unicode validation, exact-state rejection hashes, membership/archive/foreign/stale-editor/revision denials, parallel CAS, independent incomplete count, freeze and unchanged empty grade tables.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit0.
- `node node_modules/next/dist/bin/next build apps/web` via bounded180000ms spawnSync: exit0, no signal/error.
- `node --test --test-isolation=none --test-concurrency=1 tests/p7-questionnaire-integration.test.mjs` via bounded360000ms spawnSync: FIRST invocation exit0,7leaf/8TAP PASS,0fail/0skip; test43634.9696ms/full46270.5747ms. Actual P3 registration/captured verification email, Next/API/PostgreSQL, questionnaire/evaluation UI, idle/navigation saves, API restart/confirmed reload, two-tab transfer, stale denial hash, incomplete count/cancel/explicit confirm, full evaluation, zero grade rows, no storage capability leak, selected375px no-horizontal-overflow and complete-body timing crossing/late rejection. Delayed acknowledgement and failure injection are explicitly network-controlled over actual persistence, not unqualified connectivity proof.
- `node --test --test-concurrency=1 tests/p7-authoring.test.mjs tests/p7-authoring-http.test.mjs tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs tests/p7-authoring-time.test.mjs tests/p7-participation.test.mjs tests/p7-participation-http.test.mjs tests/p7-participation-client.test.mjs tests/p7-participation-proxy.test.mjs tests/p7-practical.test.mjs tests/p7-practical-http.test.mjs tests/p7-practical-client.test.mjs tests/p7-practical-proxy.test.mjs tests/p7-practical-bridge.test.mjs`: FIRST invocation exit0,47/47 PASS,0 skips/full26556.9853ms. Owned controlled database cleanup exit0 for all three SQL fixtures.
- External raw-byte transport differential against c89e97344579f4bb0100b0054d1f81bf64921ff3: exact baseline Git blobs and physical UTF8 modules, identical package metadata, no links/normalization/history-reading committed test. Both sides exit0/stdout4026bytes/stderr0bytes, raw stdout/stderr equality true. Covers old call/start/transfer/practical client requests and thirteen old proxy/sibling operations, including unrelated editor-bearing sibling behavior. Queue-only correction did not change either compared module.

## Observed targeted correction checks

- `node --test tests/p7-questionnaire-autosave.test.mjs tests/p7-questionnaire-client.test.mjs`: exit0,7/7 PASS/full131.3864ms. This is the sole targeted queue recheck after the bounded correction, not a new broad sweep.
- Both exact strict TypeScript commands above: exit0 after correction.
- Exact production Next build above, bounded180000ms: exit0 after correction. API bytes did not change during the client correction; no redundant API build or broad controlled/actual rerun.
- `node --test --test-isolation=none --test-concurrency=1 tests/p7-questionnaire-recovery-integration.test.mjs` via bounded360000ms spawnSync: FIRST targeted invocation exit0,2leaf/3TAP PASS,0fail/0skip; test31547.4969ms/full34167.3426ms. Actual P3/Next/API/PostgreSQL with explicitly network-controlled response loss AFTER an actual committed save proves the first explicit retry uses refreshed CAS without falsely claiming saved. A held older real focus snapshot cannot roll back a newer successful transfer/editor; subsequent actual save succeeds. Exact owner56e7755ad64e45e2, process cleanup0/owned cleanup0.
- Owned structural readback:19 UTF8/NUL-free/BOM-free files; scoped `git diff --check` exit0. Both exact compared transport modules still match the recorded raw-differential hashes after the client-only correction.

## Coordinator readback advisory

The new taking component mounts only after an attempt exists. Replacing AttemptSession's old read-only question map therefore also removed its pre-start overview list, although the original T2 dialog displayed safe questions/options before start. The requested actual taking/start flow passed, but this display difference is not an explicit product authorization. Reported to the coordinator for disposition; no extra source correction was silently made after the consumed bounded correction and targeted recheck. The assigned existing actual TP timing regression is running once at this entry. Final parent tracking/independent P7 acceptance/publication remains pending.

## Final observed regression and terminal disposition

- `node --test --test-isolation=none --test-concurrency=1 tests/p7-practical-timing-integration.test.mjs` via bounded360000ms spawnSync: FIRST T4 invocation exit0,4leaf/5TAP PASS,0fail/0skip; test31160.9774ms/full33808.9272ms. Existing330000ms test,360000ms child and1000ms production SQL/query budgets unchanged. Proves complete-before-deadline receipt across file-lock wait, early incomplete body completed late, permitted late actual receipt ignoring forged client time, and current editor revocation during held classroom lock. Process cleanup0/owned cleanup0. The helper did not expose its exact runtime owner, so no other artifact identity is inferred.
- Coordinator independently spotchecked the AttemptSession diff and classified the removed pre-start safe question/option overview as a candidate-caused unrequested existing output change: **blocker**, not merely an advisory.
- The allowed own correction batch and targeted recheck are already consumed. Coordinator explicitly directed source writes/tests to stop and requested a terminal partial handoff. No additional source fix, build, test, T5 implementation, commit or publication followed that disposition.
- Exact remaining blocker: restore the previous safe read-only question prompts/options in the student activity overview when there is no attempt, without creating an attempt, changing the explicit `Comenzar` semantics, exposing answer keys/scoring, or duplicating the taking controls once an attempt exists. Add a regression for the pre-start and post-start display boundary. The coordinator will ask the human for one narrow preservation correction authorization before acting.
- All earlier successful checks remain scoped to the bytes and phase identified above. They do not erase the open blocker or establish full-P7 acceptance. Full independent Sol/xhigh verification is still coordinator-owned and unrun by this writer.

## Actual owned edit inventory

All19 files are within the assigned allowed surfaces; no other writer edit was made. Existing shared parent tracker/package/runner edits remain outside this inventory.

- apps/api/src/classrooms/questionnaire-attempts.ts — new coherent answer/submission service
- apps/api/src/classrooms/questionnaire-policy.ts — new exact answer validation
- apps/api/src/classrooms/service.ts — final service-chain export
- apps/api/src/classrooms/http.ts — exact answer/submission ingress
- apps/web/src/lib/classroom-proxy.ts — bounded exact proxy routes/headers
- apps/classrooms-ui/AttemptSession.tsx — taking integration, epoch-safe refresh; open pre-start preservation blocker
- apps/classrooms-ui/QuestionnaireAttempt.tsx — actual answer/confirmation/receipt UI
- apps/classrooms-ui/questionnaire-draft.ts — serialized confirmed generation/CAS queue
- apps/classrooms-ui/api.ts — answer/session types only; previous transport behavior preserved
- apps/classrooms-ui/styles.css — scoped navigation/answer controls
- tests/p7-questionnaire.test.mjs — controlled SQL service boundaries
- tests/p7-questionnaire-http.test.mjs — HTTP ingress/complete-body receipt
- tests/p7-questionnaire-client.test.mjs — client transport
- tests/p7-questionnaire-proxy.test.mjs — exact bounded proxy
- tests/p7-questionnaire-autosave.test.mjs — deterministic autosave/generation/CAS recovery
- tests/p7-questionnaire-integration.test.mjs — original actual P3/browser/API/SQL journey
- tests/p7-questionnaire-recovery-integration.test.mjs — narrow actual client correction proof
- docs/p7-questionnaire-attempts.md — public usage/contracts/boundary guide
- docs/work-log/2026-10-18-p7-questionnaire-worker.md — this attributed record

Coverage: S1 T4 implemented and own proof observed except the explicit preservation blocker; S3 decisions/proof/bugfix/blocker saved in Engram without invented session identity. No S2 full independent acceptance or S4 delivery is claimed. Coherent behavior/UI/tests/docs exceeds the advisory400-line guidance; no code golf or omitted tests were used to satisfy a line count.

Risk: items1,2,3,4 (persisted answer/attempt state, current editor/member authorization, shared route/output contracts and save/transfer/submission concurrency). Terminal outcome: **partial — Needs your decision**, exactly the single preservation blocker above.

## Cleanup, retained scratch and presentation limits

- First actual runtime exact owner151bcf05aa32d308 identified through its DB port. Integrated process cleanup failures0 and owned service/volume/network cleanup failures0.
- Retained screenshot scratch: C:\Users\alejo\AppData\Local\Temp\foxmind-p7-questionnaire-1zswq1. Files questionnaire-submitted.png and evaluation-confirmed-375.png. The375px evaluation capture was visually inspected: existing modal layout retained, question navigation wraps, no horizontal page overflow in that captured state. This is not broad visual/accessibility or performance acceptance.
- Retained raw differential scratch: C:\Users\alejo\AppData\Local\Temp\foxmind-p7-questionnaire-differential-bTmBEB. Includes base/changed raw modules, identical metadata, probe.mjs, stdout.bin/stderr.bin and inventory.json. No recursive deletion attempted; no workaround for the earlier scratch-cleanup denial.
- No retained development data/Mailpit, secret file or foreign owned resource was read/modified. No publication or whole-P7 independent acceptance.

## Human-authorized single overview preservation correction — preparation

User authorization recorded by the coordinator in feature L19: "Sí, autorizo esa corrección puntual y su verificación, sin ampliar límites. Continuá con P7 sin avanzar con P8; para Verify usá 6.1 Sol en xhigh."

Resumed only the exact pre-start display blocker: allowed sources are AttemptSession.tsx, new tests/p7-questionnaire-overview*.test.mjs, this record and the questionnaire guide. Reloaded the three specified skills, reconciled actual HEADc89e973 and the parent-updated L19, read the current source/record and scoped Engram context/full blocker memory. All existing source, tests, shared package/tracker/runner and compiled API remain preserved. No new behavior scope, T5, Git/native/remote/P8 or broader retry authorization is inferred.

Existing deterministic actual-TSX/React server-render testing is available through the same in-memory TypeScript transpiler pattern already used by the Muro test. Add a focused pre/post-start render regression and observe actual missing pre-start content RED, then make ONE restoration. Check both strict types, bounded Next180s and one distinct actual overview integration330s/child360s; no API rebuild or fresh full sweep. A preparation failure stops proof instead of becoming application RED.

## Sole authorized overview correction — observed outcome

- Meaningful RED: `node --test tests/p7-questionnaire-overview.test.mjs` exited1 with1PASS/1FAIL/full1029.7434ms. The real in-memory TSX/React render lacked the pre-start escaped prompt, while its existing post-start nonduplication case passed. This was an application-output regression, not a runner/preparation failure.
- Made exactly ONE source correction: four lines in AttemptSession.tsx restore the former safe prompts/options map only when no attempt exists. Rendering reads only prompt/points/option text, no input callbacks, side-effecting request, correct-answer marker or scoring rule. After explicit start the existing taking component replaces that overview, never duplicates it. The guide now states this preservation boundary.
- Targeted GREEN: same exact render command exited0,2/2PASS,0skip/full382.4927ms. Both QUESTIONNAIRE and EVALUATION are covered before/after start; malicious markup stays literal/escaped and no render-time API call or supplied-projection mutation occurs.
- `node node_modules/typescript/bin/tsc -p apps/classrooms-ui/tsconfig.json`: exit0.
- `node node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit --incremental false`: exit0.
- `node node_modules/next/dist/bin/next build apps/web` via unchanged180000ms spawnSync: exit0, no error/signal.
- Sole actual proof: `node --test --test-isolation=none --test-concurrency=1 tests/p7-questionnaire-overview-integration.test.mjs` via unchanged360000ms spawnSync, existing330000ms test timeout: FIRST and ONLY invocation exit0,2leaf/3TAP PASS,0fail/0skip; test36600.0011ms/full39139.2377ms. Both actual P3/captured-email/Next/API/PostgreSQL activity types showed all safe prompts/options read-only before `Comenzar`; no answer controls, no answer-key/scoring fields, no executed literal script, no implicit start request or attempt, first_started_at remained NULL and full domain/content/answer hashes were unchanged. Explicit start then created exactly one DRAFT/lock per activity, showed one question-taking interface, and navigation showed each development/radio/checkbox control once without the overview remaining. No answers/submissions/grade rows were created by consultation/navigation.
- Exact actual runtime owner317be919f8fd6fa4 observed from its DB-port correlation; integrated process cleanup failures0 and owned service/volume/network cleanup failures0.
- External structural evidence at C:\Users\alejo\AppData\Local\Temp\foxmind-p7-overview-preservation-Sgehkq: before.json, after.json and raw AttemptSession-before.tsx. Exact byte comparison after removing only the four authorized inserted lines equals the original source. All19 explicitly hashed other files, including parent package/runner controls, and all124 actual compiled API files remain unchanged with identical inventory. No API rebuild, source normalization, broad sweep, automatic retry or policy/budget change. Five correction-surface files are valid UTF8; scoped `git diff --check` exited0.
- Retained new browser screenshot scratch C:\Users\alejo\AppData\Local\Temp\foxmind-p7-overview-browser-eDQJRW contains questionnaire-read-only-overview.png and evaluation-read-only-overview.png. The questionnaire capture was visually inspected and preserves the existing read-only dialog structure; no broad visual/performance acceptance claimed. No recursive scratch deletion attempted.

## Final handoff after L19

The sole pre-start preservation blocker is resolved by the authorized targeted evidence above. Current bounded T4 own implementation/checks are complete. Original17focused/8actual/47affected/exact transport and later7targeted/3actual-recovery/5TP-timing proof retain their recorded pre-overview-correction provenance; none was silently repeated or converted into full-P7 acceptance.

Actual owned inventory is now21 files: the prior19 listed above plus tests/p7-questionnaire-overview.test.mjs and tests/p7-questionnaire-overview-integration.test.mjs. This follow-up changed only the five explicitly allowed surfaces: AttemptSession.tsx, those two new tests, the guide and this record. All other preserved source/test/shared-parent/compiled API bytes remain unchanged as recorded. No commit identity is invented; writer made no Git/native/remote/T5/P8 action.

Coverage: S1/T4 and S3 own scope completed, including preservation correction. Parent owns shared task/mirror/roadmap reconciliation, T4 commit, sequential T5 continuation, final independent Sol/xhigh whole-feature verification and any authorized delivery. No S2 independent acceptance or S4 publication claimed by this worker.

Risk: items1,2,3,4 remain for the accumulated T4 unit. The narrow follow-up changes only rendering of already-safe projection fields; no data, authorization, API or concurrency policy changed. Skill resolution: paths-injected.
