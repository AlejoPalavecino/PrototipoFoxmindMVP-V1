# Complete automated suite inventory — in progress

- Agent / role: /root/ci_remediation / implementation
- Session or task ID: /root/ci_remediation
- Date: 2026-10-30
- Branch / worktree: codex/audit-remediation, isolated remediation worktree
- Starting commit: 446d3cb (substantial staged and concurrent changes preserved)
- Phase/task: audit remediation contract D, requested full automated coverage
- Status: in_progress

## Request and scope
Expand the explicit suite to all safely automatable tests with named exclusions and wrappers. Preserve quick gates and existing work; do not run real providers, retained data or unapproved shared containers. Test runner owns tests.

## Work performed
Read existing suite, runner, workflow, package scripts and selected wrapper inventory. Current selection has 18 pure, 10 transport, 12 owned integration files; this is not full coverage. Awaiting independent RED and architect classification of owned fixtures.

## Verification
No full-suite execution or implementation yet. Explorer estimates 352 test paths, 304 node:test imports, 48 helper/manual paths; classification is provisional and subject to validation.

## Commits and outcomes
No commit.

## Handoff
Receive RED and owned-runtime routing contract; create explicit inventory, coverage validator and bounded complete-suite command, preserving existing quick gate.

## Complete inventory and runner — implementation evidence

`complete-suite-inventory.json` explicitly classifies 353 discovered `*.test.mjs`: 302 executable files and 51 exclusions. Exclusions comprise helpers, interactive/retired artifacts, retained P4 persistence and three P9 scanner diagnostics requiring retained external files. `complete-suite-routes.json` assigns 178 fast files, 65 owned database files, 41 owned browser files, 8 owned service files and 10 files covered by explicitly selected bounded wrappers (P33 grouped routes included); routing uses 23 route records and no glob selects execution. Architect classification is based on source inspection, not runtime proof. `npm run test:complete -- --check` exited 0 and checked both inventory and routes. Default `npm run test:complete` runs groups serially, fail-fast; group selection uses `-- --group fast|owned-db|owned-services|owned-browser|wrappers`. Fast uses max four children, waits active batch on failure, kills its process tree on deadline, fails on empty TAP and reports skipped/unrun. Other groups use per-child 360s and explicit environment; API/Next/private TypeScript preparation remains bounded 30/180/30s respectively. CI has a five-group job matrix capped at two parallel jobs and 300 minutes per job; the previous gates remain.

RED→GREEN tests authored independently by `/root/remediation_tests` cover inventory omission/duplicates/exclusions, routing, mandatory wrappers, all bounded P33 groups and forbidden narrowing flags, fake wrapper failure/timeout, fast four-way fail-fast and wait, empty TAP and timeout. `node --test tests/audit-complete-suite.test.mjs` last observed 10 PASS. `node --test tests/audit-complete-suite.test.mjs tests/audit-ci-execution.test.mjs` last observed 11 PASS before the later wrapper-argument case; `node --test ... tests/issue2-ci-workflow.test.mjs` earlier 22 PASS before final runner changes. A real four-file fast smoke used the whitelist environment: 20 PASS, 0 FAIL, 0 SKIP. None of those results establish full-suite success. This actor did not execute real DB, browser, full fast, complete groups, npm ci or remote CI.

Caveat for verifier: synchronous owned/wrapper child deadlines can kill a hung fixture before its `finally` cleanup; no proof of cleanup under external timeout is claimed. Verify owned Docker lifecycle and any remaining containers; no retained project should be touched. Full suite outcomes, skipped tests, cost and CI behavior remain pending independent verification. No product, fixtures, dependencies, tests or retained data were edited by this actor. No commit/push.

## Full CI Mailpit and public-port follow-up

The complete-suite job now pre-pulls both `axllent/mailpit:v1.31.6`, required by the P5 `--pull=never` fixture, and the exact `v1.31.6@sha256:23fe39e81bde596a918000b3135c0f85dc8bb4c9ea6be274b051143f3e300387` referenced by the Mailpit owned runtime. The independent workflow test first exposed the missing pull. The first attempted GREEN had 12 PASS/1 FAIL because its assertion only recognized direct node invocation while the workflow invokes the same runner through npm; the test owner corrected the invocation assertion without weakening the image/order checks. Subsequent combined validation passed.

