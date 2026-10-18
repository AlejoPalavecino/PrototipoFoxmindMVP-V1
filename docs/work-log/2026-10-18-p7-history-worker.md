# P7 history and academic notifications — own implementation proof complete

- Agent / role: bounded T5 implementation worker
- Session or task ID: /root/p7_history; authoritative memory session ID unavailable
- Date: 2026-10-18
- Branch / worktree: codex/p7-activities; managed p4-p3-integration worktree
- Starting commit: 40609b7043b62b46b3b4ed8cdc734ffd955f7097
- Phase and detailed task/spec links: [P7 T5 / S1,S3](../../odd/tasks/p7-activities.md)
- Status: completed (T5 own implementation and assigned checks only; whole P7 independent acceptance pending)

## Request and scope

Implement teacher reopening with immutable prefilled attempt history, all activity-type submitted consultation, source-transaction academic notifications and real UI navigation. Preserve existing P3–P6 and T1–T4 behavior. No P8, schema/dependency changes, Git mutation or publication. Parent owns shared tracking and runner.

## Work performed

Read required skills, roadmap, work-record protocol, P7 feature specifications and functional sections 7–9/11/15. Reconciled starting HEAD and parent's separate dirty tracker/package/runner files. Engram resolved the selected worktree to canonical project prototipofoxmindmvp-v1; no session identity invented.

## Verification

Pending meaningful RED and implementation checks. No acceptance claimed.

### Initial implementation proof

- `node --test tests/p7-history.test.mjs` against starting compiled service: meaningful RED1, missing public `reopenActivity` operation. After implementation/build the public service check GREEN1.
- `node scripts/build-api.mjs`: Prisma generation0 and API compilation0; unchanged aggregate30s helper. Repeated after complete API implementation, also0.
- `node --test --test-concurrency=1 tests/p7-history.test.mjs tests/p7-history-http.test.mjs tests/p7-history-client.test.mjs tests/p7-history-proxy.test.mjs tests/p7-notifications.test.mjs`:15PASS,0FAIL,0SKIP,12.635s. Includes six controlled SQL subtests, three-type concurrency/prefill/original/grade conservation, current membership/archive/notification access, content-save/deadline/publication events. Owned database cleanup0. Controlled authentication/storage/scanner are not actual P3/ClamAV proof.
- Both strict UI and web TypeScript commands0; production `next build apps/web`0 under unchanged180s child.
- First actual `p7-history-integration.test.mjs`330s/360s: questionnaire actual reopen→prefill/transfer→revision/delivery PASS; practical reached new ready replacement upload, then timed out waiting for nonexistent fixture label `Confirmar entrega` (existing button is `Confirmar envío del trabajo`). Evaluation/restart skipped after prerequisite failure.1leafPASS/1leafFAIL/2SKIP; parent TAP failed, child exit1 after70.1s. Exact owned processes/services cleanup0, owner5deda730300fe597. Screenshot scratch retained at OS temp `foxmind-p7-history-o9NqBu`.
- Raw physical UTF8 client/proxy differential against40609b7, identical package metadata/no links: both exits0/stderr0, baselinestdout4445bytes/current4392bytes, unequal. Reproduced candidate-caused regression: broad new `/history` guard rejected an existing membership-history GET carrying unrelated editor headers, baseline200/current400. Scratch retained at OS temp `foxmind-p7-history-differential-Yzfiij`. This is a blocker, not an advisory or acceptance.
- One forecast sent before long own checks. Initial actual notifications still in progress. One coherent correction batch is reserved for all confirmed initial blockers/fixture errors, followed only by targeted checks with unchanged budgets; no automatic retry or full-loop sweep.

## Commits and outcomes

No worker commits; parent owns Git.

## Handoff

Parent: reconcile T5, run one reported spot check, preserve separate runner/tracker changes, commit the coherent unit and continue T6/T7. Full P7 independent acceptance/publication remain pending. No worker Git or remote operation was performed.

## One coherent correction and targeted proof

- Pinned legacy membership-history regression: `node --test tests/p7-history-proxy.test.mjs` RED1 (400 instead of baseline200). One source correction narrows rejection to exact new activity/attempt routes. GREEN1; strict web TypeScript0; fresh Next build0 under180s. Existing unrelated sibling transport is preserved rather than narrowed.
- The same correction batch fixes only the practical fixture's confirm label to the actual existing `Confirmar envío del trabajo`. A first Node name-filter preparation selected0tests and launched no runtime; this is explicitly NOT functional proof. A fixture-only `P7_HISTORY_TARGETED=1` subset then selected only the previously failed TP, previously skipped evaluation and restart; it does not repeat the passed questionnaire journey. Same330s test/360s child,3leaf/4TAPPASS,40.345s,0SKIP; exact owner e747b38cfceeb5c4/process cleanup0/service cleanup0. Retained screenshot scratch `foxmind-p7-history-zxAzxv`. No second source correction or repeated full sweep.
- Corrected physical raw-byte baseline differential reused the exact40609b7 base and identical probe/module metadata: both exits0/stdout4445bytes/stderr0bytes, raw stdout/stderr equality true. Original unequal outputs remain beside `corrected-*` evidence in external scratch. No committed test reads Git history.
- New targeted atomic-event fault injection: `node --test --test-name-pattern="roll back together" tests/p7-notifications.test.mjs`1PASS/0FAIL,5.99s. Controlled owned-DB trigger makes event persistence fail during actual public publication; classroom/activity/eligibility/notification snapshots remain identical, then publication succeeds after fixture removal. Owned database cleanup0. Additional planned rollback proof, not a fresh application correction.

