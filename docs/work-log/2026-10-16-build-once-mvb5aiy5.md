# P3.3 B1 — Build once, sequential checks

- Agent / role: scoped implementation writer.
- Task ID: mvb5aiy5-5-emzu; parent session 01a14539-ab7b-77dc-8eee-546a8c3dd168.
- Date: 2026-10-16.
- Branch / worktree: shared worktree; starting commit 3f63c58 (observed). No branch mutation.
- Phase / specs: [B1 S1–S3](../../odd/tasks/p33-build-once.md); main P3.3 S1–S7 / T2 boundaries.
- Status: completed — scoped B1 replacement and pure proof only, not B2/C3 or T2 acceptance.

## Request and scope

User verbatim: "si", approving replacement of failed auxiliary receipts/cache with one strict generation/compilation followed by unchanged functional checks. One sequential writer, no competing writes. Only parent-authorized scripts/tests/guides, synthetic fixture subtree and this record changed. No package/dependency/product-auth/tracking-document edits, sensitive-file reads, root compiler/DB/HTTP/Docker execution, Git mutations or review actions. Parent owns actual combined execution and alias adoption.

## Inspection and reconciliation

Read both injected skills completely before repository inspection; roadmap, work-record protocol, B1 specs through implementation bindings, main P3.3 S1–S7, account contract and functional sections2/3/12, exact C1/C2 records and relevant supplied scripts/tests/guides. Working tree contains existing tracked/untracked D2/C1 work; preserved it. Roadmap is older than D1 closure at 3f63c58; no phase acceptance inferred. Exact supplied paths only; no broad structural discovery or CodeGraph lifecycle writes. Historical C2 3PASS/8FAIL attempts are superseded failed controls, never GREEN. Historical records/fixtures and D2 product assertions remain untouched.

This record was created with status in_progress before source changes. The first unfinished action at creation was pure RED, not implementation. The completion update below follows observed proof.

## Work performed

- `scripts/build-api.mjs`: small direct exported `buildApi` plus guarded, closed-option CLI. createRequire resolves the explicit Prisma CLI and installed TypeScript executable; unchanged `generate` then `-p apps/api/tsconfig.json`,30s shared build budget, exact child streams/status reporting, fail-fast. No receipt/cache/fingerprint/compiler-program reconstruction.
- `scripts/test-p33-t2.mjs`: new exported coordinator/guarded CLI. Real build first on every invocation; only its successful continuation creates preparation reporting same-invocation output/no compiler. Sequential registration/account/sessions/lifecycle, C1 `--deadline`, D1, backend, offline contracts; exact result propagation, no retry/later stage after failure.30s outer stage scheduling limit; checks arriving late after synchronous blocking cannot be accepted.
- `scripts/p33-identity-test-env.mjs`: remove receipt branch; standalone compilation always invokes real legacy compiler with unchanged6s cap/remaining26s deadline. Preserve database/env managers. Write child streams without added newlines.
- `scripts/test-p33-registration-profile.mjs`, `scripts/test-p33-identity-http.mjs`, `scripts/test-backend.mjs`: exported functions with trusted preparation callback; default still compiles. Lazy fixture imports, guarded CLI and closed options. Same fixture ownership/env/remaining child timeout and fixed D2 patterns; case4 remains with case1.
- `scripts/test-p33-mail-cancellation.mjs`: exported function and lazy closed CLI. Deadline mode compiles by default instead of trusting pre-existing output; combined continuation avoids only that redundant prerequisite. Private cancellation/regression modes retain explicit private compilation prerequisite and original public-entry hook. No C1 deadline test/body, production12s deadline or lease change.
- `scripts/api-build-receipt.mjs`, `tests/api-build-receipt.test.mjs`: retired to inactive explanatory markers, no receipt exports or receipt tests. No filesystem deletion under worker safety rules. These are dropped controls, not passing replacements; historical C2 record/fixtures retained. Parent may handle final file disposition in its delivery scope.
- `tests/api-build-pipeline.test.mjs`: twelve pure tests covering direct build resolution/arguments/all existing project flags, failures/signals/timeouts, exact synthetic public child streams/exits, one build per invocation/order, fail-fast at every stage, successful same-process preparation, default standalone prerequisites, private component defaults, lazy help/closed options and absence of receipt bypass. Fake stages are orchestration proof only.
- Existing `tests/p33-d2-runner-options.test.mjs` was run unchanged: three passing public option/group-selection cases, exact17 original D2 names. `tests/p33-registration-profile.test.mjs` was NOT edited. No new product cases or weakened assertions.
- `docs/registration-profile.md`, `docs/backend.md`: current build-once command/aliases, standalone behavior, limits and explicit historical-failure/non-acceptance boundaries. Preserve pre-existing D2 documentation.
- New synthetic fixture directories/logs only under `.test-artifacts/p33-d2-plan-c2-mvb4asm3/`; all existing files preserved without deletion. No writes elsewhere.

