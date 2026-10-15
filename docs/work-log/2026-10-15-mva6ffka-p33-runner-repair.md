# P3.3 T1 — Portable outbox runner repair

- Agent / role: delegated bounded implementation writer.
- Session or task ID: `mva6ffka-m-4qzq`.
- Date: 2026-10-15.
- Branch / worktree: `feat/p33-mail-outbox`, existing project checkout.
- Starting commit: `9a8a015` (observed).
- Phase/spec: P3.3 [T1, S4/S5/S7, Log L8–L9](../../odd/tasks/p33-accounts-auth.md).
- Status: completed — bounded portability repair and assigned public checks; independent C approval remains pending.

## Request and scope

User authorization verbatim: "Continua con la implementacion. Te autorizo a que hagas lo necesarios para cerrar esta parte de P3". Parent delegates only portable TypeScript dependency resolution in the existing outbox runner, a public CLI regression, proportionate guide updates and this record. Preserve A/B/C product source, budgets, exits, sanitized logs, owned runtime resources and all prior evidence. No environment-file access, dependency copies/symlinks/install, Git mutation, native lifecycle or baseline/A/B reruns.

## Work performed

Before implementation, read the injected work-unit/backend skills, roadmap, record protocol, complete P3.3 feature/spec/bindings/tasks/Log, relevant functional-spec sections 2/3/12, coordinator record, prior C independent failure, runner/guide/public tests/private configs/import closure. Reconciled branch/commit and dirty tree: parent coordinator/feature edits and three untracked independent reports pre-exist; preserve all. Regression target does not yet exist.

Prior C verifier `mva54f11-l-8gp5` generated its scratch client successfully, then runner exited 1 with MODULE_NOT_FOUND for scratch-local TypeScript, zero public checks and no containers. That evidence is preserved, not replaced with a product-test failure or approval.

Implemented the public regression before the runner fix. It copies an explicit input closure plus only generated Prisma `.ts` source into a fresh allowed scratch; packages, env files and unrelated product code are excluded. Its public process omits inherited `NODE_TEST_CONTEXT` so Node does not suppress nested CLI tests; helpers have no import-time filesystem/process work. All 14 public checks, compiler status, process exit, persisted evidence, owned cleanup and absence of local node_modules are asserted. Runner change is only a `node:module` import and `createRequire(import.meta.url).resolve('typescript/bin/tsc')` replacing the literal compiler path. Guide documents the public command, ancestry resolution and generated-source/independent-proof boundary.

## Verification

All commands foreground with 30-second outer timeout; no timeouts or automatic retries occurred. Exact command executions, in order:

1. `node --test --test-concurrency=1 tests/p33-outbox-runner.test.mjs` — RED, exit 1, one intended failure before runner change; 1581ms total. Scratch `.test-artifacts/p33-runner-ov0W7U/public-runner.log` shows private compilation exit 1/MODULE_NOT_FOUND at scratch-local TypeScript, runner 54ms, zero checks/no Docker fixtures. Matches the prior independent infrastructure defect.
2. `node --test --test-concurrency=1 tests/p33-outbox-runner.test.mjs` — first post-fix check failed, exit 1, 4168ms. Compiler/migrations/runner/cleanup exited 0, but inherited Node test-worker context suppressed the 14 inner tests (explicit recursive node:test warning). Regression correctly rejected this false success. Evidence `.test-artifacts/p33-runner-q7Js6T/public-runner.log`. One bounded test-driver correction removed only the inherited test-worker marker and made summary matching reporter-neutral; no product correction or retry-on-timeout.
3. `node --test --test-concurrency=1 tests/p33-outbox-runner.test.mjs` — GREEN, exit 0, 1/1 regression PASS, 5176ms total. Fresh scratch `.test-artifacts/p33-runner-IwmGrp/public-runner.log`; compiler exit 0, all 14/14 real outbox checks PASS, zero failures, owned container cleanup exit 0, runner 4972ms. Scratch still has no local node_modules.
4. `node scripts/test-p33-outbox.mjs` — root alternate-case PASS, exit 0, compiler exit 0, 14/14 checks PASS, zero failures, owned cleanup exit 0, runner 4338ms. Evidence `.build/p33-outbox/verification-1792107489380.log`.

Self-review: S4 tooling/environment/logging boundary unchanged; S5 runner still uses only a unique owned cached PostgreSQL17.10 container/tmpfs, randomized in-memory credentials and name-only bounded cleanup, with no crypto/worker changes; S7 test-first proof/guide/record remain together. Inspected final source/test/doc diff, command exits, stdout/stderr and retained logs. Original 26-second runner budget, 2-second cleanup and all exit behavior remain unchanged. Test child is bounded at 28 seconds with a 29-second test deadline. No development Mailpit/PostgreSQL volumes, dependency packages, environment files, shared product source or prior reports were mutated. Existing dirty parent files/reports remained present on final Git inspection. Documentation links were read at their existing targets; no additional functional command was needed for guide-only edits after checks.

## Commits and outcomes

No commits or Git mutations by this writer. Starting candidate remains `9a8a015`; no new independent/native approval claimed.

## Handoff

First unfinished parent action: obtain fresh independent C verification against the repaired candidate with a separately generated scratch Prisma client. No new independent/native approval is claimed; prior failed C proof and A/B results are preserved. Parent owns review disposition, shared task/roadmap updates and all Git actions.

Risk 5 (tooling): runner requires TypeScript available through normal Node dependency ancestry, existing generated Prisma source, Docker and cached `postgres:17.10-bookworm`; it does not install/copy dependencies or generate clients. The regression deliberately reuses unchanged generated source, so it cannot substitute for fresh-client independent verification. The observed test-context suppression is fixed only in the new public CLI test driver, not by changing runner behavior.

Risk 4 (owned runtime): successful cleanup is evidenced by the runner's Docker cleanup exit 0 in both GREEN scenarios; no separate global container/volume inventory or development-state probe was authorized. Existing timeout/forced-termination limitations are not redesigned. No SMTP/Mailpit or HTTP journey is asserted. The unrelated weak-key wording advisory remains unchanged and is not new entropy validation.

Rollback boundary for this repair only: compiler-resolution import/expression in `scripts/test-p33-outbox.mjs`, new `tests/p33-outbox-runner.test.mjs`, focused verification-guide changes and this record. Scratch evidence is retained; do not erase prior failure records.
