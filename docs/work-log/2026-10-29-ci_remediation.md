# CI remediation — in progress

- Agent / role: ci_remediation / slice worker
- Session or task ID: /root/ci_remediation
- Date: 2026-10-29
- Branch / worktree: codex/audit-remediation, isolated remediation worktree
- Starting commit: 9fddbd8
- Phase and task: [audit remediation, contract D](../../odd/tasks/audit-remediation.md)
- Status: in_progress

## Request and scope
Implement explicit representative CI suites, executable architectural boundaries and independent secret gate after RED. Do not edit tests, product code, shared dependency junctions or secrets.

## Work performed
Added explicit pure, transport and owned-integration test inventories and a CLI with missing/duplicate checks, fail-fast, deadlines and test counts. Added ESLint plugin gate and a TypeScript AST guard covering pure domain, frontend/backend imports, cross-module public APIs and classroom service inheritance. Existing cross-module edges are listed individually in `scripts/boundary-legacy-edges.mjs`; their reason is existing wiring pending public API migration. No inheritance exemption. Added separate CI integration job and independent version-pinned Gitleaks scan; preserved existing grading AI gate. Package lock and isolated lint toolchain updated without mutating shared node_modules.

## Verification
- Context7 resolution: `Monthly quota exceeded. Create a free API key at https://context7.com/dashboard for more requests.` Consulted installed official README for eslint-plugin-boundaries 5.3.1.
- `node --test tests/issue2-ci-workflow.test.mjs tests/audit-ci-runner.test.mjs tests/audit-ci-execution.test.mjs tests/audit-boundaries-guard.test.mjs`: 19 PASS, 0 FAIL, 0 SKIP. Runner test deliberately executes a failing child and a timeout and verifies fail-fast.
- `node scripts/run-ci-suite.mjs --suite transport`: 35 PASS, 0 FAIL, 2 SKIP.
- Isolated ESLint command over source passed; stdin domain-to-backend and UI-to-backend canaries each returned exit 1 with `boundaries/element-types` as expected. AST fixture canaries passed.
- First `pure` selection failed because `p33-mailbox` needs a separate build artifact; removed from selection. Second attempt included wrongly classified DB-driven P7/P8 tests; `p7-practical` failed the attachment-free receipt subtest and skipped its dependent subtest. Those DB tests are no longer in pure; existing workflow still runs P7/P8. Third attempt reached 57 PASS before `audit-architecture` failed on the in-progress service inheritance removal (F03); no inheritance baseline or retry before correction.
- Initial lock-only audit had 8 vulnerabilities versus 5 baseline; plugin transitively introduced handlebars 4.7.8. An exact 4.7.10 override restored candidate audit to baseline: 2 moderate, 3 high, 0 critical. Baseline advisories: body-parser 1243074, multer 1243083 (also platform-express), fast-uri 1243098/1243101/1243104/1243107, nodemailer 1243091/1243092/1243093. Coordinator authorized compatible dependency updates after package registry metadata and peer checks: platform-express 12.3.2 (peer common/core ^12.0.0, retained 12.1.3), express 5.3.0, multer 2.5.0, body-parser 2.4.0 override, fast-uri 3.1.9 override and nodemailer 10.3.1. `npm install --package-lock-only --ignore-scripts --no-audit` followed by `npm audit --package-lock-only --json` reported 0 vulnerabilities. Node 24 satisfies declared engines. Runtime regression against these updated dependencies remains pending isolated install.
- Owned integration suite and full standard lint chain pending; CI and secret job not executed here. The original shared dependencies/generated junctions were not installed into.

## Commits and outcomes
No commit.

## Handoff
After F03 removes inheritance, run full AST gate and pure suite once; investigate P7 practical failed subtest before another attempt. Coordinator will verify the full locked installation in isolation and owned integration/secret gates. Do not claim GREEN until all applicable checks pass.

## Toolchain support follow-up

The isolated installation warned that ESLint 9.39.1 was unsupported. Registry version and peer metadata showed ESLint 10.13.0 supports Node `^20.19.0 || ^22.13.0 || >=24`, boundaries 5.3.1 accepts ESLint `>=6.0.0`, and parser 8.72.1 accepts ESLint `^8.57.0 || ^9.0.0 || ^10.0.0` and TypeScript `>=4.8.4 <6.1.0` (project 5.9.3). ESLint 10.13.0 and parser 8.72.1 were not marked deprecated in registry metadata. Updated only those two devDependencies and their lock, plus the isolated lint toolchain; no shared junction installation.

