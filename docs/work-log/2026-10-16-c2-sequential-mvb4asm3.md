# P3.3 C2 — Sequential orchestration, partial handoff

- Agent / role: scoped implementation writer.
- Original task ID: mvb4asm3-2-dydh.
- Resumed task ID: mvb4fg2s-3-s0dm.
- Parent session: 01a14539-ab7b-77dc-8eee-546a8c3dd168.
- Date: 2026-10-16.
- Branch / worktree: shared repository worktree; branch not queried in this task.
- Starting commit: 3f63c58 (observed).
- Phase / specs: P3-A S1–S3; C2 S1–S2; main P3.3 S2/S5/S7.
- Status: in_progress — partial handoff, required receipt checks fail after the one permitted correction.

## Request and scope

User request verbatim: "Vamos con la opción mas segura para terminar con P3". Sequential C2 owns only the listed wrapper/receipt, runner/helper, tests, guides and this record. Parent owns package alias, combined build/integration, review and Git. Preserve dirty D2/C1 source, unfinished tests and all historical failures. No sensitive-file access, dependency changes, root compiler, Docker/HTTP integrations or review-tool repair.

Initial inspection found existing synthetic tests writing outside the exact allowed surfaces. Stopped without implementation/testing and created this record. Human subsequently selected `approve-c2-synthetic-fixture-subtree` through ask_user_choice, authorizing exactly `.test-artifacts/p33-d2-plan-c2-mvb4asm3/` and synthetic descendants for these two tests. Continuation retained the original directory and record, appended its actual resumed task ID and preserved existing fixtures without deletion. No competing writer reported.

## Inspection and reconciliation

Read both injected skill paths successfully before original repository inspection. Read roadmap, work-record protocol, P3 completion/T2 correction specifications, main S1–S7, functional sections2/3/12 and account API guide, historical C2 plan, returned C1 record, exact runner/helper/test/configuration/package/document paths. The roadmap predates actual D1 closure; no T2 or whole-P3 completion inferred. Existing tracked/untracked D2/C1 files remain preserved. No broad structural exploration or CodeGraph initialization was performed; exact supplied paths only.

## Work performed

- `scripts/api-build-receipt.mjs` (new): candidate content-hashed snapshot of strict compiler options, compiler-loaded files, schema/config/package/lock, complete installed dependency bytes except unused `.bin`, all generated files and exact expected emitted outputs. Derives paths rather than following receipt-supplied paths; rejects sensitive names, traversal and symlinks. No environment files read. Verifier catches failures and rejects reuse. This implementation is NOT validated: current pure tests fail during compiler input discovery.
- `scripts/build-api.mjs` (new): candidate resolved generation then unchanged strict project compiler invocation, prior-receipt invalidation, observed-exit-only issuance,30s internal remaining-stage cap. No root build run and no root receipt issued by this task. Proposed package alias only; package.json untouched.
- `scripts/p33-identity-test-env.mjs`: existing shared compiler helper reuses only a verified receipt, logging no compiler invocation; otherwise explicit legacy fallback retains6s compiler cap and remaining26s work budget. It never writes a receipt from fallback. Existing identityTestEnvironment/withIdentityDatabase unchanged.
- `scripts/test-p33-registration-profile.mjs`: mandatory finite registration1–7/account8–12/sessions13–14/lifecycle15–17 groups, lazy resource imports after closed option validation, one fresh owned database/inbox invocation via existing helpers. No all-groups loop/subdivision/retry. Registration case4 remains with case1. Existing26s work/30s outer policy unchanged.
- `tests/p33-registration-profile.test.mjs`: retain all17 names/bodies, raw boundaries, real1.6s wait, races, SQL outages and worker cases; consume status-only response bodies through one helper. No product assertions weakened. HTTP behavior not executed in C2.
- `tests/api-build-receipt.test.mjs`: preserve unfinished tests and add synthetic strict-option/output/path/stage/helper negative cases. Synthetic compiler CLI accepts exactly the legacy project arguments; synthetic stage exits are never represented as root compiler proof.
- `tests/p33-d2-runner-options.test.mjs`: preserve option/count checks, add closed-option edge cases and actual public group-selection executions using synthetic helper/test modules. All three tests pass, selecting exactly17 original names across fixed groups.
- Both pure tests use only the human-approved fixture subtree, including synthetic spawned children. Existing fixtures preserved without deletion. Fixture files are generated evidence, not application/dependency changes.
- `docs/registration-profile.md`, `docs/backend.md`: candidate group/receipt commands, historical failures retained, C1 component versus deferred integration boundary, explicit current failure warning and no alias adoption/C3 until corrected pure proof.
- `scripts/test-p33-identity-http.mjs`, `scripts/test-backend.mjs` were inspected, not edited: they already invoke the shared compiler helper and inherit candidate receipt behavior without duplication.