Added `tests/audit-public-ports-import.test.mjs` to the inventory and fast route; `npm run test:complete -- --check` exited 0 with 303 entries, 51 exclusions and 23 routes. AST permits only exact `files/public/index.ts`, `mail/public/index.ts` and `classrooms/public/index.ts` across slices, with private paths still rejected. Test-runner RED was observed for the new mail/classroom entries; `node --test tests/audit-boundaries-guard.test.mjs tests/audit-complete-suite.test.mjs` then exited 0: 14 PASS, 0 FAIL, 0 SKIP. `node scripts/check-boundaries.mjs` exited 0. The new native TypeScript regression itself remains under the core actor's verification; no full group execution or Docker cleanup is claimed here.

Source SHA256: workflow `9229f0edbb90120af0ca399a33f4d5e2f9fa9ced7335fc742c69874cf2ebf65b`; guard `963488bb9d79d2cbebacd1f9b8130654c006cd15015cd0dc195b8113505693de`; inventory `de4f94f44b1af5737595a12d5e67d57a6bb765110d0875cf8228531b532b4c8b`; routes `7480192b8827dde74cc73178993c65056d5da250199a6809836aa2a79573bf32`. No tests or product source were modified by this actor for this follow-up.

## Narrow checkout LF policy for P9 fixed hashes

Added four exact `text eol=lf` rules to the existing `.gitattributes` (+6 lines including comment and separator); the existing FreshClam rule remains. Paths: `tests/p9-journey-helpers.mjs`, `tests/p9-max-file-diagnostic-integration.test.mjs`, `tests/p9-positive-max-files.mjs`, `tests/p9-positive-max-files.test.mjs`. `git check-attr text eol` reported `text: set` and `eol: lf` for all four.

Before the test owner converted the four files, their working-tree SHA256 values were respectively `150619b0a7232a329a8b3f673ab32de1bd02307ef0afa8840beba2a9d73fdabd`, `db6e73153ffaa020917abdd09949abe777a8ea791dfbb657b5b71d0844944c9e`, `d1c4095c9b3c329fce17a027bd22cd7fc81429d8fd8731b235dc58432071a05a`, `3792a210b24c72b6338c64ac7396050c84cf1a9cefb0eac844b169e4b7a7745e`, with 381/266/20/67 CRLFs. After `/root/remediation_tests` converted only those files, independent byte comparison to `git show 9fddbd8:<path>` passed for all, zero CRLFs; the baseline/current SHA256 values are respectively `dc34cbcb6a786a3225ffc15301c56ddf3b486424b67601b3a9f23f11213d7093`, `e8d4aae3a9916b9b8294af09186672b3b78f85d2838d582ff733fb56f3a0539e`, `7801cf4ca5d6b39b6812392e1710f19663fd4da6b49467cbb19ba02d4e8b4fee`, `c20f3d91eaf171772ad814cf77b3a922316ab81fb1b7f291be0a8094a17c6243`. This actor did not edit the four files or their test assertions. Full FAST rerun remains coordinator-owned; no retained files or Docker were accessed by this follow-up.

## Windows Compose environment follow-up

After independent RED for the Windows environment contract, changed only `scripts/run-complete-suite.mjs`: `cleanEnvironment(source = process.env)` is exported, retains the existing allowlist and adds `ProgramFiles`, consistently reads the supplied source and forces telemetry disabled. It does not include Docker host/context/config, APPDATA, provider credentials or arbitrary keys. Focal `node --test --test-name-pattern='complete suite Windows environment' tests/audit-complete-suite.test.mjs`: 1 PASS, 0 FAIL. Control suite `node --test tests/audit-complete-suite.test.mjs tests/audit-ci-runner.test.mjs tests/audit-ci-execution.test.mjs tests/audit-boundaries-guard.test.mjs tests/issue2-ci-workflow.test.mjs`: 33 PASS, 0 FAIL, 0 SKIP. Script SHA256 `c12f11d4376755322bc0ab1e6f2c084a668f08e30d41ddf3478c28f8899f1144`. This actor ran no database or Docker runtime. Independent runtime and review remain coordinator/verifier work.

## Canonical cursor regression selection

Added `tests/audit-cursor-canonical.test.mjs` once, alphabetically, to both the explicit inventory and fast route. It remains a real executable test and was not excluded. `npm run test:complete -- --check` exited 0: 304 entries, 51 explicit exclusions, 23 routes. `node --test tests/audit-complete-suite.test.mjs` exited 0: 12 PASS, 0 FAIL, 0 SKIP. The test owner independently observed the new cursor behavior RED (3 PASS/12 FAIL); product fix and functional GREEN are owned by the core/wall actor. This selection change did not edit tests, product, other routes, budgets or workflow, and did not run a DB.