## Actual academic notification proof

- `node --test --test-isolation=none --test-concurrency=1 tests/p7-notifications-integration.test.mjs` under unchanged330s/360s:4leaf/5TAPPASS/0FAIL/0SKIP,37.133s, child0. Exact owner bb5b50ef771e16bf; integrated process cleanup0 and owned service cleanup0. No retry/source correction required.
- Actual P3/captured-registration-email/browser/API/SQL proves silent drafts; publication mobile320px destination/selected-tab bounds; content-save/deadline transition events/identical-save silence; submitted teacher target; reopen student history/transfer target; first-authorization only current target; withdrawal/departure rejection; later republication; legacy WALL exact payload/navigation/read; unchanged captured mail count (no academic email).
- Retained screenshots in OS temp `foxmind-p7-notifications-5jXtH6`: publication-mobile-320.png and wall-preserved-mobile-320.png. Publication320 and submitted practical375 screenshots visually inspected; existing responsive structure retained in these captured states. Not broad visual/FPS/accessibility acceptance.

## Affected regression and final readback

- `node --test --test-concurrency=1 tests/p7-authoring.test.mjs tests/p7-authoring-http.test.mjs tests/p7-authoring-time.test.mjs tests/p7-participation.test.mjs tests/p7-participation-http.test.mjs tests/p7-participation-client.test.mjs tests/p7-participation-proxy.test.mjs tests/p7-practical.test.mjs tests/p7-practical-http.test.mjs tests/p7-practical-client.test.mjs tests/p7-practical-proxy.test.mjs tests/p7-questionnaire.test.mjs tests/p7-questionnaire-autosave.test.mjs tests/p7-questionnaire-overview.test.mjs tests/p7-questionnaire-http.test.mjs tests/p7-questionnaire-client.test.mjs tests/p7-questionnaire-proxy.test.mjs tests/p6-notifications.test.mjs tests/p6-wall-client.test.mjs tests/p6-wall.test.mjs`:81PASS/0FAIL/0SKIP,46.375s, all owned DB cleanup0. Includes corrected pre-start overview and generation-aware/lost-ack queue.
- Additional exact focused contracts: `node --test --test-concurrency=1 tests/p7-authoring-client.test.mjs tests/p7-authoring-proxy.test.mjs tests/p7-practical-bridge.test.mjs`:4PASS/0FAIL/0SKIP. Cumulative affected focused85PASS, not one85-test command.
- Assigned unchanged actual TP timing: `node --test --test-isolation=none --test-concurrency=1 tests/p7-practical-timing-integration.test.mjs`,330s/360s:4leaf/5TAPPASS/0FAIL/0SKIP,34.858s, child0, integrated process/owned cleanup0. Complete-body receipt across waits, incomplete rejection, lateness and revoked editor remain intact.
- Existing full P6 WALL browser suite/other previous browser suites deliberately not repeated. Assigned current P6 notification/mobile boundary exercised by new actual notification journey including exact legacy WALL payload/mobile Muro navigation, plus focused P6. Whole-feature fresh checks remain T6/T7.
- Final `git diff --check`0; new browser files `node --check`0. Every owned changed/untracked file structurally read back:28paths,0unexpected allowed-surface writes. Initial inventory helper preparation trimmed a Git status prefix and failed on a nonexistent truncated filename; corrected read-only inventory succeeded, no repository mutation.
- Parent pre-existing task/package/runner/control files remain outside ownership/untouched. No schema/dependency/policy/timeout changes, P8 implementation, native review START/mode change, commit, remote operation or publication.
- Exact disposable owners5deda730300fe597/bb5b50ef771e16bf/e747b38cfceeb5c4 returned no remaining Docker containers at final read-only checks. No foreign resource/development Mailpit cleanup. All OS scratch retained; no recursive removal or workaround for prior denial. Helpers report own process cleanup0. Fixture pg concurrent-query deprecation warning recorded, not hidden or counted as product failure.

## Final scope and risk

T5 covers S1/S3 through the delegated implementation boundary. All three real activity types have own reopening/prefill/revision/delivery/history proof, including preserved original file custody and grade pointers. Teacher private pending access stays denied; unfinished reopenings do not create deliveries. P7 events are source-transaction-only with legacy WALL compatibility.

Risk: items1,2,3,4 (persisted historical identities/custody, current authorization/editor guards, shared HTTP/client/notification contracts, serialized attempt/event transitions). Parent's independent whole-feature Sol/xhigh verification still required. Own checks are not whole-P7 acceptance/publication authority.

skill_resolution: paths-injected (all four exact assigned skill files read before task-specific implementation).