## Verification — exact commands and observations

All commands foreground, outer tool timeout30s for tests,10s for Git inspection. No unchanged historical timeout replay. Direct tool output combines stdout/stderr; separate top-level stream capture was unavailable and is not invented. Synthetic child CLI tests capture stdout/stderr/status explicitly; not every such assertion was reached because receipt discovery failed.

1. `git rev-parse --show-toplevel && git status --short && git log -1 --oneline && if [ -d .codegraph ]; then printf 'codegraph index present\n'; fi`: exit0; root/base3f63c58 confirmed, existing dirty/untracked work observed; no index-present message.
2. `git status --short && git log -1 --oneline`: exit0 on continuation; same base and existing dirty work preserved.
3. RED: `node --test tests/api-build-receipt.test.mjs`: exit1,0pass/1fail,55.4322ms. Intended missing implementation: `Error [ERR_MODULE_NOT_FOUND]: Cannot find module ... scripts\\api-build-receipt.mjs`. Only fixture-root edits preceded RED; implementation did not exist.
4. RED: `node --test tests/p33-d2-runner-options.test.mjs`: exit1,0pass/2fail,114.8719ms. Public help returned1 instead of0 due eager imports; runner lacked `--test-name-pattern`. No fixtures/network were opened by a real resource manager.
5. Initial GREEN attempt: `node --test --test-concurrency=1 tests/api-build-receipt.test.mjs tests/p33-d2-runner-options.test.mjs`: exit1,3pass/8fail,8898.3136ms. Every receipt case failed at `TypeError: host.useCaseSensitiveFileNames is not a function`; public wrapper assertion included stderr `API build unavailable; no valid receipt issued`. Three CLI/selection cases passed. No root compilation attempted.
6. One permitted bounded correction: restore CompilerHost's `useCaseSensitiveFileNames` function after spreading ParseConfigHost's boolean. No flags/test assertions changed.
7. Corrected-candidate check: `node --test --test-concurrency=1 tests/api-build-receipt.test.mjs tests/p33-d2-runner-options.test.mjs`: exit1,3pass/8fail,12412.8688ms. Current receipt error: `Error: Unsafe build path`, through `directoryExists` -> TypeScript `getAutomaticTypeDirectiveNames` -> `createProgram`. Public wrapper again failed closed. Three CLI/selection cases passed again. This is NOT GREEN, and no further correction/retest was performed.
8. `git diff --check -- scripts/api-build-receipt.mjs scripts/build-api.mjs scripts/test-p33-registration-profile.mjs scripts/p33-identity-test-env.mjs scripts/test-p33-identity-http.mjs scripts/test-backend.mjs tests/api-build-receipt.test.mjs tests/p33-d2-runner-options.test.mjs tests/p33-registration-profile.test.mjs docs/registration-profile.md docs/backend.md docs/work-log/2026-10-16-c2-sequential-mvb4asm3.md && git diff -- scripts/p33-identity-test-env.mjs docs/backend.md && git status --short`: exit0; tracked scoped whitespace check clean, LF-to-CRLF warnings for backend guide/shared helper; unrelated dirty files retained. Untracked candidate files are not covered by Git diff's tracked whitespace scan. Final subsequent changes only annotate documentation/this record with observed failure.

Top-level final reporter summary (verbatim):

```text
ℹ tests 11
ℹ suites 0
ℹ pass 3
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12412.8688
```

Current failing tests (exact names):

- receipt requires observed zero stages and exact inputs/outputs; same timestamps cannot hide changes
- receipt rejects each stale compiler source/config/schema/dependency/generated/output input and new source
- malformed, traversal, environment-file and symlink receipts are rejected without following supplied paths
- receipt refuses changed-during-build input and nonzero stages
- strict options, missing/extra emitted artifacts and unsafe source/output links fail closed
- public wrapper runs resolved generation then strict project CLI; only both zero create reusable receipt
- failed generation invalidates an earlier successful receipt and never invokes the compiler
- existing compiler helper reuses only a valid receipt, with explicit missing/stale legacy fallback

Passing tests (exact names, both combined attempts):

- public help and invalid closed-group options exit before resource imports
- closed selection covers every original behavior exactly once and preserves registration dependency
- each public group selects its exact original cases using fresh synthetic helper invocations

