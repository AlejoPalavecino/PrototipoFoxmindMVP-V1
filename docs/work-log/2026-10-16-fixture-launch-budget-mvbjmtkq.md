# P3.3 T3-F — Bounded fixture launch allowance

- Agent / role: package-owned implementation writer; one write thread.
- Actual task ID: mvbjmtkq-b-hn7n.
- Parent session: 01a14539-ab7b-77dc-8eee-546a8c3dd168.
- Date: 2026-10-16.
- Branch / worktree: feat/p33-token-flows / current repository.
- Starting commit: 33fd80f (observed).
- Phase/spec: P3.3 T3-F / S10 in odd/tasks/p33-token-flows.md.
- Status: completed (T3-F bounded allowance only; no auth acceptance).

## Request and scope

Human selected "Autorizar 8s solo para lanzar el fixture — recomendado" (authorize-fixture-container-launch-eight-seconds). Change only the owned fixture Docker run ceiling from4000 to8000ms, clamped by its remaining26000ms work deadline. Other Docker4000ms, outer30000ms, SQL2000ms, connect1000ms, cleanup1000+2000ms and compile6000ms remain unchanged. No configuration/bypass/retry, auth/schema/dependency/compiler changes, Git writes or native actions.

This is an operational allowance, not a demonstrated latency/root-cause fix. Preserve the attributed prior diagnostic (current run4015ms/ETIMEDOUT at4000ms, inspect cleanup1/removal0); historical causality remains unknown. Preserve the accepted historical confirmation-RED exception as unavailable evidence, not RED/GREEN proof. No nine-operation/T3/P3/native acceptance.

## Reconciliation / work performed

Read both injected skills, roadmap/protocol, T3 specification through its Log boundary, parent coordination and attributed diagnostic records, relevant functional sections2/3/12, helper, passive docs and all four authorized test files. Branch/HEAD agree with parent. Existing modified identity source/tests/runners/protected historical and coordination records plus untracked candidate artifacts are pre-existing and outside this writer's changes. No competing writer/compiler per parent. No structural exploration or CodeGraph initialization is needed for the exact-file bounded change (no .codegraph index present).

Allowed changes: helper, new pure budget test, docs/backend.md, docs/account-verification.md, this record and granted fixture-launch logs/synthetic pipeline subtree only. Rollback boundary: this narrow helper ceiling/test/passive-doc/record unit; no auth candidate changes.

## Verification plan

Strict test-first: run `node --test tests/p33-fixture-budget.test.mjs` once before the helper change; expect only the new8000ms launch assertion to fail while preservation cases pass. Fake Docker must stop before PostgreSQL and restore builtin spawn/clock mocks. Then run once `node --test --test-concurrency=1 tests/p33-fixture-budget.test.mjs tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs tests/p33-verification-runner.test.mjs` under30s foreground. Synthetic pipeline writes stay in the granted subtree; no actual compiler.

Only after pure GREEN: exactly one real setup-only invocation through public withIdentityDatabase with callback printing only `Owned PostgreSQL setup validation: ready`; static sanitized failure, no raw errors or credentials. Preserve separate stdout/stderr/exit and actual owned cleanup. Real failure stops partial, without retry/diagnosis/build/suite.

## Observed strict RED

`node --test tests/p33-fixture-budget.test.mjs` (foreground tool timeout30s): exit1, seven tests / six PASS / one intended FAIL,106.4146ms. New public-helper launch assertion observed actual4000 !== expected8000 before any helper edit. All preservation checks passed (both other Docker calls4000, global26000 remaining clamp/floor, cleanup1000/unpause1000/removal2000, cleanup failure propagation). Builtin spawn/Date.now restored in finally; fake Docker stopped before PG. Tool returned merged test streams; no separate RED stream files. Printed cleanup0/1 belong to synthetic results only, not actual resource removal.

## Commits and outcomes

No commits/staging/publication authorized or performed. Narrow source fix now changes only the Docker timeout expression to select8000 for run and4000 otherwise, retaining the remaining-deadline clamp.

## Observed GREEN / preserved orchestration

`node --test --test-concurrency=1 tests/p33-fixture-budget.test.mjs tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs tests/p33-verification-runner.test.mjs` (foreground tool timeout30s): exit0,25/25PASS,7638.6177ms. Seven budget tests and18existing orchestration/CLI checks passed. No correction/retry needed. Compiler/generation messages in this output are synthetic mocks/children only; generated files were confined to .test-artifacts/p33-d2-plan-c2-mvb4asm3. No actual build/client generation/database/network resources were opened. Test streams were tool-merged. Synthetic cleanup0 (and intentional failure1) is not actual cleanup proof.