## Verification — exact commands and observed results

Top-level tool capture merges stdout/stderr; separate top-level streams were unavailable and are not invented. Public synthetic child tests explicitly assert separate stdout/stderr/status. All test commands ran alone in foreground with30s outer tool timeout. No root compilation, resource stage, baseline suite or unrelated check ran.

1. `git rev-parse --show-toplevel; git status --short; git log -1 --oneline; if [ -d .codegraph ]; then printf 'CodeGraph index present\n'; fi; command -v codegraph || true`: exit0; root/base confirmed, existing dirty work observed; no index message. Safe inspection only.
2. RED `node --test tests/api-build-pipeline.test.mjs`: exit1;0PASS/1FAIL,59.717ms, intended `ERR_MODULE_NOT_FOUND` for new `scripts/test-p33-t2.mjs`. Module linking failed before old build wrapper evaluation, so no root build occurred. Capture: `.test-artifacts/p33-d2-plan-c2-mvb4asm3/build-once-mvb5aiy5-red.log`.
3. Initial post-implementation `node --test --test-concurrency=1 tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs`: exit1;12PASS/3FAIL,6092.7455ms. Two direct-build synthetic tests found installed Prisma root export resolves missing `build/types.js`, not the CLI. Public pipeline expected four synthetic group executions but fixture had only one group-matching name. Failure capture/reporter/diagnostics: `.test-artifacts/p33-d2-plan-c2-mvb4asm3/build-once-mvb5aiy5-first-check.log` (manual merged transcription, final assertion stack explicitly omitted; original tool capture authoritative). Not GREEN.
4. One bounded correction: resolve `prisma/build/index.js` through createRequire; installed package explicitly exports that path. Strengthen synthetic Prisma metadata to reproduce the root-export trap. Fix synthetic D2 fixture to provide one matching name per fixed group, retaining the unchanged expected four executions. No reduced assertions, flags or product cases.
5. Corrected GREEN `node --test --test-concurrency=1 tests/api-build-pipeline.test.mjs tests/p33-d2-runner-options.test.mjs`: exit0;15PASS/0FAIL/0SKIP,7419.6955ms. Capture: `.test-artifacts/p33-d2-plan-c2-mvb4asm3/build-once-mvb5aiy5-green.log`. Exactly one correction/recheck, no extra test command after success. **Every stage-zero line in this synthetic run comes from injected fake spawn or fake installed CLIs, not real Prisma/TypeScript.**
6. Safe self-inspection `git diff -- scripts/p33-identity-test-env.mjs scripts/test-p33-identity-http.mjs scripts/test-backend.mjs docs/backend.md; git status --short; wc -l scripts/build-api.mjs scripts/test-p33-t2.mjs scripts/test-p33-registration-profile.mjs scripts/test-p33-identity-http.mjs scripts/test-backend.mjs scripts/test-p33-mail-cancellation.mjs tests/api-build-pipeline.test.mjs`: exit0. Existing dirty/untracked work preserved; Git printed LF-to-CRLF warnings for four inspected tracked files.529 current lines across those seven scripts/test files alone. This is inspection, not an extra verification suite or exact authored-diff count.