No typecheck command applies to these JavaScript orchestration edits in this bounded worker. Parsing/import execution of candidate JavaScript occurs in synthetic checks, but this is not strict API compilation or whole-application proof. Root build/DB/Docker/HTTP/deadline/regressions/native actions were explicitly not run. No base scratch differential was run: public options checked against preserved original17 names and fresh synthetic CLI modules without Git-history-dependent committed tests.

## Self-review by specification

- P3-A S1: sequential work with one explicit human scope decision, no competing writes or delegation. S2: only C2; no remaining endpoints/frontend/new product scope. S3: contracts, broad mailbox/uppercase rejection, fixed SMTP and encrypted outbox unchanged; sensitive files never accessed.
- C2 S1–S2/main S2: fixed17-case grouping has observed synthetic public CLI proof; all existing behavior cases/assertions retained. Integration remains missing. Existing fixtures and unrelated changes preserved; no dependencies/config/schema changes.
- Main S5: fresh fixture composition reuses existing managers/keys; no parallel fixture manager or mail/product change. Same work/outer/compiler/lease limits. Candidate receipt fails closed today, but successful issuance/reuse/staleness/output coverage is NOT proven. Root combined typecheck and all lifecycle proof remain deferred.
- Main S7: tests/guides/attributed record accompany the candidate. Honest partial status; historical failures and timeout causes remain unknown. Parent owns independent verification/native lifecycle/Git. Native ASSESS reported unavailable by parent, not repaired or invoked here.

## Risks and first unfinished task

One bounded correction is exhausted. Stop here with status partial. The current synthetic project has no explicit `types` option; TypeScript5.9's `getAutomaticTypeDirectiveNames` normally probes ancestor `node_modules/@types` directories. The safe host throws on these outside-root metadata probes. Read-only inspection of installed TypeScript source at lines44537–44559 confirms this loop; no out-of-root contents were read by the custom host. Parent must choose a new bounded correction/verification scope before further edits or checks; do not weaken strict flags or permit unsafe file reads merely to pass this case.

Additional source-review risks not runtime-proven: complete dependency hashing may consume meaningful root runner budget; output discovery has not reached successful synthetic validation. Wrapper captures its compiler/schema snapshot after generation, so generation-input stability across that preceding stage should be checked before acceptance. No root compatibility or latency claim is made.

## Commits and handoff

No commits/staging/dependency mutation/Git state changes. Proposed alias (NOT READY FOR ADOPTION): `"api:build": "node scripts/build-api.mjs"`.

After a separately authorized correction and passing pure receipt proof, parent may adopt the alias and perform C3 once against both returned units. Only successful combined build permits the remaining commands, each foreground with30s outer cap:

```sh
npm run api:build
node scripts/test-p33-registration-profile.mjs --group=registration
node scripts/test-p33-registration-profile.mjs --group=account
node scripts/test-p33-registration-profile.mjs --group=sessions
node scripts/test-p33-registration-profile.mjs --group=lifecycle
node scripts/test-p33-mail-cancellation.mjs --deadline
node scripts/test-p33-identity-http.mjs
node scripts/test-backend.mjs
node --test tests/p31-contracts.test.mjs
```

No T2/P3 completion, independent approval or native approval claimed.

## Separately authorized metadata-probe correction — mvb4z1xw-4-sfqs

Human selected verbatim "Autorizar la corrección acotada — recomendado" (`authorize-bounded-c2-path-probe-correction`). Actual correction task ID: `mvb4z1xw-4-sfqs`. Read R1 S1–S2 in `odd/tasks/p33-c2-path-correction.md` and both previously injected skills again. Rechecked working tree/base3f63c58; unrelated D2/C1 changes and all synthetic fixtures preserved. This entry precedes implementation edits.

Scope: change only safe TypeScript metadata existence-probe handling. An out-of-project file/directory existence probe may be answered absent without inspecting the target; actual reads/hashing remain guarded, and sensitive/symlink paths remain rejected. No compiler flags, tests, dependency hashing/cache, generation lifecycle, package alias or product behavior changes. Exactly one existing combined11-check command after the fix, foreground30s outer limit; any remaining failure is partial with no additional correction or retry. Prior RED and both3PASS/8FAIL attempts above remain historical evidence, not rewritten.

### Narrow correction performed

Only `scripts/api-build-receipt.mjs` metadata existence handling changed. Added a lexical `relative`/`resolve` boundary predicate before `fileExists`/`directoryExists` call `fs.path`, `existsSync` or `lstatSync`. Parent/other-drive probes return false without inspecting their targets; the root directory itself is recognized without a probe and is never treated as a file. In-project paths still pass through the unchanged sensitive-name/symlink guard. `readFile`, hashing, traversal, dependency snapshots, compiler flags/options, generation lifecycle and alias remain untouched. Test sources and all11 controls are unchanged. Guides now distinguish the resolved probe symptom from the newly exposed output-discovery failure.