## Exactly one real setup validation

After pure GREEN, ran this exact foreground command with tool timeout30s:

```sh
node --input-type=module -e 'import { withIdentityDatabase } from "./scripts/p33-identity-test-env.mjs"; const started = Date.now(); try { await withIdentityDatabase(async () => { console.log("Owned PostgreSQL setup validation: ready"); }); } catch { console.error("Owned PostgreSQL setup validation: unavailable"); process.exitCode = 1; } finally { console.log(`Owned PostgreSQL setup validation elapsedms: ${Date.now() - started}`); }' > .test-artifacts/p33-fixture-launch-mvbjmtkq.stdout.log 2> .test-artifacts/p33-fixture-launch-mvbjmtkq.stderr.log; code=$?; printf '%s\n' "$code" > .test-artifacts/p33-fixture-launch-mvbjmtkq.exit.log; printf 'Setup invocation exit: %s\n' "$code"; exit "$code"
```

Observed shell/tool exit0. Separate stdout:

```text
Owned PostgreSQL setup validation: ready
Owned identity database cleanup: exit 0
Owned PostgreSQL setup validation elapsedms: 6358
```

Separate stderr empty; exit log exactly0. All three logs read back. Existing public helper ran owned PostgreSQL setup and migration replay, then only the static callback. Password stayed memory-only; no raw error/URL/environment/arguments logged. Actual cleanup removal returned0, distinct from fake cleanup assertions; no independent inventory sweep or cleanup-inspection status was instrumented/claimed. No second setup, post-success tests, compiler, application/HTTP/account checks, diagnosis or suite ran. Success does not measure the individual Docker launch duration or establish latency/historical causality.

## Changed paths / S10 coverage

- scripts/p33-identity-test-env.mjs: one timeout expression; run8000/other4000 with existing global clamp.
- tests/p33-fixture-budget.test.mjs: seven deterministic public-helper tests; restored builtin spawn/clock mocks; no real PG/network/resources.
- docs/backend.md: precise launch-only budget exception, unchanged bounds and missing broader proof.
- docs/account-verification.md: same candidate allowance/limits; preserve S8 historical RED exception and unaccepted seven-operation checkpoint.
- This record: pre-edit scope, actual task/parent identity, RED/GREEN/one setup proof and handoff.
- .test-artifacts/p33-fixture-launch-mvbjmtkq.{stdout,stderr,exit}.log: sanitized separate real streams/status.
- .test-artifacts/p33-d2-plan-c2-mvb4asm3/**: existing pure tests generated synthetic fixtures only inside the granted subtree.

S10 allowance and bounded verification satisfied; S1/S5–S7 retained through scope, orchestration and no auth edits, not independently reverified here. Human's S8 historical exception and S9 diagnostic are unchanged. Source ownership/names/labels/image/arguments/error strings/defaults/cleanup and all other numeric budgets remain unchanged.

## Scoped self-review

Read-only `git diff --check -- scripts/p33-identity-test-env.mjs docs/backend.md` returned0 (only Git LF-to-CRLF advisories). Scoped diff confirms exactly one source expression changed plus passive budget docs. `git diff --numstat -- scripts/p33-identity-test-env.mjs docs/backend.md` reports helper1addition/1deletion and backend8additions. New pure test95lines; candidate guide46lines includes pre-existing candidate content; own record remains below100lines. Even conservatively counting the entire guide/record, this unit stays below400 authored lines; no compression. Prior T3-V worker's reported714-line candidate remains separate and unchanged, not reduced or accepted by this count. Final `git status --short` preserves all originally dirty/untracked unrelated entries and adds only authorized tracked/new surfaces; ignored logs/synthetic fixtures remain scoped. No post-setup tests ran.

## Handoff

First unfinished task: parent runs the actual materially changed combined regression, then mandatory independent auth/environment/security/concurrency proof and current native disposition before any nine-operation acceptance. No auth candidate/protected historical records were edited; no native tool invoked. Current accepted checkpoint remains seven operations; T3/P3/web/P4 remain unfinished. T3-F success is an operational allowance validated once, not a proven Docker root-cause fix. Parent owns staging/commits and shared feature/roadmap reconciliation.

## Key Learnings

- Fixture launch and health inspection retain distinct timeout ceilings within one global deadline.
- Pure mocked cleanup statuses are not evidence of real container removal.
- A successful setup-only migration replay does not prove HTTP authentication behavior.
- The eight-second launch allowance does not establish historical Docker latency causality.