ESLint 10 over domain, API and UI exited 0; a domain-to-backend stdin canary exited 1 with `boundaries/element-types`. `node --test tests/issue2-ci-workflow.test.mjs tests/audit-ci-runner.test.mjs tests/audit-ci-execution.test.mjs tests/audit-boundaries-guard.test.mjs`: 19 PASS, 0 FAIL, 0 SKIP. `npm audit --package-lock-only --json`: 0 vulnerabilities. Coordinator must recreate the full isolated installation from this newer lock and run pending runtime/AST/pure/integration verification; previous runtime checks against an older lock do not establish results for the updated lock.

## Frontend boundary coverage follow-up

Expanded both the ESLint config and the actual `lint:boundaries` package script, plus AST scanning, to `apps/agenda-ui`, `apps/shared-ui`, `apps/p5-preview` and `apps/web/pages`. Added `audit-shared-contracts` and `audit-notifications-contract` to pure, and `audit-notifications-database` to owned integration. No new legacy exceptions.

ESLint over all configured source roots and `node scripts/check-boundaries.mjs` each exited 0. Manual stdin/in-memory canaries for each of the four added roots rejected UI-to-backend imports in both ESLint and AST (8 observed rejections). `runSuite(['tests/audit-ci-runner.test.mjs'])` reported 1 passed, 0 failed, 0 skipped. `node --experimental-transform-types --disable-warning=ExperimentalWarning --test tests/audit-shared-contracts.test.mjs tests/audit-notifications-contract.test.mjs` reported 7 PASS, 0 FAIL, 0 SKIP. The coordinator must sync `eslint.config.mjs`, `package.json`, `scripts/check-boundaries.mjs` and `scripts/ci-suites.mjs` into the final isolated verification mirror; this follow-up did not alter the lock. Notification DB integration remains pending coordinator execution.

## JD-CI1 remediation — in progress

- Scope: root-class CI fixture drift; remove stale fixed migration inventory without changing product, tests or migration history. RED was independently observed by coordinator and both judges (14 expected versus 19 present); the tracked migration directories and Prisma deploy/diff/applied-history are the source of truth.
- Initial inspection: `scripts/p4-integration-runtime.mjs` rejected the current inventory before Prisma ran; deploy, schema drift and exact applied migration comparison already exist. First unfinished action: implement nonempty valid migration directory inventory and retain existing checks; test runner owns obsolete assertions.

JD-CI1 patch: `scripts/p4-integration-runtime.mjs` replaces four fixed-count/name guard lines with validation of nonempty sorted migration directories, valid names and present migration SQL; `migrate deploy`, `migrate diff --exit-code` and exact ordered `_prisma_migrations` comparison remain unchanged. Diff is +5/-4 lines (net +1). `node --check scripts/p4-integration-runtime.mjs` passed; an independent directory inventory check observed 19 valid migration directories. No tests were edited by this actor. Ephemeral DB happy path, drift and missing-applied negative proof remain pending coordinator/test-runner; no success or cleanup is claimed for them. SOURCESTABLE: source file patch is complete; no commit/push. Skills applied: `C:/Users/alejo/.codex/skills/judgment-day/SKILL.md`, `C:/Users/alejo/.codex/skills/systemic-issue-triage/SKILL.md`, `C:/Users/alejo/.codex/skills/clean-architecture/SKILL.md`.

## Final CI selection delta

Added `tests/audit-activity-ai-lock.test.mjs`, `tests/audit-lock-concurrency.test.mjs` and `tests/audit-wall-http-database.test.mjs` to the explicit `integration-owned` suite. Inspected their fixture usage: owned ephemeral DB helpers and a stub activity AI provider, no real provider invocation. `node scripts/run-ci-suite.mjs --list` exited 0 (pure 18, transport 10, integration-owned 12 files). An injected spawn validation confirmed all 12 paths exist and are unique, each added path occurs once, missing and duplicate inputs reject, and runner totals reflect 12 synthetic successes; no DB tests were executed by this validation. SOURCESTABLE: selection delta complete, full real verification and scoped re-judgment belong to coordinator. No tests, product, dependencies, workflows, or other gates changed by this follow-up.