### Sole permitted verification — observed failure

`node --test --test-concurrency=1 tests/api-build-receipt.test.mjs tests/p33-d2-runner-options.test.mjs`: exit1,3pass/8fail,12486.2906ms; foreground tool timeout30s. Exactly one functional command ran in this correction batch. No new RED was required: original RED and prior3PASS/8FAIL remain above. No second correction or test replay followed.

The harness returned merged stdout/stderr, not separately captured streams. Exact merged reporter lines:

```text
✖ receipt requires observed zero stages and exact inputs/outputs; same timestamps cannot hide changes (911.313ms)
✖ receipt rejects each stale compiler source/config/schema/dependency/generated/output input and new source (908.2909ms)
✖ malformed, traversal, environment-file and symlink receipts are rejected without following supplied paths (896.3366ms)
✖ receipt refuses changed-during-build input and nonzero stages (874.8749ms)
✖ strict options, missing/extra emitted artifacts and unsafe source/output links fail closed (5273.6356ms)
✖ public wrapper runs resolved generation then strict project CLI; only both zero create reusable receipt (991.2004ms)
✖ failed generation invalidates an earlier successful receipt and never invokes the compiler (386.5932ms)
✖ existing compiler helper reuses only a valid receipt, with explicit missing/stale legacy fallback (947.4577ms)
✔ public help and invalid closed-group options exit before resource imports (391.9243ms)
✔ closed selection covers every original behavior exactly once and preserves registration dependency (1.6021ms)
✔ each public group selects its exact original cases using fresh synthetic helper invocations (677.0746ms)
ℹ tests 11
ℹ suites 0
ℹ pass 3
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12486.2906
```

Current repeated diagnostic (exact): `Error: Debug Failure. False expression: Expected fileName to be present in command line`. Stack reaches installed TypeScript `getOutputFileNames` at120749:9 and candidate `scripts/api-build-receipt.mjs:128:25`, after compiler input discovery. The public-wrapper assertion separately reports `API build unavailable; no valid receipt issued` and actual1/expected0. No successful root compiler/receipt is inferred. Same eight failing test names and same three passing CLI tests as the prior attempt; failure location changed, not acceptance.

### Self-review and stopping point — R1 S1–S2

- R1 S1: PASS for the authorized narrow implementation and exactly one unchanged11-check invocation; original failures retained. Overall R1 proof remains PARTIAL because that invocation still fails. No new RED fabricated.
- R1 S2: source review confirms external existence probes return false before filesystem calls; actual reads/hashes and in-project symlink/sensitive-path rejection remain guarded. No tests/flags/dependency design/generation/alias/product changes, fixture deletion, root build/HTTP/Docker, sensitive-file access or review/Git mutation. All fresh test outputs stay within the same approved synthetic subtree. Negative receipt cases cannot be claimed fully exercised because earlier snapshot construction fails.
- Existing C2/main S2/S5/S7: fixed17-name grouping remains synthetically passing; successful receipt issuance/reuse remains unproven; attributed failure history updated. No C2/T2/P3 completion or native approval claimed.

Blocking finding: the output-name assertion prevents successful receipt checks. Read-only inspection of installed TypeScript at120746–120754 shows `getOutputFileNames` normalizes its input filename before checking exact membership in `commandLine.fileNames`; the candidate command-line list currently comes from platform-native `resolve` paths. A Windows slash-representation mismatch is a source-supported candidate explanation, not a separately tested fix. No change to output discovery was authorized or performed.

Advisories, not new corrections: prior full dependency hashing latency and generation-input-stability questions remain deferred; this batch does not investigate/redesign them. Root integration and package-alias adoption remain deferred. Parent needs a fresh human disposition for any further correction; do not run C3 or claim receipt readiness from3/11 passes.

Current status: partial. First unfinished action is parent review of this exact failing result and a new human disposition; no further worker correction/test is authorized. Own record remains `docs/work-log/2026-10-16-c2-sequential-mvb4asm3.md`, correction task `mvb4z1xw-4-sfqs`.

## Key Learnings

- ParseConfigHost uses a boolean case-sensitivity field while CompilerHost requires a method.
- TypeScript ambient type discovery probes ancestor directories unless explicit types constrain discovery.
- Untrusted existence probes can return absent before any filesystem metadata access.
- TypeScript output discovery normalizes input paths before exact command-line membership checks.
- Fixed group CLI selection can be tested without importing database or inbox resource managers.