No differential Git-history scratch test was needed or run: public synthetic tests exercise standalone defaults, exact options/streams and selected original17 names without committed history-dependent assertions. No functional regression, Windows hard termination, actual compiler latency or DB/HTTP/deadline result is newly claimed. Pure syntax/import execution is not strict application compilation.

## Self-review by specification

- B1 S1: replaced auxiliary design, not another receipt repair. User's explicit design change remains scoped to tooling; failed controls are retired, not relabeled.
- B1 S2: all17 D2 names/group coverage passed synthetically; original product cases, C1 real12s test, strict tsconfig,26s fixture work and standalone6s compiler caps unchanged.30s build and outer stage failure limits retained. No product/auth/dependency/config edits or historical-evidence changes.
- B1 S3: public coordinator generates/compiles once in each invocation, uses successful-build-only trusted preparation and never reads reusable approval. No env/CLI bypass. Build generation/compiler failures open no fixture modules; check failure stops later fixtures/stages. Exact synthetic child output/status tested. D1/backend standalone defaults retain compilation; deadline standalone now explicitly prepares too. Actual strict build remains parent-owned.
- Main S1: only backend T2 tooling; no T3/frontend/classroom/new endpoint scope or whole-P3 claim.
- Main S2: fixed seven-operation T2 boundary and D2 case assertions unchanged; no contract weakening.
- Main S3: broad mailbox/uppercase-domain policy untouched; not newly integration-proven here.
- Main S4: no crypto/authentication/configuration/secrets changes or sensitive-file reads. Diagnostic output only orchestration labels/synthetic fixtures.
- Main S5: existing withIdentityDatabase/identityTestEnvironment/withMailpit reused, no new fixture infrastructure. Existing helpers own cleanup. On asynchronous outer30s expiry the pipeline stops later stages while existing finally blocks retain cleanup ownership; cleanup/current-stage work can outlive that scheduling deadline. This is not a hard process-kill guarantee or actual timing proof; parent must inspect actual B2/C3 behavior.
- Main S6: no storage/locking/counter/concurrency changes; those remain protected by original product tests, not newly proven by fake stages.
- Main S7: tests/guides/attributed record accompany the change; no review/Git lifecycle action. Cohesive review workload exceeds400 lines (529 current code/test lines across seven paths before guides/record and retired code), reported rather than compressed. Exact authored-diff attribution versus pre-existing untracked C2 work remains parent review responsibility.

## Commits and outcomes

No commits/staging/publication. Parent owns delivery, alias edits and review disposition. B1's prescribed pure proof is complete; prior failures remain attributed. No independent/native approval or T2/P3 acceptance is claimed.

## Handoff

First unfinished task: parent B2 source review/assessment, adopt aliases if accepted, then C3 actual combined execution once with no competing source writer. New exact combined command:

```sh
node scripts/test-p33-t2.mjs
```

Run the total pipeline as parent background work; stages retain their individual limits. Never automatically rerun a failed stage. Proposed package aliases (NOT edited): `"api:build": "node scripts/build-api.mjs"`, `"test:p33:t2": "node scripts/test-p33-t2.mjs"`.

Review focus: installed explicit Prisma CLI resolution, success-only preparation reachability, resource-lazy closed CLI behavior, unchanged group patterns and product assertions, current-stage cleanup after outer expiry, standalone deadline prerequisite, retirement markers versus old failed controls. Required actual build/DB/Mailpit/HTTP12s deadline/regressions remain unexecuted here; do not advance T2/P3 based on synthetic proof.

## Key Learnings

- Prisma seven exports its executable CLI through an explicit build/index.js subpath.
- Fixed-group synthetic cases must each match the public runner's declared selection pattern.
- Same-process successful-build continuation avoids persistent cache validation and redundant compilation.
